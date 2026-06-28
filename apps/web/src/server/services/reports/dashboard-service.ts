import "server-only";

import { and, desc, eq, getDb, gte, inArray, schema } from "@be-rich/database";
import { subDays } from "date-fns";
import Decimal from "decimal.js";
import { calculateNetWorth, calculateReportTotals } from "@/server/domain/financial-calculator";
import { money } from "@/server/domain/money";
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
      netWorthBreakdown: [],
      futureInstallments: {
        total: "0.00",
        items: [],
      },
      goals: [],
      recent: [],
      totals: calculateReportTotals([]),
      netWorth: "0.00",
      netWorthComplete: true,
    };

  await consolidateTechnicalCreditCardAccounts(workspaceIds);
  await repairWorkspaceTransactionSemantics(workspaceIds);

  const [transactions, accounts, goals, openBills, installmentRows] = await Promise.all([
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
    getDb()
      .select({
        id: schema.transactions.id,
        accountId: schema.transactions.accountId,
        accountName: schema.financialAccounts.name,
        billId: schema.transactions.billId,
        billReferenceMonth: schema.creditCardBills.referenceMonth,
        billPeriodEnd: schema.creditCardBills.periodEnd,
        occurredAt: schema.transactions.occurredAt,
        description: schema.transactions.description,
        normalizedDescription: schema.transactions.normalizedDescription,
        amountInBase: schema.transactions.amountInBase,
        installmentNumber: schema.transactions.installmentNumber,
        totalInstallments: schema.transactions.totalInstallments,
      })
      .from(schema.transactions)
      .innerJoin(
        schema.financialAccounts,
        eq(schema.transactions.accountId, schema.financialAccounts.id),
      )
      .innerJoin(schema.creditCardBills, eq(schema.transactions.billId, schema.creditCardBills.id))
      .where(
        and(
          inArray(schema.transactions.workspaceId, workspaceIds),
          eq(schema.transactions.nature, "CONSUMPTION"),
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
  const netWorthBreakdown = [
    ...visibleAccounts
      .filter((account) => account.type !== "DEBT" && account.type !== "INVESTMENT")
      .map((account) => ({
        id: account.id,
        kind: "ASSET" as const,
        group: "Caixa e contas",
        label: account.name,
        detail: `${account.type} · ${account.currency}`,
        amount: latestBalances.get(account.id)?.balanceInBase ?? "0",
      })),
    ...visibleAccounts
      .filter((account) => account.type === "INVESTMENT")
      .map((account) => ({
        id: account.id,
        kind: "ASSET" as const,
        group: "Investimentos",
        label: account.name,
        detail: `${account.type} · ${account.currency}`,
        amount: latestBalances.get(account.id)?.balanceInBase ?? "0",
      })),
    ...openBills.map((bill, index) => ({
      id: `bill-${index}-${bill.total}`,
      kind: "LIABILITY" as const,
      group: "Faturas abertas",
      label: "Fatura de cartão em aberto",
      detail: "Passivo considerado no patrimônio líquido",
      amount: bill.total,
    })),
    ...visibleAccounts
      .filter((account) => account.type === "DEBT")
      .map((account) => ({
        id: account.id,
        kind: "LIABILITY" as const,
        group: "Dívidas",
        label: account.name,
        detail: `${account.type} · ${account.currency}`,
        amount: latestBalances.get(account.id)?.balanceInBase ?? "0",
      })),
  ];
  const futureInstallments = buildFutureInstallments(installmentRows);

  return {
    workspaceIds,
    accounts: visibleAccounts,
    accountBalances: Object.fromEntries(latestBalances),
    netWorthBreakdown,
    futureInstallments,
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

function buildFutureInstallments(
  rows: Array<{
    id: string;
    accountId: string;
    accountName: string;
    billId: string | null;
    billReferenceMonth: string | null;
    billPeriodEnd: string | null;
    occurredAt: Date;
    description: string;
    normalizedDescription: string;
    amountInBase: string;
    installmentNumber: number | null;
    totalInstallments: number | null;
  }>,
) {
  const latestBillByAccount = new Map<string, { billId: string; sortKey: string }>();
  for (const row of rows) {
    if (!row.billId) continue;
    const sortKey = row.billPeriodEnd ?? row.billReferenceMonth ?? "";
    const current = latestBillByAccount.get(row.accountId);
    if (!current || sortKey.localeCompare(current.sortKey) > 0) {
      latestBillByAccount.set(row.accountId, { billId: row.billId, sortKey });
    }
  }

  const items = rows
    .filter((row) => {
      const latestBill = latestBillByAccount.get(row.accountId);
      return (
        latestBill?.billId === row.billId &&
        row.installmentNumber &&
        row.totalInstallments &&
        row.totalInstallments > row.installmentNumber
      );
    })
    .map((row) => {
      const remainingInstallments = (row.totalInstallments ?? 0) - (row.installmentNumber ?? 0);
      const projectedAmount = new Decimal(row.amountInBase).mul(remainingInstallments);
      return {
        id: row.id,
        accountName: row.accountName,
        billReference: row.billReferenceMonth ?? row.billPeriodEnd ?? "Fatura importada",
        description: row.description,
        occurredAt: row.occurredAt.toISOString(),
        installmentNumber: row.installmentNumber ?? 0,
        totalInstallments: row.totalInstallments ?? 0,
        remainingInstallments,
        installmentAmount: row.amountInBase,
        projectedAmount: money(projectedAmount),
      };
    })
    .sort((left, right) => right.projectedAmount.localeCompare(left.projectedAmount));

  const total = items.reduce((sum, item) => sum.plus(item.projectedAmount), new Decimal(0));

  return {
    total: money(total),
    items,
  };
}
