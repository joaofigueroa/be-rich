import "server-only";

import { and, asc, count, desc, eq, getDb, inArray, ne, schema } from "@be-rich/database";
import { z } from "zod";
import { getUserWorkspaces } from "@/server/services/workspaces/workspace-service";

const TransactionPageInputSchema = z.object({
  userId: z.uuidv7(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
  view: z.enum(["ALL", "ACCOUNT", "CREDIT_CARD"]).default("ALL"),
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
      page: 1,
      pageSize: input.pageSize,
      total: 0,
      totalPages: 1,
    };
  }

  const viewCondition =
    input.view === "CREDIT_CARD"
      ? eq(schema.financialAccounts.type, "CREDIT_CARD")
      : input.view === "ACCOUNT"
        ? ne(schema.financialAccounts.type, "CREDIT_CARD")
        : undefined;
  const transactionCondition = viewCondition
    ? and(inArray(schema.transactions.workspaceId, workspaceIds), viewCondition)
    : inArray(schema.transactions.workspaceId, workspaceIds);

  const [{ total }, allCategories, bills] = await Promise.all([
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

  return { transactions, categories, bills, page, pageSize: input.pageSize, total, totalPages };
}
