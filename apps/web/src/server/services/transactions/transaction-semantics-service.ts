import "server-only";

import { and, eq, getDb, inArray, isNull, or, schema } from "@be-rich/database";
import { categoryTypeForNature } from "@/server/domain/transaction-edit";
import { reconcileCreditCardBills } from "@/server/services/billing/billing-service";
import { inferNature } from "@/server/services/imports/parser-utils";

export async function repairWorkspaceTransactionSemantics(workspaceIds: string[]) {
  if (!workspaceIds.length) return { updated: 0, reconciled: 0 };

  const [transactions, investmentCategories] = await Promise.all([
    getDb()
      .select({
        id: schema.transactions.id,
        workspaceId: schema.transactions.workspaceId,
        description: schema.transactions.description,
        direction: schema.transactions.direction,
        nature: schema.transactions.nature,
        categoryId: schema.transactions.categoryId,
        reviewStatus: schema.transactions.reviewStatus,
        classificationSource: schema.transactions.classificationSource,
        billId: schema.transactions.billId,
      })
      .from(schema.transactions)
      .where(
        and(
          inArray(schema.transactions.workspaceId, workspaceIds),
          or(
            eq(schema.transactions.reviewStatus, "PENDING"),
            and(
              eq(schema.transactions.nature, "CARD_PAYMENT"),
              isNull(schema.transactions.settlesBillId),
            ),
          ),
        ),
      ),
    getDb().query.categories.findMany({
      where: (category, { and, eq, inArray }) =>
        and(
          inArray(category.workspaceId, workspaceIds),
          eq(category.active, true),
          eq(category.systemKey, "expense.financial.0"),
        ),
    }),
  ]);

  const investmentCategoryByWorkspace = new Map(
    investmentCategories.map((category) => [category.workspaceId, category.id]),
  );
  let updated = 0;

  for (const transaction of transactions) {
    const inferredNature = inferNature(
      transaction.description,
      transaction.direction,
      transaction.billId ? "CREDIT_CARD" : "ACCOUNT",
    );
    const patch: Partial<typeof schema.transactions.$inferInsert> = {};
    const requiresCategory = categoryTypeForNature(inferredNature) !== null;

    if (transaction.nature !== inferredNature) {
      patch.nature = inferredNature;
    }

    if (!requiresCategory) {
      if (transaction.categoryId !== null) patch.categoryId = null;
      if (transaction.classificationSource !== "NONE") patch.classificationSource = "NONE";
      if (transaction.reviewStatus !== "NOT_REQUIRED") patch.reviewStatus = "NOT_REQUIRED";
      patch.classificationConfidence = null;
    } else if (
      inferredNature === "INVESTMENT_CONTRIBUTION" ||
      inferredNature === "INVESTMENT_REDEMPTION"
    ) {
      const investmentCategoryId = investmentCategoryByWorkspace.get(transaction.workspaceId);
      if (investmentCategoryId && transaction.categoryId !== investmentCategoryId) {
        patch.categoryId = investmentCategoryId;
        patch.classificationSource = "RULE";
        patch.classificationConfidence = "1.0000";
        patch.reviewStatus = "NOT_REQUIRED";
      }
    }

    if (!Object.keys(patch).length) continue;
    await getDb()
      .update(schema.transactions)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schema.transactions.id, transaction.id));
    updated += 1;
  }

  let reconciled = 0;
  for (const workspaceId of workspaceIds) {
    const result = await reconcileCreditCardBills(workspaceId);
    reconciled += result.linked;
  }

  return { updated, reconciled };
}
