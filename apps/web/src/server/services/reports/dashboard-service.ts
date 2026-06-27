import "server-only";

import { desc, getDb, schema } from "@be-rich/database";
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
      goals: [],
      recent: [],
      totals: calculateReportTotals([]),
      netWorth: "0.00",
    };

  const [transactions, accounts, balances, goals] = await Promise.all([
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
    getDb()
      .select()
      .from(schema.accountBalanceSnapshots)
      .orderBy(desc(schema.accountBalanceSnapshots.asOf)),
    getDb().query.goals.findMany({
      where: (goal, { and, eq, inArray }) =>
        and(inArray(goal.workspaceId, workspaceIds), eq(goal.status, "ACTIVE")),
      limit: 4,
    }),
  ]);
  const accountIds = new Set(accounts.map((account) => account.id));
  const latestBalances = new Map<string, string>();
  for (const snapshot of balances)
    if (accountIds.has(snapshot.accountId) && !latestBalances.has(snapshot.accountId))
      latestBalances.set(snapshot.accountId, snapshot.balanceInBase);
  const cash = accounts
    .filter(
      (account) =>
        account.type !== "CREDIT_CARD" && account.type !== "DEBT" && account.type !== "INVESTMENT",
    )
    .map((account) => latestBalances.get(account.id) ?? "0");
  const investments = accounts
    .filter((account) => account.type === "INVESTMENT")
    .map((account) => latestBalances.get(account.id) ?? "0");
  const debts = accounts
    .filter((account) => account.type === "DEBT")
    .map((account) => latestBalances.get(account.id) ?? "0");
  const bills = accounts
    .filter((account) => account.type === "CREDIT_CARD")
    .map((account) => latestBalances.get(account.id) ?? "0");

  return {
    workspaceIds,
    accounts,
    goals,
    recent: transactions.slice(0, 8),
    totals: calculateReportTotals(transactions),
    netWorth: calculateNetWorth({
      cashAndAccounts: cash,
      investments,
      openCardBills: bills,
      debts,
    }),
  };
}
