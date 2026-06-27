import { z } from "zod";
import { decimal, money, signedAmount, sum } from "./money";

export const LedgerEntrySchema = z.object({
  amountInBase: z.string(),
  direction: z.enum(["CREDIT", "DEBIT"]),
  accountType: z
    .enum(["CHECKING", "SAVINGS", "PAYMENT", "CREDIT_CARD", "INVESTMENT", "CASH", "DEBT"])
    .optional(),
  billId: z.string().nullable().optional(),
  nature: z.enum([
    "INCOME",
    "CONSUMPTION",
    "OWN_TRANSFER",
    "CARD_PAYMENT",
    "INVESTMENT_CONTRIBUTION",
    "INVESTMENT_REDEMPTION",
    "DEBT_PRINCIPAL",
    "INTEREST_FEE",
    "REFUND",
    "ADJUSTMENT",
  ]),
});

export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

export function calculateReportTotals(entries: LedgerEntry[]) {
  const income = sum(
    entries.filter((entry) => entry.nature === "INCOME").map((entry) => entry.amountInBase),
  );
  const consumption = sum(
    entries.filter((entry) => entry.nature === "CONSUMPTION").map((entry) => entry.amountInBase),
  );
  const fees = sum(
    entries.filter((entry) => entry.nature === "INTEREST_FEE").map((entry) => entry.amountInBase),
  );
  const refunds = sum(
    entries.filter((entry) => entry.nature === "REFUND").map((entry) => entry.amountInBase),
  );
  const cashFlow = sum(
    entries
      .filter((entry) => !entry.billId && entry.accountType !== "CREDIT_CARD")
      .map((entry) => signedAmount(entry.direction, entry.amountInBase)),
  );

  return {
    income: money(income),
    consumption: money(consumption.minus(refunds)),
    fees: money(fees),
    refunds: money(refunds),
    cashFlow: money(cashFlow),
  };
}

export function calculateNetWorth(input: {
  cashAndAccounts: string[];
  investments: string[];
  openCardBills: string[];
  debts: string[];
}) {
  return money(
    sum(input.cashAndAccounts)
      .plus(sum(input.investments))
      .minus(sum(input.openCardBills))
      .minus(sum(input.debts)),
  );
}

export function convertCurrency(amount: string, rate: string) {
  return money(decimal(amount).mul(rate), 8);
}
