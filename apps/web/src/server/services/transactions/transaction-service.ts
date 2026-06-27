import "server-only";

import { asc, count, desc, eq, getDb, inArray, schema } from "@be-rich/database";
import { z } from "zod";
import { getUserWorkspaces } from "@/server/services/workspaces/workspace-service";

const TransactionPageInputSchema = z.object({
  userId: z.uuidv7(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(20),
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
      page: 1,
      pageSize: input.pageSize,
      total: 0,
      totalPages: 1,
    };
  }

  const [{ total }, allCategories] = await Promise.all([
    getDb()
      .select({ total: count() })
      .from(schema.transactions)
      .where(inArray(schema.transactions.workspaceId, workspaceIds))
      .then((rows) => rows[0] ?? { total: 0 }),
    getDb().query.categories.findMany({
      where: (category, { and, eq, inArray }) =>
        and(inArray(category.workspaceId, workspaceIds), eq(category.active, true)),
      orderBy: (category) => [asc(category.sortOrder), asc(category.name)],
    }),
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
      description: schema.transactions.description,
      direction: schema.transactions.direction,
      nature: schema.transactions.nature,
      amountInBase: schema.transactions.amountInBase,
      occurredAt: schema.transactions.occurredAt,
      categoryId: schema.transactions.categoryId,
      category: schema.categories.name,
      classificationSource: schema.transactions.classificationSource,
      reviewStatus: schema.transactions.reviewStatus,
      notes: schema.transactions.notes,
    })
    .from(schema.transactions)
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .where(inArray(schema.transactions.workspaceId, workspaceIds))
    .orderBy(desc(schema.transactions.occurredAt), desc(schema.transactions.id))
    .limit(input.pageSize)
    .offset((page - 1) * input.pageSize);

  return { transactions, categories, page, pageSize: input.pageSize, total, totalPages };
}
