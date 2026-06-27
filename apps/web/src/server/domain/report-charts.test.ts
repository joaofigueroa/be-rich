import { describe, expect, it } from "vitest";
import { buildReportChartData } from "./report-charts";

describe("buildReportChartData", () => {
  it("groups the timeline by month and consumption by category", () => {
    const data = buildReportChartData([
      {
        occurredAt: new Date("2026-01-05T12:00:00.000Z"),
        postedAt: new Date("2026-01-05T12:00:00.000Z"),
        direction: "CREDIT",
        nature: "INCOME",
        amountInBase: "5000.00",
        category: "Salário",
      },
      {
        occurredAt: new Date("2026-01-10T12:00:00.000Z"),
        postedAt: new Date("2026-01-10T12:00:00.000Z"),
        direction: "DEBIT",
        nature: "CONSUMPTION",
        amountInBase: "750.50",
        category: "Alimentação",
      },
      {
        occurredAt: new Date("2026-02-02T12:00:00.000Z"),
        postedAt: new Date("2026-02-02T12:00:00.000Z"),
        direction: "DEBIT",
        nature: "CONSUMPTION",
        amountInBase: "249.50",
        category: "Alimentação",
      },
    ]);

    expect(data.timeline).toEqual([
      { period: "jan. de 26", income: 5000, consumption: 750.5, cashFlow: 4249.5 },
      { period: "fev. de 26", income: 0, consumption: 249.5, cashFlow: -249.5 },
    ]);
    expect(data.categories).toEqual([{ category: "Alimentação", amount: 1000 }]);
  });

  it("não duplica no caixa as compras presentes na fatura", () => {
    const data = buildReportChartData([
      {
        occurredAt: new Date("2026-01-10T00:00:00.000Z"),
        postedAt: new Date("2026-01-10T00:00:00.000Z"),
        direction: "DEBIT",
        nature: "CONSUMPTION",
        amountInBase: "500",
        category: "Mercado",
        accountType: "CREDIT_CARD",
      },
      {
        occurredAt: new Date("2026-01-20T00:00:00.000Z"),
        postedAt: new Date("2026-01-20T00:00:00.000Z"),
        direction: "DEBIT",
        nature: "CARD_PAYMENT",
        amountInBase: "500",
        category: null,
        accountType: "CHECKING",
      },
    ]);
    expect(data.timeline[0]).toMatchObject({ consumption: 500, cashFlow: -500 });
  });
});
