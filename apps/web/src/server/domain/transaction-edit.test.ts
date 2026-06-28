import { describe, expect, it } from "vitest";
import { categoryTypeForNature, reviewStatusForNature } from "./transaction-edit";

describe("transaction editing", () => {
  it("associa receitas, consumo e movimentações de investimento às taxonomias compatíveis", () => {
    expect(categoryTypeForNature("INCOME")).toBe("INCOME");
    expect(categoryTypeForNature("CONSUMPTION")).toBe("EXPENSE");
    expect(categoryTypeForNature("INVESTMENT_CONTRIBUTION")).toBe("EXPENSE");
    expect(categoryTypeForNature("INVESTMENT_REDEMPTION")).toBe("EXPENSE");
  });

  it("não associa categorias a naturezas de movimentação financeira", () => {
    expect(categoryTypeForNature("OWN_TRANSFER")).toBeNull();
    expect(categoryTypeForNature("CARD_PAYMENT")).toBeNull();
  });

  it("não deixa movimentações financeiras sem categoria marcadas como pendentes", () => {
    expect(reviewStatusForNature("CARD_PAYMENT", null)).toBe("NOT_REQUIRED");
    expect(reviewStatusForNature("OWN_TRANSFER", null)).toBe("NOT_REQUIRED");
    expect(reviewStatusForNature("INTEREST_FEE", null)).toBe("NOT_REQUIRED");
    expect(reviewStatusForNature("CONSUMPTION", null)).toBe("PENDING");
  });
});
