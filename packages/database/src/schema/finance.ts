import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
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

export const financialAccountTypeEnum = pgEnum("financial_account_type", [
  "CHECKING",
  "SAVINGS",
  "PAYMENT",
  "CREDIT_CARD",
  "INVESTMENT",
  "CASH",
  "DEBT",
]);
export const dataOriginEnum = pgEnum("data_origin", [
  "MANUAL_IMPORT",
  "MANUAL_ENTRY",
  "OPEN_FINANCE",
]);
export const transactionDirectionEnum = pgEnum("transaction_direction", ["CREDIT", "DEBIT"]);
export const transactionNatureEnum = pgEnum("transaction_nature", [
  "INCOME",
  "CONSUMPTION",
  "OWN_TRANSFER",
  "CARD_PAYMENT",
  "INVESTMENT_CONTRIBUTION",
  "INVESTMENT_REDEMPTION",
  "DEBT_PRINCIPAL",
  "INTEREST_FEE",
  "REFUND",
  "ADJUSTMENT",
]);
export const transactionStatusEnum = pgEnum("transaction_status", ["PENDING", "POSTED", "VOID"]);
export const classificationSourceEnum = pgEnum("classification_source", [
  "RULE",
  "CACHE",
  "AI",
  "MANUAL",
  "NONE",
]);
export const reviewStatusEnum = pgEnum("review_status", ["NOT_REQUIRED", "PENDING", "CONFIRMED"]);
export const categoryTypeEnum = pgEnum("category_type", ["EXPENSE", "INCOME"]);
export const fxSourceEnum = pgEnum("fx_source", ["BANK", "BCB_PTAX", "MANUAL"]);
export const connectionStatusEnum = pgEnum("connection_status", [
  "PENDING",
  "ACTIVE",
  "ERROR",
  "REVOKED",
  "EXPIRED",
]);

const uuidV7 = (name: string) => uuid(name).default(sql`uuid_generate_v7()`).primaryKey();
const money = (name: string) => numeric(name, { precision: 20, scale: 8 });
const rate = (name: string) => numeric(name, { precision: 24, scale: 12 });
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const institutions = pgTable(
  "institutions",
  {
    id: uuidV7("id"),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    countryCode: text("country_code").default("BR").notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex("institutions_slug_idx").on(table.slug)],
);

export const financialConnections = pgTable(
  "financial_connections",
  {
    id: uuidV7("id"),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    institutionId: uuid("institution_id").references(() => institutions.id, {
      onDelete: "set null",
    }),
    provider: text("provider").notNull(),
    externalId: text("external_id").notNull(),
    status: connectionStatusEnum("status").default("PENDING").notNull(),
    consentExpiresAt: timestamp("consent_expires_at", { withTimezone: true }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("financial_connections_provider_external_idx").on(table.provider, table.externalId),
    index("financial_connections_workspace_id_idx").on(table.workspaceId),
    index("financial_connections_institution_id_idx").on(table.institutionId),
  ],
);

export const financialAccounts = pgTable(
  "financial_accounts",
  {
    id: uuidV7("id"),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    institutionId: uuid("institution_id").references(() => institutions.id, {
      onDelete: "set null",
    }),
    connectionId: uuid("connection_id").references(() => financialConnections.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    type: financialAccountTypeEnum("type").notNull(),
    currency: text("currency").default("BRL").notNull(),
    lastFour: text("last_four"),
    origin: dataOriginEnum("origin").default("MANUAL_ENTRY").notNull(),
    externalId: text("external_id"),
    active: boolean("active").default(true).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    index("financial_accounts_workspace_id_idx").on(table.workspaceId),
    index("financial_accounts_institution_id_idx").on(table.institutionId),
    index("financial_accounts_connection_id_idx").on(table.connectionId),
    index("financial_accounts_created_by_idx").on(table.createdBy),
    uniqueIndex("financial_accounts_connection_external_idx").on(
      table.connectionId,
      table.externalId,
    ),
  ],
);

export const accountBalanceSnapshots = pgTable(
  "account_balance_snapshots",
  {
    id: uuidV7("id"),
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccounts.id, { onDelete: "cascade" }),
    balance: money("balance").notNull(),
    currency: text("currency").notNull(),
    balanceInBase: money("balance_in_base").notNull(),
    fxRate: rate("fx_rate"),
    fxSource: fxSourceEnum("fx_source"),
    asOf: timestamp("as_of", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("account_balance_snapshots_account_date_idx").on(table.accountId, table.asOf)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuidV7("id"),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    type: categoryTypeEnum("type").notNull(),
    name: text("name").notNull(),
    systemKey: text("system_key"),
    color: text("color"),
    icon: text("icon"),
    sortOrder: integer("sort_order").default(0).notNull(),
    active: boolean("active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "categories_parent_id_fk",
    }).onDelete("restrict"),
    index("categories_workspace_id_idx").on(table.workspaceId),
    index("categories_parent_id_idx").on(table.parentId),
    uniqueIndex("categories_workspace_system_key_idx").on(table.workspaceId, table.systemKey),
  ],
);

export const creditCardBills = pgTable(
  "credit_card_bills",
  {
    id: uuidV7("id"),
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccounts.id, { onDelete: "cascade" }),
    externalId: text("external_id"),
    referenceMonth: text("reference_month"),
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
    closingDate: date("closing_date"),
    dueDate: date("due_date"),
    total: money("total").notNull(),
    currency: text("currency").notNull(),
    status: text("status").default("OPEN").notNull(),
    ...timestamps,
  },
  (table) => [
    index("credit_card_bills_account_id_idx").on(table.accountId),
    uniqueIndex("credit_card_bills_external_idx").on(table.accountId, table.externalId),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuidV7("id"),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccounts.id, { onDelete: "cascade" }),
    billId: uuid("bill_id").references(() => creditCardBills.id, { onDelete: "set null" }),
    settlesBillId: uuid("settles_bill_id").references(() => creditCardBills.id, {
      onDelete: "set null",
    }),
    transferPairId: uuid("transfer_pair_id"),
    refundOfId: uuid("refund_of_id"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    origin: dataOriginEnum("origin").default("MANUAL_ENTRY").notNull(),
    externalId: text("external_id"),
    fingerprint: text("fingerprint").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    postedAt: timestamp("posted_at", { withTimezone: true }).notNull(),
    description: text("description").notNull(),
    normalizedDescription: text("normalized_description").notNull(),
    merchant: text("merchant"),
    counterparty: text("counterparty"),
    direction: transactionDirectionEnum("direction").notNull(),
    nature: transactionNatureEnum("nature").notNull(),
    status: transactionStatusEnum("status").default("POSTED").notNull(),
    amount: money("amount").notNull(),
    currency: text("currency").notNull(),
    amountInBase: money("amount_in_base").notNull(),
    fxRate: rate("fx_rate"),
    fxSource: fxSourceEnum("fx_source"),
    fxRateDate: date("fx_rate_date"),
    installmentNumber: integer("installment_number"),
    totalInstallments: integer("total_installments"),
    installmentGroup: text("installment_group"),
    classificationSource: classificationSourceEnum("classification_source")
      .default("NONE")
      .notNull(),
    classificationConfidence: numeric("classification_confidence", { precision: 5, scale: 4 }),
    reviewStatus: reviewStatusEnum("review_status").default("PENDING").notNull(),
    notes: text("notes"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    foreignKey({
      columns: [table.transferPairId],
      foreignColumns: [table.id],
      name: "transactions_transfer_pair_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.refundOfId],
      foreignColumns: [table.id],
      name: "transactions_refund_of_id_fk",
    }).onDelete("set null"),
    uniqueIndex("transactions_account_fingerprint_idx").on(table.accountId, table.fingerprint),
    uniqueIndex("transactions_account_external_idx").on(table.accountId, table.externalId),
    index("transactions_workspace_occurred_idx").on(table.workspaceId, table.occurredAt),
    index("transactions_account_id_idx").on(table.accountId),
    index("transactions_bill_id_idx").on(table.billId),
    index("transactions_settles_bill_id_idx").on(table.settlesBillId),
    index("transactions_category_id_idx").on(table.categoryId),
    index("transactions_transfer_pair_id_idx").on(table.transferPairId),
    index("transactions_refund_of_id_idx").on(table.refundOfId),
    index("transactions_created_by_idx").on(table.createdBy),
  ],
);

export const transactionSplits = pgTable(
  "transaction_splits",
  {
    id: uuidV7("id"),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    amount: money("amount").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("transaction_splits_transaction_id_idx").on(table.transactionId),
    index("transaction_splits_category_id_idx").on(table.categoryId),
  ],
);

export const investmentPositions = pgTable(
  "investment_positions",
  {
    id: uuidV7("id"),
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(),
    currency: text("currency").notNull(),
    externalId: text("external_id"),
    active: boolean("active").default(true).notNull(),
    ...timestamps,
  },
  (table) => [
    index("investment_positions_account_id_idx").on(table.accountId),
    uniqueIndex("investment_positions_external_idx").on(table.accountId, table.externalId),
  ],
);

export const investmentSnapshots = pgTable(
  "investment_snapshots",
  {
    id: uuidV7("id"),
    positionId: uuid("position_id")
      .notNull()
      .references(() => investmentPositions.id, { onDelete: "cascade" }),
    quantity: numeric("quantity", { precision: 24, scale: 10 }),
    unitPrice: money("unit_price"),
    grossValue: money("gross_value").notNull(),
    netValue: money("net_value"),
    valueInBase: money("value_in_base").notNull(),
    fxRate: rate("fx_rate"),
    fxSource: fxSourceEnum("fx_source"),
    asOf: timestamp("as_of", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("investment_snapshots_position_date_idx").on(table.positionId, table.asOf)],
);

export const fxRates = pgTable(
  "fx_rates",
  {
    id: uuidV7("id"),
    currency: text("currency").notNull(),
    baseCurrency: text("base_currency").default("BRL").notNull(),
    rate: rate("rate").notNull(),
    source: fxSourceEnum("source").notNull(),
    rateDate: date("rate_date").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("fx_rates_currency_base_date_source_idx").on(
      table.currency,
      table.baseCurrency,
      table.rateDate,
      table.source,
    ),
  ],
);

export const categorizationRules = pgTable(
  "categorization_rules",
  {
    id: uuidV7("id"),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    field: text("field").notNull(),
    operator: text("operator").notNull(),
    value: text("value").notNull(),
    priority: integer("priority").default(100).notNull(),
    active: boolean("active").default(true).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ...timestamps,
  },
  (table) => [
    index("categorization_rules_workspace_id_idx").on(table.workspaceId),
    index("categorization_rules_category_id_idx").on(table.categoryId),
    index("categorization_rules_created_by_idx").on(table.createdBy),
  ],
);

export const classificationCache = pgTable(
  "classification_cache",
  {
    id: uuidV7("id"),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    descriptionHash: text("description_hash").notNull(),
    taxonomyVersion: text("taxonomy_version").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull(),
    model: text("model").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("classification_cache_lookup_idx").on(
      table.workspaceId,
      table.descriptionHash,
      table.taxonomyVersion,
    ),
    index("classification_cache_category_id_idx").on(table.categoryId),
  ],
);
