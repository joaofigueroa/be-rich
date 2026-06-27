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

describe("Inter account CSV with metadata preamble", () => {
  it("detecta a tabela depois do cabeçalho do relatório", async () => {
    const bytes = await readFile(
      fileURLToPath(new URL("./__fixtures__/inter-account-with-preamble.csv", import.meta.url)),
    );
    const parsed = await parseStatement({
      bytes,
      filename: "inter-account-with-preamble.csv",
      contentType: "text/csv",
      institution: "inter",
      product: "ACCOUNT",
    });

    expect(parsed.warnings).toEqual([]);
    expect(parsed.transactions).toHaveLength(8);
    expect(parsed.account).toMatchObject({ name: "Conta 1234567", lastFour: "4567" });
    expect(parsed.period).toEqual({ start: "2026-01-01", end: "2026-01-31" });
    expect(parsed.transactions[0]?.occurredAt.slice(0, 10)).toBe("2026-01-27");
    expect(parsed.transactions[0]).toMatchObject({
      description: "Cashback · Marketplace exemplo - 00000000000000000...",
      direction: "CREDIT",
      amount: "223.96",
    });
    expect(parsed.transactions[2]).toMatchObject({
      description: "Aplicação · Cdb Porq Obj Banco Inter S A",
      direction: "DEBIT",
      nature: "INVESTMENT_CONTRIBUTION",
      amount: "1014.10",
    });
    expect(parsed.transactions[7]).toMatchObject({
      description: "Pagamento efetuado · Fatura cartão Inter",
      nature: "CARD_PAYMENT",
      amount: "2367.08",
    });
  });
});
