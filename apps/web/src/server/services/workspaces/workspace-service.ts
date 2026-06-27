import "server-only";

import { getDb, schema } from "@be-rich/database";
import { z } from "zod";
import {
  createPersonalWorkspace,
  findPersonalWorkspaceByUserId,
  findWorkspaceMembership,
  listWorkspacesForUser,
} from "@/server/repositories/workspaces/workspace-repository";
import { DEFAULT_EXPENSE_TAXONOMY, DEFAULT_INCOME_CATEGORIES } from "./default-taxonomy";

const UserInputSchema = z.object({ userId: z.uuidv7(), userName: z.string().trim().min(1) });
const MembershipInputSchema = z.object({ workspaceId: z.uuidv7(), userId: z.uuidv7() });

async function seedDefaultCategories(workspaceId: string) {
  let sortOrder = 0;
  for (const group of DEFAULT_EXPENSE_TAXONOMY) {
    const [parent] = await getDb()
      .insert(schema.categories)
      .values({
        workspaceId,
        name: group.name,
        type: "EXPENSE",
        systemKey: `expense.${group.key}`,
        sortOrder: sortOrder++,
      })
      .returning();
    if (!parent) continue;
    await getDb()
      .insert(schema.categories)
      .values(
        group.children.map((name, childIndex) => ({
          workspaceId,
          parentId: parent.id,
          name,
          type: "EXPENSE" as const,
          systemKey: `expense.${group.key}.${childIndex}`,
          sortOrder: childIndex,
        })),
      );
  }

  const [incomeParent] = await getDb()
    .insert(schema.categories)
    .values({ workspaceId, name: "Receitas", type: "INCOME", systemKey: "income", sortOrder: 0 })
    .returning();
  if (incomeParent) {
    await getDb()
      .insert(schema.categories)
      .values(
        DEFAULT_INCOME_CATEGORIES.map((name, index) => ({
          workspaceId,
          parentId: incomeParent.id,
          name,
          type: "INCOME" as const,
          systemKey: `income.${index}`,
          sortOrder: index,
        })),
      );
  }
}

export async function ensurePersonalWorkspace(input: z.infer<typeof UserInputSchema>) {
  const data = UserInputSchema.parse(input);
  const existing = await findPersonalWorkspaceByUserId(data.userId);
  if (existing) return existing;
  const workspace = await createPersonalWorkspace({
    userId: data.userId,
    name: `${data.userName.split(" ")[0]} — Pessoal`,
  });
  await seedDefaultCategories(workspace.id);
  return workspace;
}

export async function getUserWorkspaces(userId: string) {
  z.uuidv7().parse(userId);
  return listWorkspacesForUser(userId);
}

export async function requireWorkspaceMembership(input: z.infer<typeof MembershipInputSchema>) {
  const data = MembershipInputSchema.parse(input);
  const membership = await findWorkspaceMembership(data);
  if (!membership) throw new Error("FORBIDDEN_WORKSPACE");
  return membership;
}
