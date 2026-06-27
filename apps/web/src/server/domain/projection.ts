import { addMonths, addWeeks, addYears, isAfter, isBefore, parseISO } from "date-fns";
import { z } from "zod";
import { decimal, money } from "./money";

export const ProjectionEventSchema = z.object({
  date: z.iso.date(),
  amount: z.string(),
  direction: z.enum(["CREDIT", "DEBIT"]),
  label: z.string(),
});

export type ProjectionEvent = z.infer<typeof ProjectionEventSchema>;

export function projectCash(input: {
  openingBalance: string;
  startDate: string;
  months: 1 | 3 | 6 | 12;
  knownEvents: ProjectionEvent[];
}) {
  const start = parseISO(input.startDate);
  const end = addMonths(start, input.months);
  const events = input.knownEvents
    .filter(
      (event) => !isBefore(parseISO(event.date), start) && isBefore(parseISO(event.date), end),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  let balance = decimal(input.openingBalance);
  return events.map((event) => {
    balance =
      event.direction === "CREDIT" ? balance.plus(event.amount) : balance.minus(event.amount);
    return { ...event, projectedBalance: money(balance) };
  });
}

export function expandRecurrence(input: {
  startDate: string;
  endDate?: string;
  horizonEnd: string;
  frequency: "WEEKLY" | "MONTHLY" | "YEARLY";
  interval?: number;
  amount: string;
  direction: "CREDIT" | "DEBIT";
  label: string;
}) {
  const hardEnd = parseISO(input.horizonEnd);
  const configuredEnd = input.endDate ? parseISO(input.endDate) : hardEnd;
  const end = isBefore(configuredEnd, hardEnd) ? configuredEnd : hardEnd;
  const interval = Math.max(1, input.interval ?? 1);
  const events: ProjectionEvent[] = [];
  let cursor = parseISO(input.startDate);
  while (!isAfter(cursor, end)) {
    events.push({
      date: cursor.toISOString().slice(0, 10),
      amount: input.amount,
      direction: input.direction,
      label: input.label,
    });
    cursor =
      input.frequency === "WEEKLY"
        ? addWeeks(cursor, interval)
        : input.frequency === "MONTHLY"
          ? addMonths(cursor, interval)
          : addYears(cursor, interval);
  }
  return events;
}
