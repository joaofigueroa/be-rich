import { createHash } from "node:crypto";
import { eq, getDb, schema } from "@be-rich/database";
import { classificationReviewStatus, matchRule } from "@/server/domain/classification";
import { classifyWithAi } from "@/server/services/classification/ai-classifier";
import { NormalizedTransactionSchema } from "@/types/financial";

export async function processImportWorkflow(batchId: string) {
  "use workflow";
  const transactionIds = await persistImportStep(batchId);
  await categorizeTransactionsStep(transactionIds);
  await markImportCompletedStep(batchId, transactionIds.length);
  return { batchId, transactionIds };
}

export async function reprocessClassificationsWorkflow(transactionIds: string[]) {
  "use workflow";
  return categorizeTransactionsStep(transactionIds);
}

export async function categorizeTransactionsStep(transactionIds: string[]) {
  "use step";
  const stats = { classified: 0, failed: 0, skipped: 0 };
  for (const transactionId of transactionIds) {
    const transaction = await getDb().query.transactions.findFirst({
      where: eq(schema.transactions.id, transactionId),
    });
    if (!transaction || !["CONSUMPTION", "INCOME"].includes(transaction.nature)) {
      stats.skipped += 1;
      continue;
    }
    const categoryType = transaction.nature === "INCOME" ? "INCOME" : "EXPENSE";
    const [rules, categories] = await Promise.all([
      getDb().query.categorizationRules.findMany({
        where: (rule, { and, eq }) =>
          and(eq(rule.workspaceId, transaction.workspaceId), eq(rule.active, true)),
      }),
      getDb().query.categories.findMany({
        where: (category, { and, eq, isNotNull }) =>
          and(
            eq(category.workspaceId, transaction.workspaceId),
            eq(category.active, true),
            eq(category.type, categoryType),
            isNotNull(category.parentId),
          ),
      }),
    ]);
    const ruleCategoryId = matchRule({
      description: transaction.description,
      merchant: transaction.merchant ?? undefined,
      rules: rules.map((rule) => ({
        categoryId: rule.categoryId,
        field: rule.field === "merchant" ? "merchant" : "description",
        operator: ["CONTAINS", "EQUALS", "STARTS_WITH", "REGEX"].includes(rule.operator)
          ? (rule.operator as "CONTAINS" | "EQUALS" | "STARTS_WITH" | "REGEX")
          : "CONTAINS",
        value: rule.value,
        priority: rule.priority,
      })),
    });
    if (ruleCategoryId) {
      await applyClassification(transaction.id, ruleCategoryId, "RULE", 1);
      stats.classified += 1;
      continue;
    }

    const taxonomyVersion = createHash("sha256")
      .update(
        categories
          .map((category) => `${category.id}:${category.updatedAt.toISOString()}`)
          .sort()
          .join("|"),
      )
      .digest("hex")
      .slice(0, 16);
    const descriptionHash = createHash("sha256")
      .update(transaction.normalizedDescription)
      .digest("hex");
    const cached = await getDb().query.classificationCache.findFirst({
      where: (entry, { and, eq }) =>
        and(
          eq(entry.workspaceId, transaction.workspaceId),
          eq(entry.descriptionHash, descriptionHash),
          eq(entry.taxonomyVersion, taxonomyVersion),
        ),
    });
    if (cached) {
      await applyClassification(
        transaction.id,
        cached.categoryId,
        "CACHE",
        Number(cached.confidence),
      );
      stats.classified += 1;
      continue;
    }

    try {
      const result = await classifyWithAi({
        description: transaction.description,
        institution: "Instituição financeira",
        direction: transaction.direction,
        categories: categories.map((category) => ({
          categoryId: category.id,
          name: category.name,
        })),
      });
      await getDb()
        .insert(schema.classificationCache)
        .values({
          workspaceId: transaction.workspaceId,
          descriptionHash,
          taxonomyVersion,
          categoryId: result.categoryId,
          confidence: result.confidence.toFixed(4),
          model: result.model,
        })
        .onConflictDoNothing();
      await applyClassification(transaction.id, result.categoryId, "AI", result.confidence);
      stats.classified += 1;
    } catch (error) {
      // AI is an enhancement: a provider outage leaves the row pending and never aborts an import.
      stats.failed += 1;
      console.error("[classification] AI classification failed", {
        transactionId: transaction.id,
        workspaceId: transaction.workspaceId,
        error: error instanceof Error ? error.message : "Unknown classifier error",
      });
    }
  }
  return stats;
}

async function applyClassification(
  transactionId: string,
  categoryId: string,
  source: "RULE" | "CACHE" | "AI",
  confidence: number,
) {
  await getDb()
    .update(schema.transactions)
    .set({
      categoryId,
      classificationSource: source,
      classificationConfidence: confidence.toFixed(4),
      reviewStatus: classificationReviewStatus(confidence),
      updatedAt: new Date(),
    })
    .where(eq(schema.transactions.id, transactionId));
}

async function persistImportStep(batchId: string) {
  "use step";
  const batch = await getDb().query.importBatches.findFirst({
    where: eq(schema.importBatches.id, batchId),
  });
  if (!batch?.accountId) throw new Error("Importação sem conta de destino");
  await getDb()
    .update(schema.importBatches)
    .set({ status: "PROCESSING", updatedAt: new Date(), error: null })
    .where(eq(schema.importBatches.id, batchId));
  const rows = await getDb().query.importRows.findMany({
    where: eq(schema.importRows.batchId, batchId),
  });
  const ids: string[] = [];
  let duplicates = 0;
  for (const row of rows) {
    if (row.validationErrors.length || !row.normalized || !row.fingerprint) continue;
    const transaction = NormalizedTransactionSchema.parse(row.normalized);
    const [created] = await getDb()
      .insert(schema.transactions)
      .values({
        workspaceId: batch.workspaceId,
        accountId: batch.accountId,
        origin: "MANUAL_IMPORT",
        externalId: transaction.externalId,
        fingerprint: row.fingerprint,
        occurredAt: new Date(transaction.occurredAt),
        postedAt: new Date(transaction.postedAt),
        description: transaction.description,
        normalizedDescription: transaction.description
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toUpperCase(),
        merchant: transaction.merchant,
        counterparty: transaction.counterparty,
        direction: transaction.direction,
        nature: transaction.nature,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        amountInBase: transaction.amountInBase,
        fxRate: transaction.fxRate,
        fxSource: transaction.fxSource,
        fxRateDate: transaction.fxRateDate,
        installmentNumber: transaction.installmentNumber,
        totalInstallments: transaction.totalInstallments,
        installmentGroup: transaction.installmentGroup,
        createdBy: batch.createdBy,
      })
      .onConflictDoNothing()
      .returning({ id: schema.transactions.id });
    if (created) ids.push(created.id);
    else duplicates += 1;
  }
  await getDb()
    .update(schema.importBatches)
    .set({ importedRows: ids.length, duplicateRows: duplicates, updatedAt: new Date() })
    .where(eq(schema.importBatches.id, batchId));
  return ids;
}

async function markImportCompletedStep(batchId: string, importedRows: number) {
  "use step";
  await getDb()
    .update(schema.importBatches)
    .set({ status: "COMPLETED", importedRows, completedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.importBatches.id, batchId));
}
