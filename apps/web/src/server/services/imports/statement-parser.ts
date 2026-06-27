import "server-only";

import { z } from "zod";
import type { NormalizedTransaction } from "@/types/financial";

export const StatementFormatSchema = z.enum(["CSV", "XLSX", "OFX", "PDF"]);
export const StatementProductSchema = z.enum(["ACCOUNT", "CREDIT_CARD"]);
export const InstitutionSlugSchema = z.enum(["nubank", "inter", "c6", "mercado-pago", "generic"]);

export type StatementFormat = z.infer<typeof StatementFormatSchema>;
export type StatementProduct = z.infer<typeof StatementProductSchema>;
export type InstitutionSlug = z.infer<typeof InstitutionSlugSchema>;

export type StatementParseInput = {
  bytes: Uint8Array;
  filename: string;
  contentType: string;
  institution: InstitutionSlug;
  product: StatementProduct;
  password?: string;
  currency?: string;
  mapping?: Record<string, string>;
};

export type ParsedStatement = {
  parserKey: string;
  parserVersion: string;
  institution: InstitutionSlug;
  product: StatementProduct;
  account: {
    name?: string;
    lastFour?: string;
    currency: string;
  };
  period?: { start: string; end: string };
  openingBalance?: string;
  closingBalance?: string;
  transactions: NormalizedTransaction[];
  rawRows: Record<string, unknown>[];
  warnings: string[];
};

export type StatementParser = {
  key: string;
  version: string;
  formats: StatementFormat[];
  supports(input: StatementParseInput): boolean;
  parse(input: StatementParseInput): Promise<ParsedStatement>;
};
