import { describe, expect, it } from "vitest";
import { fallbackDates } from "./ptax-service";

describe("PTAX fallback", () => {
  it("procura dias anteriores para fins de semana e feriados", () => {
    const dates = fallbackDates(new Date("2026-06-28T12:00:00Z"), 3);
    expect(dates.map((date) => date.toISOString().slice(0, 10))).toEqual([
      "2026-06-28",
      "2026-06-27",
      "2026-06-26",
    ]);
  });
});
