import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseStatement } from "./parser-registry";

const fixtures = [
  ["nubank-account.csv", "nubank", "ACCOUNT"],
  ["inter-card.csv", "inter", "CREDIT_CARD"],
  ["c6-account.csv", "c6", "ACCOUNT"],
  ["mercado-pago-account.csv", "mercado-pago", "ACCOUNT"],
] as const;

describe("bank statement fixtures", () => {
  for (const [filename, institution, product] of fixtures) {
    it(`normaliza ${institution} ${product}`, async () => {
      const bytes = await readFile(
        fileURLToPath(new URL(`./__fixtures__/${filename}`, import.meta.url)),
      );
      const parsed = await parseStatement({
        bytes,
        filename,
        contentType: "text/csv",
        institution,
        product,
      });
      expect(parsed.transactions).toHaveLength(2);
      expect(parsed.warnings).toEqual([]);
      expect(
        parsed.transactions.every((transaction) => transaction.amountInBase === transaction.amount),
      ).toBe(true);
    });
  }
});
