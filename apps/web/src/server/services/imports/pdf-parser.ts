import "server-only";

import { extractText, getDocumentProxy } from "unpdf";
import { createNormalizedTransaction } from "./parser-utils";
import type { StatementParser } from "./statement-parser";

const transactionLine = /^(\d{2}[/]\d{2}(?:[/]\d{2,4})?)\s+(.+?)\s+(-?(?:R\$\s*)?[\d.]+,\d{2})$/;
const interCardTransactionLine =
  /^(\d{2})\s+de\s+([a-zç.]+)\s+(\d{4})\s+(.+?)\s+(?:-\s+)?([+-])\s+R\$\s*([\d.]+,\d{2})$/i;
const interCardHeaderLine = /CARTÃO\s+(\d{4}\*{4}\d{4})/i;
const interCardSummaryLine = /^Total\s+CARTÃO/i;

const portugueseMonths: Record<string, string> = {
  jan: "01",
  janeiro: "01",
  fev: "02",
  fevereiro: "02",
  mar: "03",
  marco: "03",
  março: "03",
  abr: "04",
  abril: "04",
  mai: "05",
  maio: "05",
  jun: "06",
  junho: "06",
  jul: "07",
  julho: "07",
  ago: "08",
  agosto: "08",
  set: "09",
  setembro: "09",
  out: "10",
  outubro: "10",
  nov: "11",
  novembro: "11",
  dez: "12",
  dezembro: "12",
};

export function sanitizePdfBytes(bytes: Uint8Array) {
  const signature = new TextEncoder().encode("%PDF");
  const eof = new TextEncoder().encode("%%EOF");
  for (let index = 0; index <= bytes.length - signature.length; index++) {
    if (signature.every((byte, offset) => bytes[index + offset] === byte)) {
      const pdfBytes = bytes.subarray(index);
      let end = pdfBytes.length;
      for (let cursor = pdfBytes.length - eof.length; cursor >= 0; cursor--) {
        if (eof.every((byte, offset) => pdfBytes[cursor + offset] === byte)) {
          end = cursor + eof.length;
          break;
        }
      }
      return Uint8Array.from(pdfBytes.subarray(0, end));
    }
  }
  return Uint8Array.from(bytes);
}

function normalizePortugueseCardDate(day: string, month: string, year: string) {
  const normalizedMonth = month
    .replace(".", "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const monthNumber = portugueseMonths[normalizedMonth];
  if (!monthNumber) throw new Error(`Mês inválido na fatura PDF: ${month}`);
  return `${day}/${monthNumber}/${year}`;
}

function logicalPdfLines(text: string) {
  return text
    .replace(/\s+(CARTÃO\s+\d{4}\*{4}\d{4})/gi, "\n$1")
    .replace(/\s+(Total\s+CARTÃO\s+\d{4}\*{4}\d{4}\s+R\$)/gi, "\n$1")
    .replace(/\s+(\d{2}\s+de\s+[a-zç.]+\s+\d{4}\s+)/gi, "\n$1")
    .split(/\r?\n/);
}

function cleanInterCardDescription(description: string) {
  return description
    .replace(/\s+-$/, "")
    .replace(/\s+Valor e símbolo da moeda de origem:.*$/i, "")
    .trim();
}

function inferPdfProduct(input: {
  text: string;
  institution: "nubank" | "inter" | "c6" | "mercado-pago" | "generic";
  product: "ACCOUNT" | "CREDIT_CARD";
}) {
  if (
    input.institution === "inter" &&
    /Despesas da fatura/i.test(input.text) &&
    /CARTÃO\s+\d{4}\*{4}\d{4}/i.test(input.text)
  ) {
    return "CREDIT_CARD" as const;
  }
  return input.product;
}

export function parsePdfText(input: {
  text: string;
  institution: "nubank" | "inter" | "c6" | "mercado-pago" | "generic";
  product: "ACCOUNT" | "CREDIT_CARD";
  currency?: string;
}) {
  const year = new Date().getFullYear();
  const warnings: string[] = [];
  const rawRows: Record<string, unknown>[] = [];
  const transactions = [];
  let currentCardLastFour: string | undefined;
  const effectiveProduct = inferPdfProduct(input);

  for (const [index, rawLine] of logicalPdfLines(input.text).entries()) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const cardHeader = line.match(interCardHeaderLine);
    if (cardHeader?.[1]) {
      currentCardLastFour = cardHeader[1].slice(-4);
      continue;
    }
    if (interCardSummaryLine.test(line)) {
      currentCardLastFour = undefined;
      continue;
    }

    const interMatch =
      input.institution === "inter" && effectiveProduct === "CREDIT_CARD"
        ? line.match(interCardTransactionLine)
        : null;
    if (interMatch) {
      const [, day, month, lineYear, description, sign, amount] = interMatch;
      if (!day || !month || !lineYear || !description || !sign || !amount) continue;
      rawRows.push({ line, pageLine: index + 1, cardLastFour: currentCardLastFour });
      try {
        const date = normalizePortugueseCardDate(day, month, lineYear);
        transactions.push(
          createNormalizedTransaction({
            date,
            description: cleanInterCardDescription(description),
            amount,
            currency: input.currency ?? "BRL",
            product: effectiveProduct,
            direction: sign === "+" ? "CREDIT" : "DEBIT",
            externalId: currentCardLastFour
              ? `${currentCardLastFour}:${date}:${description}:${amount}`
              : undefined,
          }),
        );
      } catch (error) {
        warnings.push(
          `Linha PDF ${index + 1}: ${error instanceof Error ? error.message : "falha"}`,
        );
      }
      continue;
    }

    const match = line.match(transactionLine);
    if (!match) continue;
    const [, rawDate, description, amount] = match;
    if (!rawDate || !description || !amount) continue;
    rawRows.push({ line, pageLine: index + 1 });
    try {
      const date = rawDate.split("/").length === 2 ? `${rawDate}/${year}` : rawDate;
      transactions.push(
        createNormalizedTransaction({
          date,
          description,
          amount,
          currency: input.currency ?? "BRL",
          product: effectiveProduct,
        }),
      );
    } catch (error) {
      warnings.push(`Linha PDF ${index + 1}: ${error instanceof Error ? error.message : "falha"}`);
    }
  }

  if (transactions.length === 0) {
    warnings.push(
      "Nenhuma linha transacional reconhecida. Confirme se o PDF possui texto selecionável e um layout suportado.",
    );
  }

  return { product: effectiveProduct, transactions, rawRows, warnings };
}

export const pdfStatementParser: StatementParser = {
  key: "bank-text-pdf",
  version: "1.1.1",
  formats: ["PDF"],
  supports: (input) =>
    input.filename.toLowerCase().endsWith(".pdf") || input.contentType.includes("pdf"),
  async parse(input) {
    const document = await getDocumentProxy(
      sanitizePdfBytes(input.bytes),
      input.password ? { password: input.password } : undefined,
    );
    const { text } = await extractText(document, { mergePages: true });
    const { product, transactions, rawRows, warnings } = parsePdfText({
      text,
      institution: input.institution,
      product: input.product,
      currency: input.currency,
    });

    return {
      parserKey: `${this.key}:${input.institution}:${input.product.toLowerCase()}`,
      parserVersion: this.version,
      institution: input.institution,
      product,
      account: { currency: input.currency ?? "BRL" },
      transactions,
      rawRows,
      warnings,
    };
  },
};
