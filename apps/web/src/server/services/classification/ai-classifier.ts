import "server-only";

import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  CategoryCandidateSchema,
  ClassificationResultSchema,
} from "@/server/domain/classification";
import { sanitizeFinancialDescription } from "@/server/services/imports/parser-utils";

const ClassifyInputSchema = z.object({
  description: z.string().min(1),
  institution: z.string().max(80),
  direction: z.enum(["CREDIT", "DEBIT"]),
  categories: z.array(CategoryCandidateSchema).min(1).max(200),
});

let openRouter: ReturnType<typeof createOpenRouter> | null = null;

function getOpenRouter() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured");
  openRouter ??= createOpenRouter({ apiKey });
  return openRouter;
}

export async function classifyWithAi(rawInput: z.input<typeof ClassifyInputSchema>) {
  const input = ClassifyInputSchema.parse(rawInput);
  const model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.5-flash-lite";
  const categoryIds = input.categories.map((category) => category.categoryId) as [
    string,
    ...string[],
  ];
  const outputSchema = ClassificationResultSchema.extend({
    categoryId: z.enum(categoryIds),
  });
  const { output } = await generateText({
    model: getOpenRouter()(model),
    output: Output.object({ schema: outputSchema }),
    maxOutputTokens: 300,
    maxRetries: 1,
    timeout: { totalMs: 30_000 },
    temperature: 0,
    system:
      "Você classifica lançamentos financeiros brasileiros. Escolha somente a subcategoria mais específica da taxonomia recebida. Não tente inferir dados pessoais removidos.",
    prompt: JSON.stringify({
      description: sanitizeFinancialDescription(input.description),
      institution: input.institution,
      direction: input.direction,
      taxonomy: input.categories,
    }),
  });
  return { ...output, model };
}
