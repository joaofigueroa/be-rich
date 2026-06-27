import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { workspaces } from "./core";
import { categories, financialAccounts, investmentPositions, transactions } from "./finance";

export const goalStatusEnum = pgEnum("goal_status", ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"]);
export const goalAllocationModeEnum = pgEnum("goal_allocation_mode", ["PERCENTAGE", "FIXED"]);
export const recurrenceFrequencyEnum = pgEnum("recurrence_frequency", [
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
]);
export const recurrenceStatusEnum = pgEnum("recurrence_status", [
  "SUGGESTED",
  "ACTIVE",
  "PAUSED",
  "ARCHIVED",
]);

const uuidV7 = (name: string) => uuid(name).default(sql`uuid_generate_v7()`).primaryKey();
const money = (name: string) => numeric(name, { precision: 20, scale: 8 });
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const goals = pgTable(
  "goals",
  {
    id: uuidV7("id"),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    targetAmount: money("target_amount").notNull(),
    manualBalance: money("manual_balance").default("0").notNull(),
    currency: text("currency").default("BRL").notNull(),
    targetDate: date("target_date"),
    status: goalStatusEnum("status").default("ACTIVE").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    index("goals_workspace_id_idx").on(table.workspaceId),
    index("goals_created_by_idx").on(table.createdBy),
  ],
);

export const goalLinks = pgTable(
  "goal_links",
  {
    id: uuidV7("id"),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => financialAccounts.id, { onDelete: "cascade" }),
    positionId: uuid("position_id").references(() => investmentPositions.id, {
      onDelete: "cascade",
    }),
    mode: goalAllocationModeEnum("mode").notNull(),
    allocation: numeric("allocation", { precision: 20, scale: 8 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("goal_links_goal_id_idx").on(table.goalId),
    index("goal_links_account_id_idx").on(table.accountId),
    index("goal_links_position_id_idx").on(table.positionId),
  ],
);

export const goalEntries = pgTable(
  "goal_entries",
  {
    id: uuidV7("id"),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id").references(() => transactions.id, {
      onDelete: "set null",
    }),
    amount: money("amount").notNull(),
    currency: text("currency").notNull(),
    note: text("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("goal_entries_goal_id_idx").on(table.goalId),
    index("goal_entries_transaction_id_idx").on(table.transactionId),
    index("goal_entries_created_by_idx").on(table.createdBy),
  ],
);

export const budgetMonths = pgTable(
  "budget_months",
  {
    id: uuidV7("id"),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    month: date("month").notNull(),
    currency: text("currency").default("BRL").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("budget_months_workspace_month_idx").on(table.workspaceId, table.month),
    index("budget_months_created_by_idx").on(table.createdBy),
  ],
);

export const budgetAllocations = pgTable(
  "budget_allocations",
  {
    id: uuidV7("id"),
    budgetMonthId: uuid("budget_month_id")
      .notNull()
      .references(() => budgetMonths.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    amount: money("amount").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("budget_allocations_month_category_idx").on(table.budgetMonthId, table.categoryId),
    index("budget_allocations_category_id_idx").on(table.categoryId),
  ],
);

export const recurrences = pgTable(
  "recurrences",
  {
    id: uuidV7("id"),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => financialAccounts.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    descriptionPattern: text("description_pattern"),
    amount: money("amount").notNull(),
    currency: text("currency").notNull(),
    frequency: recurrenceFrequencyEnum("frequency").notNull(),
    interval: integer("interval").default(1).notNull(),
    dayOfWeek: integer("day_of_week"),
    dayOfMonth: integer("day_of_month"),
    monthOfYear: integer("month_of_year"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    status: recurrenceStatusEnum("status").default("SUGGESTED").notNull(),
    expectedDebit: boolean("expected_debit").default(true).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    index("recurrences_workspace_id_idx").on(table.workspaceId),
    index("recurrences_account_id_idx").on(table.accountId),
    index("recurrences_category_id_idx").on(table.categoryId),
    index("recurrences_created_by_idx").on(table.createdBy),
  ],
);
