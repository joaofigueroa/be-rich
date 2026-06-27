import { describe, expect, it } from "vitest";
import { categoryTypeForNature } from "./transaction-edit";

describe("transaction editing", () => {
  it("associa receitas e consumo às taxonomias compatíveis", () => {
    expect(categoryTypeForNature("INCOME")).toBe("INCOME");
    expect(categoryTypeForNature("CONSUMPTION")).toBe("EXPENSE");
  });

  it("não associa categorias a naturezas de movimentação financeira", () => {
    expect(categoryTypeForNature("OWN_TRANSFER")).toBeNull();
    expect(categoryTypeForNature("CARD_PAYMENT")).toBeNull();
    expect(categoryTypeForNature("INVESTMENT_CONTRIBUTION")).toBeNull();
  });
});
