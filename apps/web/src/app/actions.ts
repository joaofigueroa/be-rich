"use server";

import { getDb, schema } from "@be-rich/database";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/server/services/auth/session-service";
import {
  createFamilyWorkspace,
  inviteFamilyMember,
} from "@/server/services/workspaces/family-service";
import { requireWorkspaceMembership } from "@/server/services/workspaces/workspace-service";

export async function createFinancialAccountAction(form: FormData) {
  const user = await requireUser();
  const input = z
    .object({
      workspaceId: z.uuidv7(),
      name: z.string().trim().min(2).max(80),
      type: z.enum(["CHECKING", "SAVINGS", "PAYMENT", "CREDIT_CARD", "INVESTMENT", "CASH", "DEBT"]),
      currency: z.string().regex(/^[A-Z]{3}$/),
    })
    .parse(Object.fromEntries(form));
  await requireWorkspaceMembership({ workspaceId: input.workspaceId, userId: user.id });
  await getDb()
    .insert(schema.financialAccounts)
    .values({ ...input, origin: "MANUAL_ENTRY", createdBy: user.id });
  await getDb()
    .insert(schema.auditEvents)
    .values({
      workspaceId: input.workspaceId,
      actorId: user.id,
      action: "account.created",
      entityType: "financial_account",
      metadata: { name: input.name, type: input.type },
    });
  revalidatePath("/importar");
  revalidatePath("/patrimonio");
  revalidatePath("/dashboard");
}

export async function createFamilyWorkspaceAction(form: FormData) {
  const user = await requireUser();
  await createFamilyWorkspace({ userId: user.id, name: z.string().min(2).parse(form.get("name")) });
  revalidatePath("/configuracoes");
}

export async function inviteFamilyMemberAction(form: FormData) {
  const user = await requireUser();
  await inviteFamilyMember({
    workspaceId: z.uuidv7().parse(form.get("workspaceId")),
    userId: user.id,
    inviterName: user.name,
    email: z.email().parse(form.get("email")),
    baseUrl: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  });
  revalidatePath("/configuracoes");
}

export async function createGoalAction(form: FormData) {
  const user = await requireUser();
  const input = z
    .object({
      workspaceId: z.uuidv7(),
      name: z.string().trim().min(2).max(100),
      targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      targetDate: z.string().optional(),
      currency: z.string().regex(/^[A-Z]{3}$/),
    })
    .parse(Object.fromEntries(form));
  await requireWorkspaceMembership({ workspaceId: input.workspaceId, userId: user.id });
  await getDb()
    .insert(schema.goals)
    .values({ ...input, targetDate: input.targetDate || null, createdBy: user.id });
  await getDb()
    .insert(schema.auditEvents)
    .values({
      workspaceId: input.workspaceId,
      actorId: user.id,
      action: "goal.created",
      entityType: "goal",
      metadata: { name: input.name },
    });
  revalidatePath("/planejamento");
  revalidatePath("/dashboard");
}
