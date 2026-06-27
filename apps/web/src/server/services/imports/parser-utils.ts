import "server-only";

import { createHash } from "node:crypto";
import { parse, parseISO } from "date-fns";
import Decimal from "decimal.js";
import type { NormalizedTransaction, TransactionNature } from "@/types/financial";

export function normalizeDescription(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function parseMoney(value: unknown) {
  if (typeof value === "number") return new Decimal(value);
  const raw = String(value ?? "")
    .trim()
    .replace(/R\$|US\$|€|£/gi, "")
    .replace(/\s/g, "");
  if (!raw) return new Decimal(0);
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.replace(/,(?=\d{3}(\D|$))/g, "");
  return new Decimal(normalized.replace(/[^\d.-]/g, ""));
}

export function parseStatementDate(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error("Missing transaction date");
  const candidates = [
    parseISO(raw),
    parse(raw, "dd/MM/yyyy", new Date()),
    parse(raw, "dd/MM/yyyy HH:mm", new Date()),
    parse(raw, "yyyy-MM-dd", new Date()),
    parse(raw, "MM/dd/yyyy", new Date()),
  ];
  const valid = candidates.find((date) => !Number.isNaN(date.getTime()));
  if (!valid) throw new Error(`Invalid transaction date: ${raw}`);
  return valid.toISOString();
}

export function inferNature(
  description: string,
  direction: "CREDIT" | "DEBIT",
  product: "ACCOUNT" | "CREDIT_CARD",
): TransactionNature {
  const normalized = normalizeDescription(description);
  if (/PAGAMENTO.*FATURA|PGTO.*CARTAO/.test(normalized)) return "CARD_PAYMENT";
  if (/RESGATE|LIQUIDACAO.*INVEST/.test(normalized)) return "INVESTMENT_REDEMPTION";
  if (/APLICACAO|INVESTIMENTO|CAIXINHA|COFRINHO/.test(normalized)) return "INVESTMENT_CONTRIBUTION";
  if (/ESTORNO|REEMBOLSO|CHARGEBACK/.test(normalized)) return "REFUND";
  if (/TARIFA|JUROS|IOF|ENCARGOS/.test(normalized)) return "INTEREST_FEE";
  if (/TRANSFERENCIA ENTRE CONTAS|TRANSF CONTA/.test(normalized)) return "OWN_TRANSFER";
  if (direction === "CREDIT") return "INCOME";
  return product === "CREDIT_CARD" ? "CONSUMPTION" : "CONSUMPTION";
}

export function getInstallment(description: string) {
  const match = description.match(/(?:PARC(?:ELA)?\s*)?(\d{1,2})\s*[/]\s*(\d{1,2})/i);
  if (!match) return {};
  const installmentNumber = Number(match[1]);
  const totalInstallments = Number(match[2]);
  if (!installmentNumber || !totalInstallments || installmentNumber > totalInstallments) return {};
  return { installmentNumber, totalInstallments };
}

export function transactionFingerprint(
  input: Pick<
    NormalizedTransaction,
    "occurredAt" | "amount" | "currency" | "description" | "installmentNumber"
  >,
) {
  return createHash("sha256")
    .update(
      [
        input.occurredAt.slice(0, 10),
        input.amount,
        input.currency,
        normalizeDescription(input.description),
        input.installmentNumber ?? "",
      ].join("|"),
    )
    .digest("hex");
}

export function createNormalizedTransaction(input: {
  date: unknown;
  postedDate?: unknown;
  description: unknown;
  amount: unknown;
  currency: string;
  product: "ACCOUNT" | "CREDIT_CARD";
  externalId?: unknown;
}): NormalizedTransaction {
  const parsedAmount = parseMoney(input.amount);
  const direction =
    parsedAmount.isNegative() || input.product === "CREDIT_CARD" ? "DEBIT" : "CREDIT";
  const absolute = parsedAmount.abs().toFixed(2);
  const description = String(input.description ?? "").trim();
  const occurredAt = parseStatementDate(input.date);
  const installment = getInstallment(description);
  return {
    externalId: input.externalId ? String(input.externalId) : undefined,
    occurredAt,
    postedAt: input.postedDate ? parseStatementDate(input.postedDate) : occurredAt,
    description,
    direction,
    nature: inferNature(description, direction, input.product),
    status: "POSTED",
    amount: absolute,
    currency: input.currency,
    amountInBase: absolute,
    ...installment,
  };
}

export function sanitizeFinancialDescription(value: string) {
  return value
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "[CPF]")
    .replace(/(?:[•*xX]{3})\.\d{3}\.\d{3}-(?:[•*xX]{2})/g, "[CPF]")
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, "[CNPJ]")
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[EMAIL]")
    .replace(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}/g, "[PHONE]")
    .replace(/\b(?:AG|AGENCIA|CONTA|CC)\s*[:#-]?\s*\d[\d.-]{2,}\b/gi, "[ACCOUNT]")
    .replace(/\b\d{16}\b/g, "[CARD]")
    .replace(/(PIX\s*-\s*)[^-]+(?=\s*-\s*\[CPF\])/gi, "$1[COUNTERPARTY]")
    .trim();
}
