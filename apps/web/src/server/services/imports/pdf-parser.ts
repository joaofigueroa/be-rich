import "server-only";

import { extractText, getDocumentProxy } from "unpdf";
import { createNormalizedTransaction } from "./parser-utils";
import type { StatementParser } from "./statement-parser";

const transactionLine = /^(\d{2}[/]\d{2}(?:[/]\d{2,4})?)\s+(.+?)\s+(-?(?:R\$\s*)?[\d.]+,\d{2})$/;

export const pdfStatementParser: StatementParser = {
  key: "bank-text-pdf",
  version: "1.0.0",
  formats: ["PDF"],
  supports: (input) =>
    input.filename.toLowerCase().endsWith(".pdf") || input.contentType.includes("pdf"),
  async parse(input) {
    const document = await getDocumentProxy(
      input.bytes,
      input.password ? { password: input.password } : undefined,
    );
    const { text } = await extractText(document, { mergePages: true });
    const year = new Date().getFullYear();
    const warnings: string[] = [];
    const rawRows: Record<string, unknown>[] = [];
    const transactions = text
      .split(/\r?\n/)
      .map((line) => line.replace(/\s+/g, " ").trim())
      .flatMap((line, index) => {
        const match = line.match(transactionLine);
        if (!match) return [];
        const [, rawDate, description, amount] = match;
        if (!rawDate || !description || !amount) return [];
        rawRows.push({ line, pageLine: index + 1 });
        try {
          const date = rawDate.split("/").length === 2 ? `${rawDate}/${year}` : rawDate;
          return [
            createNormalizedTransaction({
              date,
              description,
              amount,
              currency: input.currency ?? "BRL",
              product: input.product,
            }),
          ];
        } catch (error) {
          warnings.push(
            `Linha PDF ${index + 1}: ${error instanceof Error ? error.message : "falha"}`,
          );
          return [];
        }
      });

    if (transactions.length === 0) {
      warnings.push(
        "Nenhuma linha transacional reconhecida. Confirme se o PDF possui texto selecionável e um layout suportado.",
      );
    }

    return {
      parserKey: `${this.key}:${input.institution}:${input.product.toLowerCase()}`,
      parserVersion: this.version,
      institution: input.institution,
      product: input.product,
      account: { currency: input.currency ?? "BRL" },
      transactions,
      rawRows,
      warnings,
    };
  },
};
