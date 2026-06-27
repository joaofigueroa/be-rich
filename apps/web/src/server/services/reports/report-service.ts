import "server-only";

import { and, eq, getDb, gte, inArray, lte, schema } from "@be-rich/database";
import { z } from "zod";
import { calculateReportTotals } from "@/server/domain/financial-calculator";
import { getUserWorkspaces } from "@/server/services/workspaces/workspace-service";

const ReportInputSchema = z.object({
  startDate: z.iso
    .date()
    .default(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)),
  endDate: z.iso.date().default(() => new Date().toISOString().slice(0, 10)),
  dateBasis: z.enum(["OCCURRED", "POSTED"]).default("OCCURRED"),
});

export async function getReportData(userId: string, rawInput: unknown) {
  const input = ReportInputSchema.parse(rawInput);
  const memberships = await getUserWorkspaces(userId);
  const workspaceIds = memberships.map(({ workspace }) => workspace.id);
  if (!workspaceIds.length) return { input, rows: [], totals: calculateReportTotals([]) };
  const dateColumn =
    input.dateBasis === "OCCURRED" ? schema.transactions.occurredAt : schema.transactions.postedAt;
  const rows = await getDb()
    .select({
      id: schema.transactions.id,
      occurredAt: schema.transactions.occurredAt,
      postedAt: schema.transactions.postedAt,
      description: schema.transactions.description,
      direction: schema.transactions.direction,
      nature: schema.transactions.nature,
      amount: schema.transactions.amount,
      currency: schema.transactions.currency,
      amountInBase: schema.transactions.amountInBase,
      category: schema.categories.name,
      account: schema.financialAccounts.name,
      institution: schema.institutions.name,
    })
    .from(schema.transactions)
    .innerJoin(
      schema.financialAccounts,
      eq(schema.transactions.accountId, schema.financialAccounts.id),
    )
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .leftJoin(
      schema.institutions,
      eq(schema.financialAccounts.institutionId, schema.institutions.id),
    )
    .where(
      and(
        inArray(schema.transactions.workspaceId, workspaceIds),
        gte(dateColumn, new Date(`${input.startDate}T00:00:00.000Z`)),
        lte(dateColumn, new Date(`${input.endDate}T23:59:59.999Z`)),
      ),
    );
  return { input, rows, totals: calculateReportTotals(rows) };
}
