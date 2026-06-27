import "server-only";

import { createNormalizedTransaction } from "./parser-utils";
import type { StatementParser } from "./statement-parser";

function tag(block: string, name: string) {
  const xml = block.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, "i"));
  if (xml) return xml[1]?.trim();
  return block.match(new RegExp(`<${name}>([^<\\r\\n]+)`, "i"))?.[1]?.trim();
}

function ofxDate(value: string) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
  if (!match) return value;
  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
}

export const ofxStatementParser: StatementParser = {
  key: "ofx-sgml-xml",
  version: "1.0.0",
  formats: ["OFX"],
  supports: (input) =>
    input.filename.toLowerCase().endsWith(".ofx") || input.contentType.includes("ofx"),
  async parse(input) {
    const text = new TextDecoder("utf-8").decode(input.bytes);
    const blocks = [
      ...text.matchAll(/<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST>))/gi),
    ].map((match) => match[1] ?? "");
    const currency = tag(text, "CURDEF") ?? input.currency ?? "BRL";
    const warnings: string[] = [];
    const transactions = blocks.flatMap((block, index) => {
      try {
        const amount = tag(block, "TRNAMT");
        const date = tag(block, "DTPOSTED");
        const description = tag(block, "MEMO") ?? tag(block, "NAME");
        if (!amount || !date || !description) throw new Error("OFX transaction is incomplete");
        return [
          createNormalizedTransaction({
            date: ofxDate(date),
            description,
            amount,
            externalId: tag(block, "FITID"),
            currency,
            product: input.product,
          }),
        ];
      } catch (error) {
        warnings.push(
          `Transação OFX ${index + 1}: ${error instanceof Error ? error.message : "falha"}`,
        );
        return [];
      }
    });
    return {
      parserKey: this.key,
      parserVersion: this.version,
      institution: input.institution,
      product: input.product,
      account: { currency, lastFour: tag(text, "ACCTID")?.slice(-4) },
      openingBalance: undefined,
      closingBalance: tag(text, "BALAMT"),
      transactions,
      rawRows: blocks.map((block) => ({ block })),
      warnings,
    };
  },
};
