import "server-only";

import {
  and,
  asc,
  eq,
  getDb,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  schema,
  sql,
} from "@be-rich/database";
import { z } from "zod";
import { calculateReportTotals } from "@/server/domain/financial-calculator";
import { buildReportChartData } from "@/server/domain/report-charts";
import { getUserWorkspaces } from "@/server/services/workspaces/workspace-service";

const optionalUuid = z
  .preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
    z.uuidv7().optional(),
  )
  .optional();
const optionalSearch = z
  .preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : undefined),
    z.string().min(2).max(120).optional(),
  )
  .optional();

const ReportInputSchema = z.object({
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
  dateBasis: z.enum(["OCCURRED", "POSTED"]).default("OCCURRED"),
  accountScope: z.enum(["ALL", "ACCOUNT", "CREDIT_CARD"]).default("ALL"),
  q: optionalSearch,
  accountId: optionalUuid,
  institutionId: optionalUuid,
  categoryId: optionalUuid,
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
      q: requestedInput.q ?? "",
      accountId: requestedInput.accountId ?? "",
      institutionId: requestedInput.institutionId ?? "",
      categoryId: requestedInput.categoryId ?? "",
    };
    return {
      input,
      bounds: { startDate: input.startDate, endDate: input.endDate },
      rows: [],
      totals: calculateReportTotals([]),
      charts: buildReportChartData([]),
      accounts: [],
      institutions: [],
      categories: [],
    };
  }

  const accountScopeCondition =
    requestedInput.accountScope === "CREDIT_CARD"
      ? isNotNull(schema.transactions.billId)
      : requestedInput.accountScope === "ACCOUNT"
        ? isNull(schema.transactions.billId)
        : undefined;
  const baseFilters = [
    inArray(schema.transactions.workspaceId, workspaceIds),
    accountScopeCondition,
    requestedInput.q
      ? or(
          ilike(schema.transactions.description, `%${requestedInput.q}%`),
          ilike(schema.transactions.normalizedDescription, `%${requestedInput.q}%`),
          ilike(schema.transactions.merchant, `%${requestedInput.q}%`),
          ilike(schema.transactions.counterparty, `%${requestedInput.q}%`),
        )
      : undefined,
    requestedInput.accountId
      ? eq(schema.transactions.accountId, requestedInput.accountId)
      : undefined,
    requestedInput.institutionId
      ? eq(schema.financialAccounts.institutionId, requestedInput.institutionId)
      : undefined,
    requestedInput.categoryId
      ? eq(schema.transactions.categoryId, requestedInput.categoryId)
      : undefined,
  ].filter(Boolean);
  const workspaceCondition = and(...baseFilters);

  const [availablePeriod, allCategories, accounts, institutions] = await Promise.all([
    getDb()
      .select({
        startDate: sql<string | null>`to_char(min(${dateColumn}), 'YYYY-MM-DD')`,
        endDate: sql<string | null>`to_char(max(${dateColumn}), 'YYYY-MM-DD')`,
      })
      .from(schema.transactions)
      .innerJoin(
        schema.financialAccounts,
        eq(schema.transactions.accountId, schema.financialAccounts.id),
      )
      .where(workspaceCondition)
      .then((rows) => rows[0] ?? { startDate: null, endDate: null }),
    getDb().query.categories.findMany({
      where: (category, { and, eq, inArray }) =>
        and(inArray(category.workspaceId, workspaceIds), eq(category.active, true)),
      orderBy: (category) => [asc(category.sortOrder), asc(category.name)],
    }),
    getDb()
      .select({
        id: schema.financialAccounts.id,
        name: schema.financialAccounts.name,
        type: schema.financialAccounts.type,
      })
      .from(schema.financialAccounts)
      .where(inArray(schema.financialAccounts.workspaceId, workspaceIds))
      .orderBy(asc(schema.financialAccounts.name)),
    getDb()
      .selectDistinct({
        id: schema.institutions.id,
        name: schema.institutions.name,
      })
      .from(schema.financialAccounts)
      .innerJoin(
        schema.institutions,
        eq(schema.financialAccounts.institutionId, schema.institutions.id),
      )
      .where(inArray(schema.financialAccounts.workspaceId, workspaceIds))
      .orderBy(asc(schema.institutions.name)),
  ]);

  const input = {
    startDate: requestedInput.startDate ?? availablePeriod?.startDate ?? fallbackStart,
    endDate: requestedInput.endDate ?? availablePeriod?.endDate ?? today,
    dateBasis: requestedInput.dateBasis,
    accountScope: requestedInput.accountScope,
    q: requestedInput.q ?? "",
    accountId: requestedInput.accountId ?? "",
    institutionId: requestedInput.institutionId ?? "",
    categoryId: requestedInput.categoryId ?? "",
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
      billId: schema.transactions.billId,
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
  const parentNames = new Map(allCategories.map((category) => [category.id, category.name]));
  const categories = allCategories
    .filter((category) => category.parentId)
    .map((category) => ({
      id: category.id,
      type: category.type,
      name: category.name,
      parentName: parentNames.get(category.parentId ?? "") ?? "Outras",
    }));

  return {
    input,
    bounds: {
      startDate: availablePeriod?.startDate ?? input.startDate,
      endDate: availablePeriod?.endDate ?? input.endDate,
    },
    rows,
    totals: calculateReportTotals(rows),
    charts: buildReportChartData(rows, input.dateBasis),
    accounts,
    institutions,
    categories,
  };
}
