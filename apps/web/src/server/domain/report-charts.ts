import Decimal from "decimal.js";

type ReportChartRow = {
  occurredAt: Date;
  postedAt: Date;
  direction: "CREDIT" | "DEBIT";
  nature: string;
  amountInBase: string;
  billId?: string | null;
  accountType?: string;
  category: string | null;
};

export type ReportChartData = ReturnType<typeof buildReportChartData>;

export function buildReportChartData(
  rows: ReportChartRow[],
  dateBasis: "OCCURRED" | "POSTED" = "OCCURRED",
) {
  const timeline = new Map<
    string,
    { period: string; income: Decimal; consumption: Decimal; cashFlow: Decimal }
  >();
  const categories = new Map<string, Decimal>();

  for (const row of rows) {
    const chartDate = dateBasis === "OCCURRED" ? row.occurredAt : row.postedAt;
    const monthKey = chartDate.toISOString().slice(0, 7);
    const current = timeline.get(monthKey) ?? {
      period: new Intl.DateTimeFormat("pt-BR", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }).format(chartDate),
      income: new Decimal(0),
      consumption: new Decimal(0),
      cashFlow: new Decimal(0),
    };
    const amount = new Decimal(row.amountInBase);
    if (!row.billId && row.accountType !== "CREDIT_CARD") {
      current.cashFlow = current.cashFlow.plus(
        row.direction === "CREDIT" ? amount : amount.negated(),
      );
    }
    if (row.nature === "INCOME") current.income = current.income.plus(amount);
    if (row.nature === "CONSUMPTION") {
      current.consumption = current.consumption.plus(amount);
      const category = row.category ?? "Sem categoria";
      categories.set(category, (categories.get(category) ?? new Decimal(0)).plus(amount));
    }
    timeline.set(monthKey, current);
  }

  return {
    timeline: [...timeline.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, point]) => ({
        period: point.period,
        income: point.income.toNumber(),
        consumption: point.consumption.toNumber(),
        cashFlow: point.cashFlow.toNumber(),
      })),
    categories: [...categories.entries()]
      .sort(([, left], [, right]) => right.comparedTo(left))
      .slice(0, 8)
      .map(([category, amount]) => ({ category, amount: amount.toNumber() })),
  };
}
