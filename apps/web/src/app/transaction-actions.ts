"use server";

import { and, eq, getDb, ne, schema } from "@be-rich/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { categoryTypeForNature, TRANSACTION_NATURES } from "@/server/domain/transaction-edit";
import { requireUser } from "@/server/services/auth/session-service";
import { requireWorkspaceMembership } from "@/server/services/workspaces/workspace-service";

const UpdateTransactionInputSchema = z.object({
  transactionId: z.uuidv7(),
  nature: z.enum(TRANSACTION_NATURES),
  categoryId: z.uuidv7().nullable(),
  settlesBillId: z.uuidv7().nullable(),
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
  const settlesBillId = input.nature === "CARD_PAYMENT" ? input.settlesBillId : null;
  if (settlesBillId) {
    const bill = await getDb()
      .select({ id: schema.creditCardBills.id, workspaceId: schema.financialAccounts.workspaceId })
      .from(schema.creditCardBills)
      .innerJoin(
        schema.financialAccounts,
        eq(schema.creditCardBills.accountId, schema.financialAccounts.id),
      )
      .where(eq(schema.creditCardBills.id, settlesBillId))
      .then((rows) => rows[0]);
    if (!bill || bill.workspaceId !== transaction.workspaceId) {
      throw new Error("A fatura não pertence ao mesmo espaço da transação");
    }
    const existingPayment = await getDb().query.transactions.findFirst({
      columns: { id: true },
      where: and(
        eq(schema.transactions.settlesBillId, settlesBillId),
        ne(schema.transactions.id, transaction.id),
      ),
    });
    if (existingPayment) throw new Error("Esta fatura já está vinculada a outro pagamento");
  }
  if (transaction.settlesBillId && transaction.settlesBillId !== settlesBillId) {
    await getDb()
      .update(schema.creditCardBills)
      .set({ status: "OPEN", updatedAt: new Date() })
      .where(eq(schema.creditCardBills.id, transaction.settlesBillId));
  }
  await getDb()
    .update(schema.transactions)
    .set({
      nature: input.nature,
      categoryId,
      settlesBillId,
      notes: input.notes || null,
      classificationSource: categoryId ? "MANUAL" : "NONE",
      classificationConfidence: categoryId ? "1.0000" : null,
      reviewStatus: categoryId ? "CONFIRMED" : "PENDING",
      updatedAt: new Date(),
    })
    .where(eq(schema.transactions.id, transaction.id));
  if (settlesBillId) {
    await getDb()
      .update(schema.creditCardBills)
      .set({ status: "PAID", updatedAt: new Date() })
      .where(eq(schema.creditCardBills.id, settlesBillId));
  }
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
        previousSettlesBillId: transaction.settlesBillId,
        settlesBillId,
      },
    });

  revalidatePath("/transacoes");
  revalidatePath("/relatorios");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
