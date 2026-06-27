"use server";

import { getDb, schema } from "@be-rich/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/services/auth/session-service";
import { requireWorkspaceMembership } from "@/server/services/workspaces/workspace-service";

export async function recordAccountBalanceAction(form: FormData) {
  const user = await requireUser();
  const input = z
    .object({
      accountId: z.uuidv7(),
      workspaceId: z.uuidv7(),
      balance: z.string().regex(/^-?\d+(\.\d{1,8})?$/),
      balanceInBase: z
        .string()
        .regex(/^-?\d+(\.\d{1,8})?$/)
        .optional(),
    })
    .parse(Object.fromEntries(form));
  await requireWorkspaceMembership({ workspaceId: input.workspaceId, userId: user.id });

  const [account, workspace] = await Promise.all([
    getDb().query.financialAccounts.findFirst({
      where: (entry, { and, eq }) =>
        and(eq(entry.id, input.accountId), eq(entry.workspaceId, input.workspaceId)),
    }),
    getDb().query.workspaces.findFirst({
      where: (entry, { eq }) => eq(entry.id, input.workspaceId),
    }),
  ]);
  if (!account || !workspace) throw new Error("Conta não encontrada");
  const balanceInBase =
    account.currency === workspace.baseCurrency ? input.balance : input.balanceInBase;
  if (!balanceInBase) {
    throw new Error(`Informe também o saldo convertido para ${workspace.baseCurrency}`);
  }

  await getDb()
    .insert(schema.accountBalanceSnapshots)
    .values({
      accountId: account.id,
      balance: input.balance,
      currency: account.currency,
      balanceInBase,
      fxSource: account.currency === workspace.baseCurrency ? undefined : "MANUAL",
      asOf: new Date(),
    });
  await getDb()
    .insert(schema.auditEvents)
    .values({
      workspaceId: input.workspaceId,
      actorId: user.id,
      action: "account.balance_recorded",
      entityType: "financial_account",
      entityId: account.id,
      metadata: { currency: account.currency, baseCurrency: workspace.baseCurrency },
    });
  revalidatePath("/patrimonio");
  revalidatePath("/dashboard");
}
