import "server-only";

import { parse as parseCsv } from "csv-parse/sync";
import ExcelJS from "exceljs";
import type { NormalizedTransaction } from "@/types/financial";
import { createNormalizedTransaction, parseMoney, parseStatementDate } from "./parser-utils";
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

function isC6AccountHeaderRow(row: readonly unknown[]) {
  return (
    rowHasAlias(row, ["data lancamento"]) &&
    rowHasAlias(row, ["data contabil"]) &&
    rowHasAlias(row, ["titulo"]) &&
    rowHasAlias(row, ["entrada(r$)", "entrada"]) &&
    rowHasAlias(row, ["saida(r$)", "saida"])
  );
}

function c6AccountMetadataFromRows(metadataRows: unknown[][]) {
  const metadataText = metadataRows
    .map((row) => row.map((cell) => String(cell ?? "")).join(" "))
    .join("\n");
  const accountMatch = metadataText.match(/Conta:\s*([0-9.-]+)/i);
  const periodMatch = metadataText.match(
    /Extrato\s+de\s+(\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4})/i,
  );

  return {
    ...(accountMatch?.[1]
      ? {
          accountName: `Conta ${accountMatch[1]}`,
          lastFour: accountMatch[1].replace(/\D/g, "").slice(-4),
        }
      : {}),
    ...(periodMatch?.[1] && periodMatch?.[2]
      ? {
          period: {
            start: parseStatementDate(periodMatch[1]).slice(0, 10),
            end: parseStatementDate(periodMatch[2]).slice(0, 10),
          },
        }
      : {}),
  };
}

function c6Description(row: Record<string, unknown>, direction: "CREDIT" | "DEBIT") {
  const titleKey = findKey(row, ["titulo", "título"]);
  const descriptionKey = findKey(row, ["descricao", "descrição"]);
  const title = titleKey ? String(row[titleKey] ?? "").trim() : "";
  const description = descriptionKey ? String(row[descriptionKey] ?? "").trim() : "";
  const base =
    title && description && canonical(title) !== canonical(description)
      ? `${title} · ${description}`
      : title || description;

  if (/^CDB\b/i.test(base)) {
    return direction === "CREDIT" ? `Resgate · ${base}` : `Aplicação · ${base}`;
  }
  return base;
}

function parseC6AccountRows(
  rows: Record<string, unknown>[],
  input: StatementParseInput,
  firstDataLine: number,
) {
  const warnings: string[] = [];
  const transactions: NormalizedTransaction[] = [];

  rows.forEach((row, index) => {
    try {
      const date = pick(row, "date", input.mapping);
      const postedDate = pick(row, "postedDate", input.mapping);
      const entradaKey = findKey(row, ["entrada(r$)", "entrada"]);
      const saidaKey = findKey(row, ["saida(r$)", "saída(r$)", "saida", "saída"]);
      const entrada = parseMoney(entradaKey ? row[entradaKey] : 0);
      const saida = parseMoney(saidaKey ? row[saidaKey] : 0);
      const direction = entrada.gt(0) ? "CREDIT" : "DEBIT";
      const amount = entrada.gt(0) ? entrada : saida;
      const description = c6Description(row, direction);

      if (date === undefined || !description || amount.lte(0)) {
        throw new Error("Required C6 columns were not detected");
      }
      transactions.push(
        createNormalizedTransaction({
          date,
          postedDate,
          description,
          amount: amount.toFixed(2),
          currency: input.currency ?? "BRL",
          product: input.product,
          direction,
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

function parseC6AccountStatement(
  input: StatementParseInput,
  text: string,
  delimiter: "," | ";",
): ParsedStatement | null {
  if (input.institution !== "c6" || input.product !== "ACCOUNT") return null;
  const table = parseCsv(text, {
    columns: false,
    skip_empty_lines: false,
    delimiter,
    relax_column_count: true,
    trim: true,
  }) as unknown[][];
  const headerIndex = table.findIndex(isC6AccountHeaderRow);
  if (headerIndex === -1) return null;
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
  const firstDataLine = headerIndex + 2;
  const { transactions, warnings } = parseC6AccountRows(rows, input, firstDataLine);
  const metadata = c6AccountMetadataFromRows(table.slice(0, headerIndex));

  return {
    parserKey: "delimited-csv:c6-account",
    parserVersion: "1.2.0",
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
    const c6AccountStatement = parseC6AccountStatement(input, text, delimiter);
    if (c6AccountStatement) return c6AccountStatement;
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
