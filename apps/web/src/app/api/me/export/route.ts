import { getDb, inArray } from "@be-rich/database";
import { NextResponse } from "next/server";
import { requireUser } from "@/server/services/auth/session-service";
import { getUserWorkspaces } from "@/server/services/workspaces/workspace-service";

export async function GET() {
  const user = await requireUser();
  const memberships = await getUserWorkspaces(user.id);
  const workspaceIds = memberships.map(({ workspace }) => workspace.id);
  const [accounts, transactions, categories, goals, budgets, recurrences, imports] =
    workspaceIds.length
      ? await Promise.all([
          getDb().query.financialAccounts.findMany({
            where: (row) => inArray(row.workspaceId, workspaceIds),
          }),
          getDb().query.transactions.findMany({
            where: (row) => inArray(row.workspaceId, workspaceIds),
          }),
          getDb().query.categories.findMany({
            where: (row) => inArray(row.workspaceId, workspaceIds),
          }),
          getDb().query.goals.findMany({ where: (row) => inArray(row.workspaceId, workspaceIds) }),
          getDb().query.budgetMonths.findMany({
            where: (row) => inArray(row.workspaceId, workspaceIds),
          }),
          getDb().query.recurrences.findMany({
            where: (row) => inArray(row.workspaceId, workspaceIds),
          }),
          getDb().query.importBatches.findMany({
            where: (row) => inArray(row.workspaceId, workspaceIds),
          }),
        ])
      : [[], [], [], [], [], [], []];
  return NextResponse.json(
    {
      exportedAt: new Date().toISOString(),
      user,
      workspaces: memberships,
      accounts,
      transactions,
      categories,
      goals,
      budgets,
      recurrences,
      imports,
    },
    {
      headers: {
        "content-disposition": `attachment; filename="be-rich-dados-${new Date().toISOString().slice(0, 10)}.json"`,
        "cache-control": "private, no-store",
      },
    },
  );
}
