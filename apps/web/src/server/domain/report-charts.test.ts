import { describe, expect, it } from "vitest";
import { buildReportChartData } from "./report-charts";

describe("buildReportChartData", () => {
  it("groups the timeline by month and consumption by category", () => {
    const data = buildReportChartData([
      {
        id: "income-1",
        occurredAt: new Date("2026-01-05T12:00:00.000Z"),
        postedAt: new Date("2026-01-05T12:00:00.000Z"),
        direction: "CREDIT",
        nature: "INCOME",
        amountInBase: "5000.00",
        description: "Salário",
        account: "Nubank",
        institution: "Nubank",
        category: "Salário",
      },
      {
        id: "expense-1",
        occurredAt: new Date("2026-01-10T12:00:00.000Z"),
        postedAt: new Date("2026-01-10T12:00:00.000Z"),
        direction: "DEBIT",
        nature: "CONSUMPTION",
        amountInBase: "750.50",
        description: "Mercado",
        account: "Nubank",
        institution: "Nubank",
        category: "Alimentação",
      },
      {
        id: "expense-2",
        occurredAt: new Date("2026-02-02T12:00:00.000Z"),
        postedAt: new Date("2026-02-02T12:00:00.000Z"),
        direction: "DEBIT",
        nature: "CONSUMPTION",
        amountInBase: "249.50",
        description: "Feira",
        account: "Nubank",
        institution: "Nubank",
        category: "Alimentação",
      },
    ]);

    expect(data.timeline).toEqual([
      { period: "jan. de 26", income: 5000, consumption: 750.5, cashFlow: 4249.5 },
      { period: "fev. de 26", income: 0, consumption: 249.5, cashFlow: -249.5 },
    ]);
    expect(data.categories).toEqual([{ category: "Alimentação", amount: 1000 }]);
    expect(data.categoryDetails.find((detail) => detail.category === "Alimentação")).toMatchObject({
      transactions: [
        { id: "expense-2", description: "Feira", amountInBase: "249.50" },
        { id: "expense-1", description: "Mercado", amountInBase: "750.50" },
      ],
    });
  });

  it("não duplica no caixa as compras presentes na fatura", () => {
    const data = buildReportChartData([
      {
        id: "card-1",
        occurredAt: new Date("2026-01-10T00:00:00.000Z"),
        postedAt: new Date("2026-01-10T00:00:00.000Z"),
        direction: "DEBIT",
        nature: "CONSUMPTION",
        amountInBase: "500",
        description: "Mercado",
        account: "Nubank",
        institution: "Nubank",
        category: "Mercado",
        billId: "bill-1",
        accountType: "PAYMENT",
      },
      {
        id: "payment-1",
        occurredAt: new Date("2026-01-20T00:00:00.000Z"),
        postedAt: new Date("2026-01-20T00:00:00.000Z"),
        direction: "DEBIT",
        nature: "CARD_PAYMENT",
        amountInBase: "500",
        description: "Pagamento de fatura",
        account: "Nubank",
        institution: "Nubank",
        category: null,
        accountType: "CHECKING",
      },
    ]);
    expect(data.timeline[0]).toMatchObject({ consumption: 500, cashFlow: -500 });
  });
});
