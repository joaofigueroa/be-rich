import "server-only";

import { parse as parseCsv } from "csv-parse/sync";
import ExcelJS from "exceljs";
import type { NormalizedTransaction } from "@/types/financial";
import { createNormalizedTransaction } from "./parser-utils";
import type { ParsedStatement, StatementParseInput, StatementParser } from "./statement-parser";

const aliases = {
  date: ["data", "date", "data lancamento", "data da compra", "data do movimento"],
  postedDate: ["data de lancamento", "posted date", "data processamento"],
  description: [
    "descricao",
    "descrição",
    "description",
    "titulo",
    "title",
    "historico",
    "histórico",
    "tipo de transacao",
  ],
  amount: ["valor", "amount", "valor da compra", "valor líquido", "liquid amount"],
  externalId: ["identificador", "id", "reference id", "transaction id"],
} as const;

function canonical(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function pick(
  row: Record<string, unknown>,
  field: keyof typeof aliases,
  mapping?: Record<string, string>,
) {
  const mapped = mapping?.[field];
  if (mapped && mapped in row) return row[mapped];
  const keys = Object.keys(row);
  const key = keys.find((candidate) =>
    aliases[field].some((alias) => canonical(candidate) === canonical(alias)),
  );
  return key ? row[key] : undefined;
}

function normalizeRows(rows: Record<string, unknown>[], input: StatementParseInput) {
  const warnings: string[] = [];
  const transactions: NormalizedTransaction[] = [];
  rows.forEach((row, index) => {
    try {
      const date = pick(row, "date", input.mapping);
      const description = pick(row, "description", input.mapping);
      const amount = pick(row, "amount", input.mapping);
      if (date === undefined || description === undefined || amount === undefined) {
        throw new Error("Required columns were not detected");
      }
      transactions.push(
        createNormalizedTransaction({
          date,
          postedDate: pick(row, "postedDate", input.mapping),
          description,
          amount,
          externalId: pick(row, "externalId", input.mapping),
          currency: input.currency ?? "BRL",
          product: input.product,
        }),
      );
    } catch (error) {
      warnings.push(
        `Linha ${index + 2}: ${error instanceof Error ? error.message : "falha de leitura"}`,
      );
    }
  });
  return { transactions, warnings };
}

function result(
  input: StatementParseInput,
  rows: Record<string, unknown>[],
  key: string,
): ParsedStatement {
  const { transactions, warnings } = normalizeRows(rows, input);
  return {
    parserKey: key,
    parserVersion: "1.0.0",
    institution: input.institution,
    product: input.product,
    account: { currency: input.currency ?? "BRL" },
    transactions,
    rawRows: rows,
    warnings,
  };
}

export const csvStatementParser: StatementParser = {
  key: "delimited-csv",
  version: "1.0.0",
  formats: ["CSV"],
  supports: (input) =>
    input.filename.toLowerCase().endsWith(".csv") || input.contentType.includes("csv"),
  async parse(input) {
    const text = new TextDecoder("utf-8").decode(input.bytes).replace(/^\uFEFF/, "");
    const delimiter = text.split("\n")[0]?.includes(";") ? ";" : ",";
    const rows = parseCsv(text, {
      columns: true,
      skip_empty_lines: true,
      delimiter,
      relax_column_count: true,
      trim: true,
    }) as Record<string, unknown>[];
    return result(input, rows, this.key);
  },
};

export const xlsxStatementParser: StatementParser = {
  key: "spreadsheet-xlsx",
  version: "1.0.0",
  formats: ["XLSX"],
  supports: (input) =>
    input.filename.toLowerCase().endsWith(".xlsx") || input.contentType.includes("spreadsheet"),
  async parse(input) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(new Uint8Array(input.bytes).buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error("The spreadsheet does not contain a worksheet");
    const headerRow = sheet.getRow(1).values as unknown[];
    const headers = headerRow.slice(1).map((value) => String(value ?? ""));
    const rows: Record<string, unknown>[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const values = row.values as unknown[];
      const record = Object.fromEntries(
        headers.map((header, index) => [header, values[index + 1]]),
      );
      if (
        Object.values(record).some((value) => value !== null && value !== undefined && value !== "")
      )
        rows.push(record);
    });
    return result(input, rows, this.key);
  },
};
