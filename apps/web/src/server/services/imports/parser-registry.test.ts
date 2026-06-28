import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseStatement } from "./parser-registry";
import { parsePdfText } from "./pdf-parser";

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

describe("C6 account CSV with metadata preamble and split amount columns", () => {
  it("mantém o layout específico do C6 isolado por banco", async () => {
    const bytes = await readFile(
      fileURLToPath(new URL("./__fixtures__/c6-account-with-preamble.csv", import.meta.url)),
    );
    const parsed = await parseStatement({
      bytes,
      filename: "c6-account-with-preamble.csv",
      contentType: "text/csv",
      institution: "c6",
      product: "ACCOUNT",
    });

    expect(parsed.parserKey).toBe("delimited-csv:c6-account");
    expect(parsed.warnings).toEqual([]);
    expect(parsed.transactions).toHaveLength(6);
    expect(parsed.account).toMatchObject({ name: "Conta 396063489", lastFour: "3489" });
    expect(parsed.period).toEqual({ start: "2026-01-01", end: "2026-06-27" });
    expect(parsed.transactions[0]).toMatchObject({
      description: "SEGURO CONTA C6 · Seguro Conta",
      direction: "DEBIT",
      amount: "10.00",
    });
    expect(parsed.transactions[1]).toMatchObject({
      direction: "CREDIT",
      amount: "3555.00",
    });
    expect(parsed.transactions[2]).toMatchObject({
      description: "PGTO FAT CARTAO C6 · Fatura de cartao",
      nature: "CARD_PAYMENT",
      direction: "DEBIT",
      amount: "3554.76",
    });
    expect(parsed.transactions[4]).toMatchObject({
      description: "Aplicação · CDB C6 LIM.GARANT.",
      nature: "INVESTMENT_CONTRIBUTION",
      direction: "DEBIT",
      amount: "4000.00",
    });
    expect(parsed.transactions[5]).toMatchObject({
      description: "Resgate · CDB C6 LIM. GARANT.",
      nature: "INVESTMENT_REDEMPTION",
      direction: "CREDIT",
      amount: "110.09",
    });
  });
});

describe("Inter credit card PDF text", () => {
  it("reconhece linhas com meses por extenso, cartões adicionais e créditos", async () => {
    const bytes = await readFile(
      fileURLToPath(new URL("./__fixtures__/inter-card-pdf-text.txt", import.meta.url)),
    );
    const parsed = parsePdfText({
      text: new TextDecoder("utf-8").decode(bytes),
      institution: "inter",
      product: "CREDIT_CARD",
    });

    expect(parsed.warnings).toEqual([]);
    expect(parsed.product).toBe("CREDIT_CARD");
    expect(parsed.transactions).toHaveLength(20);
    expect(parsed.rawRows[0]).toMatchObject({ cardLastFour: "5527" });
    expect(parsed.rawRows[1]).toMatchObject({ cardLastFour: "7757" });
    expect(parsed.rawRows.at(-1)).toMatchObject({ cardLastFour: "8466" });
    expect(parsed.transactions[0]).toMatchObject({
      occurredAt: "2025-12-21T03:00:00.000Z",
      direction: "CREDIT",
      nature: "CARD_PAYMENT",
      amount: "3006.11",
    });
    expect(parsed.transactions[1]).toMatchObject({
      occurredAt: "2025-09-02T03:00:00.000Z",
      direction: "DEBIT",
      nature: "CONSUMPTION",
      installmentNumber: 5,
      totalInstallments: 12,
      amount: "175.00",
    });
    expect(parsed.transactions[4]).toMatchObject({
      description: "APPLE.COM/BILL",
      direction: "CREDIT",
      nature: "REFUND",
      amount: "3.65",
    });
    expect(parsed.transactions[18]).toMatchObject({
      description: "IOF INTERNACIONAL",
      nature: "INTEREST_FEE",
      amount: "1.98",
    });
  });

  it("detecta fatura Inter em PDF mesmo quando instituição e produto selecionados estão errados", async () => {
    const bytes = await readFile(
      fileURLToPath(new URL("./__fixtures__/inter-card-pdf-text.txt", import.meta.url)),
    );
    const parsed = parsePdfText({
      text: new TextDecoder("utf-8").decode(bytes),
      institution: "nubank",
      product: "ACCOUNT",
    });

    expect(parsed.warnings).toEqual([]);
    expect(parsed.institution).toBe("inter");
    expect(parsed.product).toBe("CREDIT_CARD");
    expect(parsed.transactions).toHaveLength(20);
    expect(parsed.transactions[0]).toMatchObject({
      direction: "CREDIT",
      nature: "CARD_PAYMENT",
    });
  });
});
