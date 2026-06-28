import { describe, expect, it } from "vitest";
import { classificationReviewStatus, inferCategoryFromHistory, matchRule } from "./classification";

describe("classification", () => {
  it("prioriza regras confirmadas", () => {
    expect(
      matchRule({
        description: "COMPRA IFOOD 123",
        rules: [
          {
            categoryId: "food",
            field: "description",
            operator: "CONTAINS",
            value: "IFOOD",
            priority: 1,
          },
        ],
      }),
    ).toBe("food");
  });

  it("exige revisão abaixo de 0,85", () => {
    expect(classificationReviewStatus(0.849)).toBe("PENDING");
    expect(classificationReviewStatus(0.85)).toBe("NOT_REQUIRED");
  });

  it("aprende com histórico já confirmado do workspace", () => {
    expect(
      inferCategoryFromHistory([
        {
          categoryId: "delivery",
          classificationSource: "MANUAL",
          reviewStatus: "CONFIRMED",
        },
      ]),
    ).toMatchObject({
      categoryId: "delivery",
      usedManualExamples: true,
    });
  });

  it("mantém pendente quando o histórico é ambíguo", () => {
    expect(
      inferCategoryFromHistory([
        {
          categoryId: "mercado",
          classificationSource: "AI",
          reviewStatus: "NOT_REQUIRED",
        },
        {
          categoryId: "restaurante",
          classificationSource: "AI",
          reviewStatus: "NOT_REQUIRED",
        },
      ]),
    ).toBeNull();
  });
});
