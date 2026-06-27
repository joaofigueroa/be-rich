import "server-only";

import { and, eq, getDb, gte, inArray, lte, ne, schema, sql } from "@be-rich/database";
import { z } from "zod";
import { calculateReportTotals } from "@/server/domain/financial-calculator";
import { buildReportChartData } from "@/server/domain/report-charts";
import { getUserWorkspaces } from "@/server/services/workspaces/workspace-service";

const ReportInputSchema = z.object({
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
  dateBasis: z.enum(["OCCURRED", "POSTED"]).default("OCCURRED"),
  accountScope: z.enum(["ALL", "ACCOUNT", "CREDIT_CARD"]).default("ALL"),
});

export async function getReportData(userId: string, rawInput: unknown) {
  const requestedInput = ReportInputSchema.parse(rawInput);
  const memberships = await getUserWorkspaces(userId);
  const workspaceIds = memberships.map(({ workspace }) => workspace.id);
  const dateColumn =
    requestedInput.dateBasis === "OCCURRED"
      ? schema.transactions.occurredAt
      : schema.transactions.postedAt;
  const today = new Date().toISOString().slice(0, 10);
  const fallbackStart = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  if (!workspaceIds.length) {
    const input = {
      startDate: requestedInput.startDate ?? fallbackStart,
      endDate: requestedInput.endDate ?? today,
      dateBasis: requestedInput.dateBasis,
      accountScope: requestedInput.accountScope,
    };
    return {
      input,
      bounds: { startDate: input.startDate, endDate: input.endDate },
      rows: [],
      totals: calculateReportTotals([]),
      charts: buildReportChartData([]),
    };
  }

  const accountScopeCondition =
    requestedInput.accountScope === "CREDIT_CARD"
      ? eq(schema.financialAccounts.type, "CREDIT_CARD")
      : requestedInput.accountScope === "ACCOUNT"
        ? ne(schema.financialAccounts.type, "CREDIT_CARD")
        : undefined;
  const workspaceCondition = accountScopeCondition
    ? and(inArray(schema.transactions.workspaceId, workspaceIds), accountScopeCondition)
    : inArray(schema.transactions.workspaceId, workspaceIds);

  const [availablePeriod] = await getDb()
    .select({
      startDate: sql<string | null>`to_char(min(${dateColumn}), 'YYYY-MM-DD')`,
      endDate: sql<string | null>`to_char(max(${dateColumn}), 'YYYY-MM-DD')`,
    })
    .from(schema.transactions)
    .innerJoin(
      schema.financialAccounts,
      eq(schema.transactions.accountId, schema.financialAccounts.id),
    )
    .where(workspaceCondition);

  const input = {
    startDate: requestedInput.startDate ?? availablePeriod?.startDate ?? fallbackStart,
    endDate: requestedInput.endDate ?? availablePeriod?.endDate ?? today,
    dateBasis: requestedInput.dateBasis,
    accountScope: requestedInput.accountScope,
  };
  if (input.startDate > input.endDate) {
    throw new Error("A data inicial deve ser anterior ou igual à data final");
  }

  const rows = await getDb()
    .select({
      id: schema.transactions.id,
      occurredAt: schema.transactions.occurredAt,
      postedAt: schema.transactions.postedAt,
      description: schema.transactions.description,
      direction: schema.transactions.direction,
      nature: schema.transactions.nature,
      amount: schema.transactions.amount,
      currency: schema.transactions.currency,
      amountInBase: schema.transactions.amountInBase,
      category: schema.categories.name,
      account: schema.financialAccounts.name,
      accountType: schema.financialAccounts.type,
      institution: schema.institutions.name,
    })
    .from(schema.transactions)
    .innerJoin(
      schema.financialAccounts,
      eq(schema.transactions.accountId, schema.financialAccounts.id),
    )
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .leftJoin(
      schema.institutions,
      eq(schema.financialAccounts.institutionId, schema.institutions.id),
    )
    .where(
      and(
        workspaceCondition,
        gte(dateColumn, new Date(`${input.startDate}T00:00:00.000Z`)),
        lte(dateColumn, new Date(`${input.endDate}T23:59:59.999Z`)),
      ),
    )
    .orderBy(dateColumn);
  return {
    input,
    bounds: {
      startDate: availablePeriod?.startDate ?? input.startDate,
      endDate: availablePeriod?.endDate ?? input.endDate,
    },
    rows,
    totals: calculateReportTotals(rows),
    charts: buildReportChartData(rows, input.dateBasis),
  };
}
