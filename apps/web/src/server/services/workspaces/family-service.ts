import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, getDb, schema } from "@be-rich/database";
import { z } from "zod";
import { sendFamilyInviteEmail } from "@/lib/email";
import { requireWorkspaceMembership } from "./workspace-service";

export async function createFamilyWorkspace(input: { userId: string; name: string }) {
  const data = z
    .object({ userId: z.uuidv7(), name: z.string().trim().min(2).max(80) })
    .parse(input);
  const [workspace] = await getDb()
    .insert(schema.workspaces)
    .values({ ownerId: data.userId, name: data.name, type: "FAMILY", baseCurrency: "BRL" })
    .returning();
  if (!workspace) throw new Error("Não foi possível criar o espaço familiar");
  await getDb()
    .insert(schema.workspaceMembers)
    .values({ workspaceId: workspace.id, userId: data.userId, role: "OWNER" });
  return workspace;
}

export async function inviteFamilyMember(input: {
  workspaceId: string;
  userId: string;
  inviterName: string;
  email: string;
  baseUrl: string;
}) {
  const data = z
    .object({
      workspaceId: z.uuidv7(),
      userId: z.uuidv7(),
      inviterName: z.string().min(1),
      email: z.email(),
      baseUrl: z.url(),
    })
    .parse(input);
  const membership = await requireWorkspaceMembership({
    workspaceId: data.workspaceId,
    userId: data.userId,
  });
  if (membership.role !== "OWNER") throw new Error("Somente o proprietário pode convidar membros");
  const workspace = await getDb().query.workspaces.findFirst({
    where: eq(schema.workspaces.id, data.workspaceId),
  });
  if (!workspace || workspace.type !== "FAMILY")
    throw new Error("Convites existem apenas em espaços familiares");
  const token = randomBytes(32).toString("base64url");
  await getDb()
    .insert(schema.workspaceInvites)
    .values({
      workspaceId: data.workspaceId,
      email: data.email.toLowerCase(),
      tokenHash: createHash("sha256").update(token).digest("hex"),
      role: "EDITOR",
      invitedBy: data.userId,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    });
  await sendFamilyInviteEmail({
    email: data.email,
    inviterName: data.inviterName,
    workspaceName: workspace.name,
    url: `${data.baseUrl}/convite/${token}`,
  });
}

export async function acceptFamilyInvite(input: { token: string; userId: string; email: string }) {
  const data = z
    .object({ token: z.string().min(20), userId: z.uuidv7(), email: z.email() })
    .parse(input);
  const tokenHash = createHash("sha256").update(data.token).digest("hex");
  const invite = await getDb().query.workspaceInvites.findFirst({
    where: and(
      eq(schema.workspaceInvites.tokenHash, tokenHash),
      eq(schema.workspaceInvites.status, "PENDING"),
    ),
  });
  if (!invite || invite.expiresAt < new Date() || invite.email !== data.email.toLowerCase())
    throw new Error("Convite inválido ou expirado");
  await getDb()
    .insert(schema.workspaceMembers)
    .values({ workspaceId: invite.workspaceId, userId: data.userId, role: invite.role })
    .onConflictDoNothing();
  await getDb()
    .update(schema.workspaceInvites)
    .set({ status: "ACCEPTED", acceptedBy: data.userId, updatedAt: new Date() })
    .where(eq(schema.workspaceInvites.id, invite.id));
  return invite.workspaceId;
}
