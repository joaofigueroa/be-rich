import "server-only";

import { and, desc, eq, getDb, gte, inArray, schema } from "@be-rich/database";
import { subDays } from "date-fns";
import { calculateNetWorth, calculateReportTotals } from "@/server/domain/financial-calculator";
import { consolidateTechnicalCreditCardAccounts } from "@/server/services/accounts/account-consolidation-service";
import { repairWorkspaceTransactionSemantics } from "@/server/services/transactions/transaction-semantics-service";
import { getUserWorkspaces } from "@/server/services/workspaces/workspace-service";

export async function getDashboardSnapshot(userId: string) {
  const memberships = await getUserWorkspaces(userId);
  const workspaceIds = memberships.map(({ workspace }) => workspace.id);
  if (!workspaceIds.length)
    return {
      workspaceIds,
      accounts: [],
      accountBalances: {},
      goals: [],
      recent: [],
      totals: calculateReportTotals([]),
      netWorth: "0.00",
      netWorthComplete: true,
    };

  await consolidateTechnicalCreditCardAccounts(workspaceIds);
  await repairWorkspaceTransactionSemantics(workspaceIds);

  const [transactions, accounts, goals, openBills] = await Promise.all([
    getDb()
      .select({
        id: schema.transactions.id,
        amountInBase: schema.transactions.amountInBase,
        direction: schema.transactions.direction,
        billId: schema.transactions.billId,
        nature: schema.transactions.nature,
        accountType: schema.financialAccounts.type,
        occurredAt: schema.transactions.occurredAt,
        description: schema.transactions.description,
      })
      .from(schema.transactions)
      .innerJoin(
        schema.financialAccounts,
        eq(schema.transactions.accountId, schema.financialAccounts.id),
      )
      .where(
        and(
          inArray(schema.transactions.workspaceId, workspaceIds),
          gte(schema.transactions.occurredAt, subDays(new Date(), 30)),
        ),
      )
      .orderBy(desc(schema.transactions.occurredAt))
      .limit(100),
    getDb().query.financialAccounts.findMany({
      where: (account, { and, eq, inArray }) =>
        and(inArray(account.workspaceId, workspaceIds), eq(account.active, true)),
    }),
    getDb().query.goals.findMany({
      where: (goal, { and, eq, inArray }) =>
        and(inArray(goal.workspaceId, workspaceIds), eq(goal.status, "ACTIVE")),
      limit: 4,
    }),
    getDb()
      .select({
        total: schema.creditCardBills.total,
      })
      .from(schema.creditCardBills)
      .innerJoin(
        schema.financialAccounts,
        eq(schema.creditCardBills.accountId, schema.financialAccounts.id),
      )
      .where(
        and(
          inArray(schema.financialAccounts.workspaceId, workspaceIds),
          eq(schema.creditCardBills.status, "OPEN"),
        ),
      ),
  ]);
  const visibleAccounts = accounts.filter((account) => account.type !== "CREDIT_CARD");
  const accountIds = new Set(visibleAccounts.map((account) => account.id));
  const balances = accountIds.size
    ? await getDb()
        .select()
        .from(schema.accountBalanceSnapshots)
        .where(inArray(schema.accountBalanceSnapshots.accountId, [...accountIds]))
        .orderBy(desc(schema.accountBalanceSnapshots.asOf))
    : [];
  const latestBalances = new Map<string, { balanceInBase: string; asOf: Date }>();
  for (const snapshot of balances)
    if (accountIds.has(snapshot.accountId) && !latestBalances.has(snapshot.accountId))
      latestBalances.set(snapshot.accountId, {
        balanceInBase: snapshot.balanceInBase,
        asOf: snapshot.asOf,
      });
  const cash = visibleAccounts
    .filter((account) => account.type !== "DEBT" && account.type !== "INVESTMENT")
    .map((account) => latestBalances.get(account.id)?.balanceInBase ?? "0");
  const investments = visibleAccounts
    .filter((account) => account.type === "INVESTMENT")
    .map((account) => latestBalances.get(account.id)?.balanceInBase ?? "0");
  const debts = visibleAccounts
    .filter((account) => account.type === "DEBT")
    .map((account) => latestBalances.get(account.id)?.balanceInBase ?? "0");
  const bills = openBills.map((bill) => bill.total);

  return {
    workspaceIds,
    accounts: visibleAccounts,
    accountBalances: Object.fromEntries(latestBalances),
    goals,
    recent: transactions.slice(0, 8),
    totals: calculateReportTotals(transactions),
    netWorth: calculateNetWorth({
      cashAndAccounts: cash,
      investments,
      openCardBills: bills,
      debts,
    }),
    netWorthComplete: visibleAccounts.every((account) => latestBalances.has(account.id)),
  };
}
