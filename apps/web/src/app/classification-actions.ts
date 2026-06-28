"use server";

import { getDb } from "@be-rich/database";
import { revalidatePath } from "next/cache";
import { start } from "workflow/api";
import { requireUser } from "@/server/services/auth/session-service";
import { getUserWorkspaces } from "@/server/services/workspaces/workspace-service";
import { reprocessClassificationsWorkflow } from "@/workflows/process-import";

export async function reprocessCategoriesAction() {
  const user = await requireUser();
  const memberships = await getUserWorkspaces(user.id);
  const workspaceIds = memberships.map(({ workspace }) => workspace.id);
  if (!workspaceIds.length) {
    return { queued: 0, started: false as const, message: "Nenhum espaço disponível." };
  }

  const pending = await getDb().query.transactions.findMany({
    columns: { id: true },
    where: (transaction, { and, eq, inArray }) =>
      and(
        inArray(transaction.workspaceId, workspaceIds),
        inArray(transaction.nature, [
          "CONSUMPTION",
          "INCOME",
          "INVESTMENT_CONTRIBUTION",
          "INVESTMENT_REDEMPTION",
        ]),
        eq(transaction.reviewStatus, "PENDING"),
      ),
    limit: 500,
  });
  if (!pending.length) {
    return {
      queued: 0,
      started: false as const,
      message: "Não há transações pendentes para reclassificar.",
    };
  }

  await start(reprocessClassificationsWorkflow, [pending.map(({ id }) => id)]);
  revalidatePath("/transacoes");
  revalidatePath("/relatorios");
  return {
    queued: pending.length,
    started: true as const,
    message:
      pending.length === 1
        ? "1 transação foi enviada para reclassificação."
        : `${pending.length} transações foram enviadas para reclassificação.`,
  };
}
