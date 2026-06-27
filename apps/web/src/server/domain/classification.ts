import { z } from "zod";

export const CategoryCandidateSchema = z.object({
  categoryId: z.string(),
  name: z.string(),
  parentName: z.string().optional(),
});

export const ClassificationResultSchema = z.object({
  categoryId: z.string(),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(240),
});

export type ClassificationRule = {
  categoryId: string;
  field: "description" | "merchant";
  operator: "CONTAINS" | "EQUALS" | "STARTS_WITH" | "REGEX";
  value: string;
  priority: number;
};

export function matchRule(input: {
  description: string;
  merchant?: string;
  rules: ClassificationRule[];
}) {
  for (const rule of [...input.rules].sort((a, b) => a.priority - b.priority)) {
    const candidate = (rule.field === "merchant" ? input.merchant : input.description) ?? "";
    const left = candidate.toLocaleUpperCase("pt-BR");
    const right = rule.value.toLocaleUpperCase("pt-BR");
    const matched =
      rule.operator === "CONTAINS"
        ? left.includes(right)
        : rule.operator === "EQUALS"
          ? left === right
          : rule.operator === "STARTS_WITH"
            ? left.startsWith(right)
            : safeRegex(rule.value).test(candidate);
    if (matched) return rule.categoryId;
  }
  return null;
}

function safeRegex(pattern: string) {
  try {
    return new RegExp(pattern, "iu");
  } catch {
    return /$a/;
  }
}

export function classificationReviewStatus(confidence: number, threshold = 0.85) {
  return confidence >= threshold ? "NOT_REQUIRED" : "PENDING";
}
