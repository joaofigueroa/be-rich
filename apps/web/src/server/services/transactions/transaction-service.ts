import "server-only";

import {
  and,
  asc,
  count,
  desc,
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
} from "@be-rich/database";
import { z } from "zod";
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

const TransactionPageInputSchema = z.object({
  userId: z.uuidv7(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  view: z.enum(["ALL", "ACCOUNT", "CREDIT_CARD"]).default("ALL"),
  q: optionalSearch,
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
  accountId: optionalUuid,
  institutionId: optionalUuid,
  categoryId: optionalUuid,
  nature: z
    .enum([
      "INCOME",
      "CONSUMPTION",
      "OWN_TRANSFER",
      "CARD_PAYMENT",
      "INVESTMENT_CONTRIBUTION",
      "INVESTMENT_REDEMPTION",
      "DEBT_PRINCIPAL",
      "INTEREST_FEE",
      "REFUND",
      "ADJUSTMENT",
    ])
    .optional(),
  reviewStatus: z.enum(["NOT_REQUIRED", "PENDING", "CONFIRMED"]).optional(),
});

export async function getTransactionsPageForUser(
  rawInput: z.input<typeof TransactionPageInputSchema>,
) {
  const input = TransactionPageInputSchema.parse(rawInput);
  const memberships = await getUserWorkspaces(input.userId);
  const workspaceIds = memberships.map(({ workspace }) => workspace.id);
  if (!workspaceIds.length) {
    return {
      transactions: [],
      categories: [],
      bills: [],
      accounts: [],
      institutions: [],
      filters: {
        view: input.view,
        q: input.q ?? "",
        startDate: input.startDate ?? "",
        endDate: input.endDate ?? "",
        accountId: input.accountId ?? "",
        institutionId: input.institutionId ?? "",
        categoryId: input.categoryId ?? "",
        nature: input.nature ?? "",
        reviewStatus: input.reviewStatus ?? "",
      },
      page: 1,
      pageSize: input.pageSize,
      total: 0,
      totalPages: 1,
    };
  }

  const viewCondition =
    input.view === "CREDIT_CARD"
      ? isNotNull(schema.transactions.billId)
      : input.view === "ACCOUNT"
        ? isNull(schema.transactions.billId)
        : undefined;
  const filters = [
    inArray(schema.transactions.workspaceId, workspaceIds),
    viewCondition,
    input.q
      ? or(
          ilike(schema.transactions.description, `%${input.q}%`),
          ilike(schema.transactions.normalizedDescription, `%${input.q}%`),
          ilike(schema.transactions.merchant, `%${input.q}%`),
          ilike(schema.transactions.counterparty, `%${input.q}%`),
        )
      : undefined,
    input.startDate
      ? gte(schema.transactions.occurredAt, new Date(`${input.startDate}T00:00:00.000Z`))
      : undefined,
    input.endDate
      ? lte(schema.transactions.occurredAt, new Date(`${input.endDate}T23:59:59.999Z`))
      : undefined,
    input.accountId ? eq(schema.transactions.accountId, input.accountId) : undefined,
    input.institutionId
      ? eq(schema.financialAccounts.institutionId, input.institutionId)
      : undefined,
    input.categoryId ? eq(schema.transactions.categoryId, input.categoryId) : undefined,
    input.nature ? eq(schema.transactions.nature, input.nature) : undefined,
    input.reviewStatus ? eq(schema.transactions.reviewStatus, input.reviewStatus) : undefined,
  ].filter(Boolean);
  const transactionCondition = and(...filters);

  const [{ total }, allCategories, bills, accounts, institutions] = await Promise.all([
    getDb()
      .select({ total: count() })
      .from(schema.transactions)
      .innerJoin(
        schema.financialAccounts,
        eq(schema.transactions.accountId, schema.financialAccounts.id),
      )
      .where(transactionCondition)
      .then((rows) => rows[0] ?? { total: 0 }),
    getDb().query.categories.findMany({
      where: (category, { and, eq, inArray }) =>
        and(inArray(category.workspaceId, workspaceIds), eq(category.active, true)),
      orderBy: (category) => [asc(category.sortOrder), asc(category.name)],
    }),
    getDb()
      .select({
        id: schema.creditCardBills.id,
        workspaceId: schema.financialAccounts.workspaceId,
        accountId: schema.creditCardBills.accountId,
        accountName: schema.financialAccounts.name,
        referenceMonth: schema.creditCardBills.referenceMonth,
        periodEnd: schema.creditCardBills.periodEnd,
        total: schema.creditCardBills.total,
        status: schema.creditCardBills.status,
      })
      .from(schema.creditCardBills)
      .innerJoin(
        schema.financialAccounts,
        eq(schema.creditCardBills.accountId, schema.financialAccounts.id),
      )
      .where(inArray(schema.financialAccounts.workspaceId, workspaceIds))
      .orderBy(desc(schema.creditCardBills.periodEnd)),
    getDb()
      .select({
        id: schema.financialAccounts.id,
        name: schema.financialAccounts.name,
        type: schema.financialAccounts.type,
        institutionId: schema.financialAccounts.institutionId,
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
  const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
  const page = Math.min(input.page, totalPages);
  const parentNames = new Map(allCategories.map((category) => [category.id, category.name]));
  const categories = allCategories
    .filter((category) => category.parentId)
    .map((category) => ({
      id: category.id,
      workspaceId: category.workspaceId,
      type: category.type,
      name: category.name,
      parentName: parentNames.get(category.parentId ?? "") ?? "Outras",
    }));

  const transactions = await getDb()
    .select({
      id: schema.transactions.id,
      workspaceId: schema.transactions.workspaceId,
      accountId: schema.transactions.accountId,
      account: schema.financialAccounts.name,
      accountType: schema.financialAccounts.type,
      description: schema.transactions.description,
      direction: schema.transactions.direction,
      nature: schema.transactions.nature,
      amountInBase: schema.transactions.amountInBase,
      occurredAt: schema.transactions.occurredAt,
      categoryId: schema.transactions.categoryId,
      billId: schema.transactions.billId,
      settlesBillId: schema.transactions.settlesBillId,
      category: schema.categories.name,
      classificationSource: schema.transactions.classificationSource,
      reviewStatus: schema.transactions.reviewStatus,
      notes: schema.transactions.notes,
    })
    .from(schema.transactions)
    .innerJoin(
      schema.financialAccounts,
      eq(schema.transactions.accountId, schema.financialAccounts.id),
    )
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .where(transactionCondition)
    .orderBy(desc(schema.transactions.occurredAt), desc(schema.transactions.id))
    .limit(input.pageSize)
    .offset((page - 1) * input.pageSize);

  return {
    transactions,
    categories,
    bills,
    accounts,
    institutions,
    filters: {
      view: input.view,
      q: input.q ?? "",
      startDate: input.startDate ?? "",
      endDate: input.endDate ?? "",
      accountId: input.accountId ?? "",
      institutionId: input.institutionId ?? "",
      categoryId: input.categoryId ?? "",
      nature: input.nature ?? "",
      reviewStatus: input.reviewStatus ?? "",
    },
    page,
    pageSize: input.pageSize,
    total,
    totalPages,
  };
}
