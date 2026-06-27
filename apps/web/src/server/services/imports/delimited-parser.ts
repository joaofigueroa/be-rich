import "server-only";

import { parse as parseCsv } from "csv-parse/sync";
import ExcelJS from "exceljs";
import type { NormalizedTransaction } from "@/types/financial";
import { createNormalizedTransaction, parseStatementDate } from "./parser-utils";
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

function findKey(row: Record<string, unknown>, aliasesToFind: readonly string[]) {
  return Object.keys(row).find((candidate) =>
    aliasesToFind.some((alias) => canonical(candidate) === canonical(alias)),
  );
}

function pickDescription(row: Record<string, unknown>, mapping?: Record<string, string>) {
  const mapped = mapping?.description;
  if (mapped && mapped in row) return row[mapped];

  const historyKey = findKey(row, ["historico", "histórico"]);
  const descriptionKey = findKey(row, ["descricao", "descrição"]);
  const history = historyKey ? String(row[historyKey] ?? "").trim() : "";
  const description = descriptionKey ? String(row[descriptionKey] ?? "").trim() : "";
  if (history && description && canonical(history) !== canonical(description)) {
    return `${history} · ${description}`;
  }

  return pick(row, "description", mapping);
}

function normalizeRows(
  rows: Record<string, unknown>[],
  input: StatementParseInput,
  firstDataLine = 2,
) {
  const warnings: string[] = [];
  const transactions: NormalizedTransaction[] = [];
  rows.forEach((row, index) => {
    try {
      const date = pick(row, "date", input.mapping);
      const description = pickDescription(row, input.mapping);
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
        `Linha ${firstDataLine + index}: ${error instanceof Error ? error.message : "falha de leitura"}`,
      );
    }
  });
  return { transactions, warnings };
}

function rowHasAlias(row: readonly unknown[], aliasesToFind: readonly string[]) {
  return row.some((cell) =>
    aliasesToFind.some((alias) => canonical(String(cell ?? "")) === canonical(alias)),
  );
}

function isHeaderRow(row: readonly unknown[]) {
  return (
    rowHasAlias(row, aliases.date) &&
    rowHasAlias(row, aliases.amount) &&
    (rowHasAlias(row, aliases.description) || rowHasAlias(row, ["historico", "histórico"]))
  );
}

function rowsFromDelimitedText(text: string, delimiter: "," | ";") {
  const table = parseCsv(text, {
    columns: false,
    skip_empty_lines: false,
    delimiter,
    relax_column_count: true,
    trim: true,
  }) as unknown[][];
  const headerIndex = table.findIndex(isHeaderRow);
  if (headerIndex === -1) {
    return {
      rows: parseCsv(text, {
        columns: true,
        skip_empty_lines: true,
        delimiter,
        relax_column_count: true,
        trim: true,
      }) as Record<string, unknown>[],
      firstDataLine: 2,
      metadataRows: [] as unknown[][],
    };
  }

  const headerRow = table[headerIndex];
  if (!headerRow) throw new Error("Header row could not be read");
  const headers = headerRow.map((cell) => String(cell ?? "").trim());
  const rows = table
    .slice(headerIndex + 1)
    .filter((row) => row.some((cell) => String(cell ?? "").trim()))
    .map((row) =>
      Object.fromEntries(
        headers.flatMap((header, index) => (header ? [[header, row[index]]] : [])),
      ),
    );

  return {
    rows,
    firstDataLine: headerIndex + 2,
    metadataRows: table.slice(0, headerIndex),
  };
}

function parsePeriod(value: unknown) {
  const match = String(value ?? "").match(/(\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4})/i);
  if (!match) return undefined;
  return {
    start: parseStatementDate(match[1]).slice(0, 10),
    end: parseStatementDate(match[2]).slice(0, 10),
  };
}

function metadataFromRows(metadataRows: unknown[][]) {
  const metadata = new Map(
    metadataRows
      .map((row) => [canonical(String(row[0] ?? "")), row[1]] as const)
      .filter(([key]) => key),
  );
  const period = parsePeriod(metadata.get("periodo"));
  const accountNumber = String(metadata.get("conta") ?? "").trim();

  return {
    ...(period ? { period } : {}),
    ...(accountNumber
      ? { accountName: `Conta ${accountNumber}`, lastFour: accountNumber.slice(-4) }
      : {}),
  };
}

function detectDelimiter(text: string): "," | ";" {
  const sample = text.split(/\r?\n/).slice(0, 20);
  const semicolons = sample.reduce((total, line) => total + (line.match(/;/g)?.length ?? 0), 0);
  const commas = sample.reduce((total, line) => total + (line.match(/,/g)?.length ?? 0), 0);
  return semicolons > commas ? ";" : ",";
}

function result(
  input: StatementParseInput,
  rows: Record<string, unknown>[],
  key: string,
  options: {
    firstDataLine?: number;
    metadataRows?: unknown[][];
  } = {},
): ParsedStatement {
  const { transactions, warnings } = normalizeRows(rows, input, options.firstDataLine);
  const metadata = metadataFromRows(options.metadataRows ?? []);
  return {
    parserKey: key,
    parserVersion: "1.1.0",
    institution: input.institution,
    product: input.product,
    account: {
      currency: input.currency ?? "BRL",
      ...(metadata.accountName ? { name: metadata.accountName } : {}),
      ...(metadata.lastFour ? { lastFour: metadata.lastFour } : {}),
    },
    ...(metadata.period ? { period: metadata.period } : {}),
    transactions,
    rawRows: rows,
    warnings,
  };
}

export const csvStatementParser: StatementParser = {
  key: "delimited-csv",
  version: "1.1.0",
  formats: ["CSV"],
  supports: (input) =>
    input.filename.toLowerCase().endsWith(".csv") || input.contentType.includes("csv"),
  async parse(input) {
    const text = new TextDecoder("utf-8").decode(input.bytes).replace(/^\uFEFF/, "");
    const delimiter = detectDelimiter(text);
    const { rows, firstDataLine, metadataRows } = rowsFromDelimitedText(text, delimiter);
    return result(input, rows, this.key, { firstDataLine, metadataRows });
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
