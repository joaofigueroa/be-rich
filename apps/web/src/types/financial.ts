import { z } from "zod";

export const CurrencyCodeSchema = z.string().regex(/^[A-Z]{3}$/);
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

export const MoneySchema = z.object({
  amount: z.string().regex(/^-?\d+(\.\d{1,8})?$/),
  currency: CurrencyCodeSchema,
});
export type Money = z.infer<typeof MoneySchema>;

export const FxQuoteSchema = z.object({
  currency: CurrencyCodeSchema,
  baseCurrency: CurrencyCodeSchema,
  rate: z.string().regex(/^\d+(\.\d{1,12})?$/),
  source: z.enum(["BANK", "BCB_PTAX", "MANUAL"]),
  rateDate: z.iso.date(),
});
export type FxQuote = z.infer<typeof FxQuoteSchema>;

export const TransactionNatureSchema = z.enum([
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
]);
export type TransactionNature = z.infer<typeof TransactionNatureSchema>;

export const NormalizedTransactionSchema = z.object({
  externalId: z.string().min(1).optional(),
  occurredAt: z.iso.datetime(),
  postedAt: z.iso.datetime(),
  description: z.string().trim().min(1),
  merchant: z.string().trim().min(1).optional(),
  counterparty: z.string().trim().min(1).optional(),
  direction: z.enum(["CREDIT", "DEBIT"]),
  nature: TransactionNatureSchema,
  status: z.enum(["PENDING", "POSTED", "VOID"]).default("POSTED"),
  amount: z.string().regex(/^\d+(\.\d{1,8})?$/),
  currency: CurrencyCodeSchema.default("BRL"),
  amountInBase: z.string().regex(/^\d+(\.\d{1,8})?$/),
  fxRate: z
    .string()
    .regex(/^\d+(\.\d{1,12})?$/)
    .optional(),
  fxSource: z.enum(["BANK", "BCB_PTAX", "MANUAL"]).optional(),
  fxRateDate: z.iso.date().optional(),
  installmentNumber: z.number().int().positive().optional(),
  totalInstallments: z.number().int().positive().optional(),
  installmentGroup: z.string().optional(),
});
export type NormalizedTransaction = z.infer<typeof NormalizedTransactionSchema>;

export const ReportQuerySchema = z.object({
  workspaceIds: z.array(z.uuidv7()).min(1),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  accountIds: z.array(z.uuidv7()).optional(),
  categoryIds: z.array(z.uuidv7()).optional(),
  displayCurrency: CurrencyCodeSchema.default("BRL"),
  dateBasis: z.enum(["OCCURRED", "POSTED"]).default("OCCURRED"),
});
export type ReportQuery = z.infer<typeof ReportQuerySchema>;

export type FinancialDataProvider = {
  createConsent(input: {
    userId: string;
    institutionId: string;
    redirectUrl: string;
  }): Promise<{ consentId: string; redirectUrl: string }>;
  getConnectionStatus(
    connectionId: string,
  ): Promise<"PENDING" | "ACTIVE" | "ERROR" | "REVOKED" | "EXPIRED">;
  syncAccounts(connectionId: string): Promise<Array<Record<string, unknown>>>;
  syncTransactions(
    connectionId: string,
    cursor?: string,
  ): Promise<{ records: NormalizedTransaction[]; cursor?: string }>;
  syncInvestments(connectionId: string): Promise<Array<Record<string, unknown>>>;
  revokeConsent(connectionId: string): Promise<void>;
};
