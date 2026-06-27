import "server-only";

import { createHash } from "node:crypto";
import { getDb } from "@be-rich/database";
import { z } from "zod";
import {
  createStagedImport,
  getImportForReview,
  setImportAccount,
} from "@/server/repositories/imports/import-repository";
import { requireWorkspaceMembership } from "@/server/services/workspaces/workspace-service";
import { parseStatement } from "./parser-registry";
import { transactionFingerprint } from "./parser-utils";

const StageImportInputSchema = z.object({
  workspaceId: z.uuidv7(),
  accountId: z.uuidv7().optional(),
  institution: z.enum(["nubank", "inter", "c6", "mercado-pago", "generic"]),
  product: z.enum(["ACCOUNT", "CREDIT_CARD"]),
  filename: z.string().min(1).max(255),
  contentType: z.string().max(200),
  password: z.string().max(256).optional(),
  bytes: z.instanceof(Uint8Array),
  userId: z.uuidv7(),
});

function detectFormat(filename: string): "CSV" | "XLSX" | "OFX" | "PDF" {
  const extension = filename.toLowerCase().split(".").at(-1);
  if (extension === "csv") return "CSV";
  if (extension === "xlsx") return "XLSX";
  if (extension === "ofx") return "OFX";
  if (extension === "pdf") return "PDF";
  throw new Error("Formato não suportado. Use CSV, XLSX, OFX ou PDF textual.");
}

export async function stageStatementImport(rawInput: z.input<typeof StageImportInputSchema>) {
  const input = StageImportInputSchema.parse(rawInput);
  if (input.bytes.byteLength > 10 * 1024 * 1024)
    throw new Error("O arquivo excede o limite de 10 MB");
  await requireWorkspaceMembership({ workspaceId: input.workspaceId, userId: input.userId });

  const accountId = input.accountId;
  if (accountId) {
    const account = await getDb().query.financialAccounts.findFirst({
      where: (account, { and, eq }) =>
        and(eq(account.id, accountId), eq(account.workspaceId, input.workspaceId)),
    });
    if (!account) throw new Error("A conta não pertence ao espaço selecionado");
  }

  const parsed = await parseStatement({
    bytes: input.bytes,
    filename: input.filename,
    contentType: input.contentType,
    institution: input.institution,
    product: input.product,
    password: input.password,
    currency: "BRL",
  });
  if (parsed.transactions.length > 10_000)
    throw new Error("O arquivo excede o limite de 10.000 lançamentos");

  const fileHash = createHash("sha256").update(input.bytes).digest("hex");
  const institution = await getDb().query.institutions.findFirst({
    where: (institution, { eq }) => eq(institution.slug, input.institution),
  });
  const batch = await createStagedImport({
    workspaceId: input.workspaceId,
    accountId: input.accountId,
    institutionId: institution?.id,
    createdBy: input.userId,
    filename: input.filename,
    fileHash,
    format: detectFormat(input.filename),
    product: input.product,
    parserKey: parsed.parserKey,
    parserVersion: parsed.parserVersion,
    warnings: parsed.warnings,
    rows: parsed.transactions.map((transaction, index) => ({
      raw: parsed.rawRows[index] ?? {},
      normalized: transaction,
      fingerprint: transactionFingerprint(transaction),
    })),
  });
  if (!batch) throw new Error("Não foi possível criar a importação");
  return getImportForReview(batch.id);
}

export async function prepareImportConfirmation(input: {
  batchId: string;
  accountId: string;
  userId: string;
}) {
  const data = z
    .object({ batchId: z.uuidv7(), accountId: z.uuidv7(), userId: z.uuidv7() })
    .parse(input);
  const review = await getImportForReview(data.batchId);
  if (!review) throw new Error("Importação não encontrada");
  await requireWorkspaceMembership({ workspaceId: review.batch.workspaceId, userId: data.userId });
  const account = await getDb().query.financialAccounts.findFirst({
    where: (account, { and, eq }) =>
      and(eq(account.id, data.accountId), eq(account.workspaceId, review.batch.workspaceId)),
  });
  if (!account) throw new Error("A conta não pertence ao espaço selecionado");
  if (review.batch.product === "CREDIT_CARD" && account.type !== "CREDIT_CARD") {
    throw new Error("Selecione uma conta do tipo cartão de crédito para importar a fatura");
  }
  if (review.batch.product === "ACCOUNT" && account.type === "CREDIT_CARD") {
    throw new Error("Selecione uma conta corrente ou de pagamento para importar o extrato");
  }
  return setImportAccount(data.batchId, data.accountId);
}
