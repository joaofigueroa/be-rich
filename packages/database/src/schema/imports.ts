import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { workspaces } from "./core";
import { creditCardBills, financialAccounts, institutions } from "./finance";

export const importStatusEnum = pgEnum("import_status", [
  "UPLOADED",
  "PARSING",
  "REVIEW",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);
export const importFormatEnum = pgEnum("import_format", ["CSV", "XLSX", "OFX", "PDF"]);
export const importProductEnum = pgEnum("import_product", ["ACCOUNT", "CREDIT_CARD"]);

const uuidV7 = (name: string) => uuid(name).default(sql`uuid_generate_v7()`).primaryKey();

export const importBatches = pgTable(
  "import_batches",
  {
    id: uuidV7("id"),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => financialAccounts.id, { onDelete: "set null" }),
    creditCardBillId: uuid("credit_card_bill_id").references(() => creditCardBills.id, {
      onDelete: "set null",
    }),
    institutionId: uuid("institution_id").references(() => institutions.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    filename: text("filename").notNull(),
    fileHash: text("file_hash").notNull(),
    format: importFormatEnum("format").notNull(),
    product: importProductEnum("product").notNull(),
    parserKey: text("parser_key").notNull(),
    parserVersion: text("parser_version").notNull(),
    status: importStatusEnum("status").default("UPLOADED").notNull(),
    workflowRunId: text("workflow_run_id"),
    totalRows: integer("total_rows").default(0).notNull(),
    validRows: integer("valid_rows").default(0).notNull(),
    duplicateRows: integer("duplicate_rows").default(0).notNull(),
    importedRows: integer("imported_rows").default(0).notNull(),
    warnings: jsonb("warnings").$type<string[]>().default([]).notNull(),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("import_batches_workspace_id_idx").on(table.workspaceId),
    index("import_batches_account_id_idx").on(table.accountId),
    index("import_batches_credit_card_bill_id_idx").on(table.creditCardBillId),
    index("import_batches_institution_id_idx").on(table.institutionId),
    index("import_batches_created_by_idx").on(table.createdBy),
    uniqueIndex("import_batches_workspace_file_hash_idx").on(table.workspaceId, table.fileHash),
  ],
);

export const importRows = pgTable(
  "import_rows",
  {
    id: uuidV7("id"),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => importBatches.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    raw: jsonb("raw").$type<Record<string, unknown>>().notNull(),
    normalized: jsonb("normalized").$type<Record<string, unknown>>(),
    fingerprint: text("fingerprint"),
    validationErrors: jsonb("validation_errors").$type<string[]>().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("import_rows_batch_row_idx").on(table.batchId, table.rowNumber),
    index("import_rows_batch_id_idx").on(table.batchId),
  ],
);

export const syncRuns = pgTable(
  "sync_runs",
  {
    id: uuidV7("id"),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    externalConnectionId: text("external_connection_id"),
    status: text("status").notNull(),
    cursor: text("cursor"),
    stats: jsonb("stats").$type<Record<string, number>>().default({}).notNull(),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [index("sync_runs_workspace_id_idx").on(table.workspaceId)],
);
