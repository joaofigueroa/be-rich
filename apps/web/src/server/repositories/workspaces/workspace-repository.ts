import "server-only";

import { and, eq, getDb, schema } from "@be-rich/database";

export async function findPersonalWorkspaceByUserId(userId: string) {
  return getDb().query.workspaces.findFirst({
    where: and(eq(schema.workspaces.ownerId, userId), eq(schema.workspaces.type, "PERSONAL")),
  });
}

export async function createPersonalWorkspace(input: { userId: string; name: string }) {
  const [workspace] = await getDb()
    .insert(schema.workspaces)
    .values({ name: input.name, type: "PERSONAL", ownerId: input.userId, baseCurrency: "BRL" })
    .returning();

  if (!workspace) {
    throw new Error("Unable to create personal workspace");
  }

  await getDb().insert(schema.workspaceMembers).values({
    workspaceId: workspace.id,
    userId: input.userId,
    role: "OWNER",
  });

  return workspace;
}

export async function listWorkspacesForUser(userId: string) {
  return getDb()
    .select({ workspace: schema.workspaces, role: schema.workspaceMembers.role })
    .from(schema.workspaceMembers)
    .innerJoin(schema.workspaces, eq(schema.workspaces.id, schema.workspaceMembers.workspaceId))
    .where(eq(schema.workspaceMembers.userId, userId));
}

export async function findWorkspaceMembership(input: { workspaceId: string; userId: string }) {
  return getDb().query.workspaceMembers.findFirst({
    where: and(
      eq(schema.workspaceMembers.workspaceId, input.workspaceId),
      eq(schema.workspaceMembers.userId, input.userId),
    ),
  });
}
