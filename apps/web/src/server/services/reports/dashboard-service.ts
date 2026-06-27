import "server-only";

import { desc, eq, getDb, inArray, schema } from "@be-rich/database";
import { subDays } from "date-fns";
import { calculateNetWorth, calculateReportTotals } from "@/server/domain/financial-calculator";
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

  const [transactions, accounts, goals] = await Promise.all([
    getDb().query.transactions.findMany({
      where: (transaction, { and, gte, inArray }) =>
        and(
          inArray(transaction.workspaceId, workspaceIds),
          gte(transaction.occurredAt, subDays(new Date(), 30)),
        ),
      orderBy: (transaction, { desc }) => [desc(transaction.occurredAt)],
      limit: 100,
    }),
    getDb().query.financialAccounts.findMany({
      where: (account, { and, eq, inArray }) =>
        and(inArray(account.workspaceId, workspaceIds), eq(account.active, true)),
    }),
    getDb().query.goals.findMany({
      where: (goal, { and, eq, inArray }) =>
        and(inArray(goal.workspaceId, workspaceIds), eq(goal.status, "ACTIVE")),
      limit: 4,
    }),
  ]);
  const accountIds = new Set(accounts.map((account) => account.id));
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
  const cash = accounts
    .filter(
      (account) =>
        account.type !== "CREDIT_CARD" && account.type !== "DEBT" && account.type !== "INVESTMENT",
    )
    .map((account) => latestBalances.get(account.id)?.balanceInBase ?? "0");
  const investments = accounts
    .filter((account) => account.type === "INVESTMENT")
    .map((account) => latestBalances.get(account.id)?.balanceInBase ?? "0");
  const debts = accounts
    .filter((account) => account.type === "DEBT")
    .map((account) => latestBalances.get(account.id)?.balanceInBase ?? "0");
  const bills = accounts
    .filter((account) => account.type === "CREDIT_CARD")
    .map((account) => latestBalances.get(account.id)?.balanceInBase ?? "0");

  return {
    workspaceIds,
    accounts,
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
    netWorthComplete: accounts.every((account) => latestBalances.has(account.id)),
  };
}

export async function getTransactionsForUser(userId: string) {
  const memberships = await getUserWorkspaces(userId);
  const workspaceIds = memberships.map(({ workspace }) => workspace.id);
  if (!workspaceIds.length) return [];

  return getDb()
    .select({
      id: schema.transactions.id,
      description: schema.transactions.description,
      direction: schema.transactions.direction,
      nature: schema.transactions.nature,
      amountInBase: schema.transactions.amountInBase,
      occurredAt: schema.transactions.occurredAt,
      category: schema.categories.name,
      classificationSource: schema.transactions.classificationSource,
      reviewStatus: schema.transactions.reviewStatus,
    })
    .from(schema.transactions)
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .where(inArray(schema.transactions.workspaceId, workspaceIds))
    .orderBy(desc(schema.transactions.occurredAt))
    .limit(500);
}
