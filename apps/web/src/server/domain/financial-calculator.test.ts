import { describe, expect, it } from "vitest";
import { calculateNetWorth, calculateReportTotals, convertCurrency } from "./financial-calculator";
import { assertExactSplit } from "./money";

describe("financial calculator", () => {
  it("não conta transferência e pagamento de fatura como consumo", () => {
    const totals = calculateReportTotals([
      { amountInBase: "10000", direction: "CREDIT", nature: "INCOME" },
      { amountInBase: "1250", direction: "DEBIT", nature: "CONSUMPTION" },
      { amountInBase: "1250", direction: "DEBIT", nature: "CARD_PAYMENT" },
      { amountInBase: "300", direction: "DEBIT", nature: "OWN_TRANSFER" },
      { amountInBase: "50", direction: "CREDIT", nature: "REFUND" },
    ]);
    expect(totals.consumption).toBe("1200.00");
    expect(totals.income).toBe("10000.00");
    expect(totals.cashFlow).toBe("7250.00");
  });

  it("conta compras do cartão no consumo, mas somente a quitação no fluxo de caixa", () => {
    const totals = calculateReportTotals([
      {
        amountInBase: "800",
        direction: "DEBIT",
        nature: "CONSUMPTION",
        accountType: "CREDIT_CARD",
      },
      {
        amountInBase: "800",
        direction: "DEBIT",
        nature: "CARD_PAYMENT",
        accountType: "CHECKING",
      },
    ]);
    expect(totals.consumption).toBe("800.00");
    expect(totals.cashFlow).toBe("-800.00");
  });

  it("calcula patrimônio líquido", () => {
    expect(
      calculateNetWorth({
        cashAndAccounts: ["1000", "250"],
        investments: ["5000"],
        openCardBills: ["600"],
        debts: ["1500"],
      }),
    ).toBe("4150.00");
  });

  it("usa decimal exato em conversões e rateios", () => {
    expect(convertCurrency("19.99", "5.12345678")).toBe("102.41790103");
    expect(() => assertExactSplit("100", ["60", "40"])).not.toThrow();
    expect(() => assertExactSplit("100", ["60", "39.99"])).toThrow(/rateio/i);
  });
});
