export const TRANSACTION_NATURES = [
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
] as const;

export type TransactionNature = (typeof TRANSACTION_NATURES)[number];

export function categoryTypeForNature(nature: TransactionNature) {
  if (nature === "INCOME") return "INCOME" as const;
  if (
    nature === "CONSUMPTION" ||
    nature === "INVESTMENT_CONTRIBUTION" ||
    nature === "INVESTMENT_REDEMPTION"
  ) {
    return "EXPENSE" as const;
  }
  return null;
}

export function natureRequiresCategory(nature: TransactionNature) {
  return categoryTypeForNature(nature) !== null;
}

export function reviewStatusForNature(nature: TransactionNature, categoryId: string | null) {
  if (!natureRequiresCategory(nature)) return "NOT_REQUIRED" as const;
  return categoryId ? ("CONFIRMED" as const) : ("PENDING" as const);
}
