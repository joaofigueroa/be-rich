"use server";

import { eq, getDb, schema } from "@be-rich/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { categoryTypeForNature, TRANSACTION_NATURES } from "@/server/domain/transaction-edit";
import { requireUser } from "@/server/services/auth/session-service";
import { requireWorkspaceMembership } from "@/server/services/workspaces/workspace-service";

const UpdateTransactionInputSchema = z.object({
  transactionId: z.uuidv7(),
  nature: z.enum(TRANSACTION_NATURES),
  categoryId: z.uuidv7().nullable(),
  notes: z.string().trim().max(500).nullable(),
});

export async function updateTransactionAction(rawInput: unknown) {
  const user = await requireUser();
  const input = UpdateTransactionInputSchema.parse(rawInput);
  const transaction = await getDb().query.transactions.findFirst({
    where: eq(schema.transactions.id, input.transactionId),
  });
  if (!transaction) throw new Error("Transação não encontrada");
  await requireWorkspaceMembership({ workspaceId: transaction.workspaceId, userId: user.id });

  const categoryType = categoryTypeForNature(input.nature);
  const requestedCategoryId = input.categoryId;
  if (requestedCategoryId) {
    const category = await getDb().query.categories.findFirst({
      where: (entry, { and, eq }) =>
        and(
          eq(entry.id, requestedCategoryId),
          eq(entry.workspaceId, transaction.workspaceId),
          eq(entry.active, true),
        ),
    });
    if (!category?.parentId || !categoryType || category.type !== categoryType) {
      throw new Error("A categoria não é compatível com o tipo da transação");
    }
  }

  const categoryId = categoryType ? requestedCategoryId : null;
  await getDb()
    .update(schema.transactions)
    .set({
      nature: input.nature,
      categoryId,
      notes: input.notes || null,
      classificationSource: categoryId ? "MANUAL" : "NONE",
      classificationConfidence: categoryId ? "1.0000" : null,
      reviewStatus: categoryId ? "CONFIRMED" : "PENDING",
      updatedAt: new Date(),
    })
    .where(eq(schema.transactions.id, transaction.id));
  await getDb()
    .insert(schema.auditEvents)
    .values({
      workspaceId: transaction.workspaceId,
      actorId: user.id,
      action: "transaction.updated",
      entityType: "transaction",
      entityId: transaction.id,
      metadata: {
        previousNature: transaction.nature,
        nature: input.nature,
        previousCategoryId: transaction.categoryId,
        categoryId,
      },
    });

  revalidatePath("/transacoes");
  revalidatePath("/relatorios");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
