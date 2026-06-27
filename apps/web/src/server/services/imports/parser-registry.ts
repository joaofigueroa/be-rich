import "server-only";

import { csvStatementParser, xlsxStatementParser } from "./delimited-parser";
import { ofxStatementParser } from "./ofx-parser";
import { pdfStatementParser } from "./pdf-parser";
import type { StatementParseInput } from "./statement-parser";

const parsers = [csvStatementParser, xlsxStatementParser, ofxStatementParser, pdfStatementParser];

export async function parseStatement(input: StatementParseInput) {
  const parser = parsers.find((candidate) => candidate.supports(input));
  if (!parser) throw new Error("Unsupported statement format");
  const result = await parser.parse(input);
  if (result.rawRows.length > 10_000) throw new Error("The statement exceeds the 10,000 row limit");
  return result;
}

export function listSupportedStatementFormats() {
  return ["CSV", "XLSX", "OFX", "PDF"] as const;
}
