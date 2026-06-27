import Decimal from "decimal.js";
import { z } from "zod";

export const DecimalStringSchema = z.string().regex(/^-?\d+(\.\d+)?$/);

export function decimal(value: Decimal.Value) {
  return new Decimal(value);
}

export function money(value: Decimal.Value, scale = 2) {
  return decimal(value).toDecimalPlaces(scale, Decimal.ROUND_HALF_EVEN).toFixed(scale);
}

export function sum(values: Decimal.Value[]) {
  return values.reduce<Decimal>((total, value) => total.plus(value), new Decimal(0));
}

export function assertExactSplit(total: Decimal.Value, parts: Decimal.Value[]) {
  const difference = sum(parts).minus(total);
  if (!difference.isZero()) {
    throw new Error(`O rateio difere do total em ${money(difference.abs(), 8)}`);
  }
}

export function signedAmount(direction: "CREDIT" | "DEBIT", value: Decimal.Value) {
  const amount = decimal(value).abs();
  return direction === "CREDIT" ? amount : amount.negated();
}
