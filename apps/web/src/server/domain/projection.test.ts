import { describe, expect, it } from "vitest";
import { expandRecurrence, projectCash } from "./projection";

describe("projection", () => {
  it("expande recorrências e aplica eventos em ordem", () => {
    const recurring = expandRecurrence({
      startDate: "2026-01-05",
      horizonEnd: "2026-03-05",
      frequency: "MONTHLY",
      amount: "100",
      direction: "DEBIT",
      label: "Internet",
    });
    expect(recurring).toHaveLength(3);
    const result = projectCash({
      openingBalance: "1000",
      startDate: "2026-01-01",
      months: 3,
      knownEvents: recurring,
    });
    expect(result.at(-1)?.projectedBalance).toBe("700.00");
  });
});
