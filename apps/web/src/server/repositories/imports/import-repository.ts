import "server-only";

import { and, eq, getDb, inArray, schema } from "@be-rich/database";
import type { NormalizedTransaction } from "@/types/financial";

export async function createStagedImport(input: {
  workspaceId: string;
  accountId?: string;
  institutionId?: string;
  createdBy: string;
  filename: string;
  fileHash: string;
  format: "CSV" | "XLSX" | "OFX" | "PDF";
  product: "ACCOUNT" | "CREDIT_CARD";
  parserKey: string;
  parserVersion: string;
  warnings: string[];
  rows: Array<{
    raw: Record<string, unknown>;
    normalized?: NormalizedTransaction;
    fingerprint?: string;
    errors?: string[];
  }>;
}) {
  const [batch] = await getDb()
    .insert(schema.importBatches)
    .values({
      workspaceId: input.workspaceId,
      accountId: input.accountId,
      institutionId: input.institutionId,
      createdBy: input.createdBy,
      filename: input.filename,
      fileHash: input.fileHash,
      format: input.format,
      product: input.product,
      parserKey: input.parserKey,
      parserVersion: input.parserVersion,
      status: "REVIEW",
      totalRows: input.rows.length,
      validRows: input.rows.filter((row) => row.normalized && !row.errors?.length).length,
      warnings: input.warnings,
    })
    .onConflictDoNothing()
    .returning();

  if (!batch) {
    return getDb().query.importBatches.findFirst({
      where: and(
        eq(schema.importBatches.workspaceId, input.workspaceId),
        eq(schema.importBatches.fileHash, input.fileHash),
      ),
    });
  }

  if (input.rows.length) {
    await getDb()
      .insert(schema.importRows)
      .values(
        input.rows.map((row, index) => ({
          batchId: batch.id,
          rowNumber: index + 1,
          raw: row.raw,
          normalized: row.normalized,
          fingerprint: row.fingerprint,
          validationErrors: row.errors ?? [],
        })),
      );
  }
  return batch;
}

export async function getImportForReview(batchId: string) {
  const batch = await getDb().query.importBatches.findFirst({
    where: eq(schema.importBatches.id, batchId),
  });
  if (!batch) return null;
  const rows = await getDb().query.importRows.findMany({
    where: eq(schema.importRows.batchId, batchId),
    orderBy: (row, { asc }) => [asc(row.rowNumber)],
  });
  return { batch, rows };
}

export async function setImportAccount(batchId: string, accountId: string) {
  const [batch] = await getDb()
    .update(schema.importBatches)
    .set({ accountId, updatedAt: new Date() })
    .where(eq(schema.importBatches.id, batchId))
    .returning();
  return batch;
}

export async function findExistingTransactions(accountId: string, fingerprints: string[]) {
  if (!fingerprints.length) return [];
  return getDb()
    .select({ id: schema.transactions.id, fingerprint: schema.transactions.fingerprint })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.accountId, accountId),
        inArray(schema.transactions.fingerprint, fingerprints),
      ),
    );
}
