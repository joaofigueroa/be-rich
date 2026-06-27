import { describe, expect, it } from "vitest";
import {
  createNormalizedTransaction,
  sanitizeFinancialDescription,
  transactionFingerprint,
} from "./parser-utils";

describe("parser utilities", () => {
  it("sanitiza PII antes da classificação", () => {
    const sanitized = sanitizeFinancialDescription(
      "PIX joao@email.com CPF 123.456.789-00 AG 1234 CONTA 98765-4 +55 11 99999-8888",
    );
    expect(sanitized).not.toMatch(/joao|123\.456|99999/);
  });

  it("produz fingerprint estável", () => {
    const transaction = createNormalizedTransaction({
      date: "12/05/2026",
      description: "Mercado XPTO",
      amount: "-123,45",
      currency: "BRL",
      product: "ACCOUNT",
    });
    expect(transaction.direction).toBe("DEBIT");
    expect(transactionFingerprint(transaction)).toBe(transactionFingerprint(transaction));
  });
});
