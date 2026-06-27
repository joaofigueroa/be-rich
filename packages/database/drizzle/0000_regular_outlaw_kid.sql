CREATE TYPE "public"."invite_status" AS ENUM('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."workspace_role" AS ENUM('OWNER', 'EDITOR');--> statement-breakpoint
CREATE TYPE "public"."workspace_type" AS ENUM('PERSONAL', 'FAMILY');--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS "pg_uuidv7";--> statement-breakpoint
CREATE TYPE "public"."category_type" AS ENUM('EXPENSE', 'INCOME');--> statement-breakpoint
CREATE TYPE "public"."classification_source" AS ENUM('RULE', 'CACHE', 'AI', 'MANUAL', 'NONE');--> statement-breakpoint
CREATE TYPE "public"."connection_status" AS ENUM('PENDING', 'ACTIVE', 'ERROR', 'REVOKED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."data_origin" AS ENUM('MANUAL_IMPORT', 'MANUAL_ENTRY', 'OPEN_FINANCE');--> statement-breakpoint
CREATE TYPE "public"."financial_account_type" AS ENUM('CHECKING', 'SAVINGS', 'PAYMENT', 'CREDIT_CARD', 'INVESTMENT', 'CASH', 'DEBT');--> statement-breakpoint
CREATE TYPE "public"."fx_source" AS ENUM('BANK', 'BCB_PTAX', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('NOT_REQUIRED', 'PENDING', 'CONFIRMED');--> statement-breakpoint
CREATE TYPE "public"."transaction_direction" AS ENUM('CREDIT', 'DEBIT');--> statement-breakpoint
CREATE TYPE "public"."transaction_nature" AS ENUM('INCOME', 'CONSUMPTION', 'OWN_TRANSFER', 'CARD_PAYMENT', 'INVESTMENT_CONTRIBUTION', 'INVESTMENT_REDEMPTION', 'DEBT_PRINCIPAL', 'INTEREST_FEE', 'REFUND', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('PENDING', 'POSTED', 'VOID');--> statement-breakpoint
CREATE TYPE "public"."import_format" AS ENUM('CSV', 'XLSX', 'OFX', 'PDF');--> statement-breakpoint
CREATE TYPE "public"."import_product" AS ENUM('ACCOUNT', 'CREDIT_CARD');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('UPLOADED', 'PARSING', 'REVIEW', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."goal_allocation_mode" AS ENUM('PERCENTAGE', 'FIXED');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."recurrence_frequency" AS ENUM('WEEKLY', 'MONTHLY', 'YEARLY');--> statement-breakpoint
CREATE TYPE "public"."recurrence_status" AS ENUM('SUGGESTED', 'ACTIVE', 'PAUSED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"workspace_id" uuid,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_invites" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token_hash" text NOT NULL,
	"role" "workspace_role" DEFAULT 'EDITOR' NOT NULL,
	"status" "invite_status" DEFAULT 'PENDING' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"invited_by" uuid NOT NULL,
	"accepted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_role" NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"name" text NOT NULL,
	"type" "workspace_type" NOT NULL,
	"base_currency" text DEFAULT 'BRL' NOT NULL,
	"owner_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_balance_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"balance" numeric(20, 8) NOT NULL,
	"currency" text NOT NULL,
	"balance_in_base" numeric(20, 8) NOT NULL,
	"fx_rate" numeric(24, 12),
	"fx_source" "fx_source",
	"as_of" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"parent_id" uuid,
	"type" "category_type" NOT NULL,
	"name" text NOT NULL,
	"system_key" text,
	"color" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categorization_rules" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"field" text NOT NULL,
	"operator" text NOT NULL,
	"value" text NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classification_cache" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"description_hash" text NOT NULL,
	"taxonomy_version" text NOT NULL,
	"category_id" uuid NOT NULL,
	"confidence" numeric(5, 4) NOT NULL,
	"model" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_card_bills" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"external_id" text,
	"closing_date" date,
	"due_date" date,
	"total" numeric(20, 8) NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_accounts" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"institution_id" uuid,
	"connection_id" uuid,
	"name" text NOT NULL,
	"type" "financial_account_type" NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"last_four" text,
	"origin" "data_origin" DEFAULT 'MANUAL_ENTRY' NOT NULL,
	"external_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_connections" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"institution_id" uuid,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"status" "connection_status" DEFAULT 'PENDING' NOT NULL,
	"consent_expires_at" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"currency" text NOT NULL,
	"base_currency" text DEFAULT 'BRL' NOT NULL,
	"rate" numeric(24, 12) NOT NULL,
	"source" "fx_source" NOT NULL,
	"rate_date" date NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"country_code" text DEFAULT 'BR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_positions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"currency" text NOT NULL,
	"external_id" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "investment_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"position_id" uuid NOT NULL,
	"quantity" numeric(24, 10),
	"unit_price" numeric(20, 8),
	"gross_value" numeric(20, 8) NOT NULL,
	"net_value" numeric(20, 8),
	"value_in_base" numeric(20, 8) NOT NULL,
	"fx_rate" numeric(24, 12),
	"fx_source" "fx_source",
	"as_of" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_splits" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"bill_id" uuid,
	"transfer_pair_id" uuid,
	"refund_of_id" uuid,
	"category_id" uuid,
	"origin" "data_origin" DEFAULT 'MANUAL_ENTRY' NOT NULL,
	"external_id" text,
	"fingerprint" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"posted_at" timestamp with time zone NOT NULL,
	"description" text NOT NULL,
	"normalized_description" text NOT NULL,
	"merchant" text,
	"counterparty" text,
	"direction" "transaction_direction" NOT NULL,
	"nature" "transaction_nature" NOT NULL,
	"status" "transaction_status" DEFAULT 'POSTED' NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"currency" text NOT NULL,
	"amount_in_base" numeric(20, 8) NOT NULL,
	"fx_rate" numeric(24, 12),
	"fx_source" "fx_source",
	"fx_rate_date" date,
	"installment_number" integer,
	"total_installments" integer,
	"installment_group" text,
	"classification_source" "classification_source" DEFAULT 'NONE' NOT NULL,
	"classification_confidence" numeric(5, 4),
	"review_status" "review_status" DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"account_id" uuid,
	"institution_id" uuid,
	"created_by" uuid NOT NULL,
	"filename" text NOT NULL,
	"file_hash" text NOT NULL,
	"format" "import_format" NOT NULL,
	"product" "import_product" NOT NULL,
	"parser_key" text NOT NULL,
	"parser_version" text NOT NULL,
	"status" "import_status" DEFAULT 'UPLOADED' NOT NULL,
	"workflow_run_id" text,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"valid_rows" integer DEFAULT 0 NOT NULL,
	"duplicate_rows" integer DEFAULT 0 NOT NULL,
	"imported_rows" integer DEFAULT 0 NOT NULL,
	"warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "import_rows" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"batch_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"raw" jsonb NOT NULL,
	"normalized" jsonb,
	"fingerprint" text,
	"validation_errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"external_connection_id" text,
	"status" text NOT NULL,
	"cursor" text,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "budget_allocations" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"budget_month_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_months" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"month" date NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_entries" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"goal_id" uuid NOT NULL,
	"transaction_id" uuid,
	"amount" numeric(20, 8) NOT NULL,
	"currency" text NOT NULL,
	"note" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_links" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"goal_id" uuid NOT NULL,
	"account_id" uuid,
	"position_id" uuid,
	"mode" "goal_allocation_mode" NOT NULL,
	"allocation" numeric(20, 8) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_amount" numeric(20, 8) NOT NULL,
	"manual_balance" numeric(20, 8) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"target_date" date,
	"status" "goal_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurrences" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v7() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"account_id" uuid,
	"category_id" uuid,
	"name" text NOT NULL,
	"description_pattern" text,
	"amount" numeric(20, 8) NOT NULL,
	"currency" text NOT NULL,
	"frequency" "recurrence_frequency" NOT NULL,
	"interval" integer DEFAULT 1 NOT NULL,
	"day_of_week" integer,
	"day_of_month" integer,
	"month_of_year" integer,
	"start_date" date NOT NULL,
	"end_date" date,
	"status" "recurrence_status" DEFAULT 'SUGGESTED' NOT NULL,
	"expected_debit" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invites" ADD CONSTRAINT "workspace_invites_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_balance_snapshots" ADD CONSTRAINT "account_balance_snapshots_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorization_rules" ADD CONSTRAINT "categorization_rules_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorization_rules" ADD CONSTRAINT "categorization_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorization_rules" ADD CONSTRAINT "categorization_rules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classification_cache" ADD CONSTRAINT "classification_cache_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classification_cache" ADD CONSTRAINT "classification_cache_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_bills" ADD CONSTRAINT "credit_card_bills_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_connection_id_financial_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."financial_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_connections" ADD CONSTRAINT "financial_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_connections" ADD CONSTRAINT "financial_connections_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_positions" ADD CONSTRAINT "investment_positions_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_snapshots" ADD CONSTRAINT "investment_snapshots_position_id_investment_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."investment_positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bill_id_credit_card_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."credit_card_bills"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_allocations" ADD CONSTRAINT "budget_allocations_budget_month_id_budget_months_id_fk" FOREIGN KEY ("budget_month_id") REFERENCES "public"."budget_months"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_allocations" ADD CONSTRAINT "budget_allocations_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_months" ADD CONSTRAINT "budget_months_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_months" ADD CONSTRAINT "budget_months_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_entries" ADD CONSTRAINT "goal_entries_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_entries" ADD CONSTRAINT "goal_entries_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_entries" ADD CONSTRAINT "goal_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_links" ADD CONSTRAINT "goal_links_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_links" ADD CONSTRAINT "goal_links_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_links" ADD CONSTRAINT "goal_links_position_id_investment_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."investment_positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrences" ADD CONSTRAINT "recurrences_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrences" ADD CONSTRAINT "recurrences_account_id_financial_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."financial_accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrences" ADD CONSTRAINT "recurrences_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrences" ADD CONSTRAINT "recurrences_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_accounts_user_id_idx" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_accounts_provider_account_idx" ON "auth_accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limits_key_idx" ON "rate_limits" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_idx" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "audit_events_workspace_id_idx" ON "audit_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "audit_events_actor_id_idx" ON "audit_events" USING btree ("actor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_invites_token_idx" ON "workspace_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "workspace_invites_workspace_id_idx" ON "workspace_invites" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "workspace_invites_invited_by_idx" ON "workspace_invites" USING btree ("invited_by");--> statement-breakpoint
CREATE INDEX "workspace_invites_accepted_by_idx" ON "workspace_invites" USING btree ("accepted_by");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_workspace_user_idx" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspaces_owner_id_idx" ON "workspaces" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "account_balance_snapshots_account_date_idx" ON "account_balance_snapshots" USING btree ("account_id","as_of");--> statement-breakpoint
CREATE INDEX "categories_workspace_id_idx" ON "categories" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "categories_parent_id_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_workspace_system_key_idx" ON "categories" USING btree ("workspace_id","system_key");--> statement-breakpoint
CREATE INDEX "categorization_rules_workspace_id_idx" ON "categorization_rules" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "categorization_rules_category_id_idx" ON "categorization_rules" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "categorization_rules_created_by_idx" ON "categorization_rules" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "classification_cache_lookup_idx" ON "classification_cache" USING btree ("workspace_id","description_hash","taxonomy_version");--> statement-breakpoint
CREATE INDEX "classification_cache_category_id_idx" ON "classification_cache" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "credit_card_bills_account_id_idx" ON "credit_card_bills" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_card_bills_external_idx" ON "credit_card_bills" USING btree ("account_id","external_id");--> statement-breakpoint
CREATE INDEX "financial_accounts_workspace_id_idx" ON "financial_accounts" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "financial_accounts_institution_id_idx" ON "financial_accounts" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "financial_accounts_connection_id_idx" ON "financial_accounts" USING btree ("connection_id");--> statement-breakpoint
CREATE INDEX "financial_accounts_created_by_idx" ON "financial_accounts" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_accounts_connection_external_idx" ON "financial_accounts" USING btree ("connection_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_connections_provider_external_idx" ON "financial_connections" USING btree ("provider","external_id");--> statement-breakpoint
CREATE INDEX "financial_connections_workspace_id_idx" ON "financial_connections" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "financial_connections_institution_id_idx" ON "financial_connections" USING btree ("institution_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fx_rates_currency_base_date_source_idx" ON "fx_rates" USING btree ("currency","base_currency","rate_date","source");--> statement-breakpoint
CREATE UNIQUE INDEX "institutions_slug_idx" ON "institutions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "investment_positions_account_id_idx" ON "investment_positions" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "investment_positions_external_idx" ON "investment_positions" USING btree ("account_id","external_id");--> statement-breakpoint
CREATE INDEX "investment_snapshots_position_date_idx" ON "investment_snapshots" USING btree ("position_id","as_of");--> statement-breakpoint
CREATE INDEX "transaction_splits_transaction_id_idx" ON "transaction_splits" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "transaction_splits_category_id_idx" ON "transaction_splits" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_account_fingerprint_idx" ON "transactions" USING btree ("account_id","fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_account_external_idx" ON "transactions" USING btree ("account_id","external_id");--> statement-breakpoint
CREATE INDEX "transactions_workspace_occurred_idx" ON "transactions" USING btree ("workspace_id","occurred_at");--> statement-breakpoint
CREATE INDEX "transactions_account_id_idx" ON "transactions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "transactions_bill_id_idx" ON "transactions" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "transactions_category_id_idx" ON "transactions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "transactions_transfer_pair_id_idx" ON "transactions" USING btree ("transfer_pair_id");--> statement-breakpoint
CREATE INDEX "transactions_refund_of_id_idx" ON "transactions" USING btree ("refund_of_id");--> statement-breakpoint
CREATE INDEX "transactions_created_by_idx" ON "transactions" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "import_batches_workspace_id_idx" ON "import_batches" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "import_batches_account_id_idx" ON "import_batches" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "import_batches_institution_id_idx" ON "import_batches" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "import_batches_created_by_idx" ON "import_batches" USING btree ("created_by");--> statement-breakpoint
CREATE UNIQUE INDEX "import_batches_workspace_file_hash_idx" ON "import_batches" USING btree ("workspace_id","file_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "import_rows_batch_row_idx" ON "import_rows" USING btree ("batch_id","row_number");--> statement-breakpoint
CREATE INDEX "import_rows_batch_id_idx" ON "import_rows" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "sync_runs_workspace_id_idx" ON "sync_runs" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_allocations_month_category_idx" ON "budget_allocations" USING btree ("budget_month_id","category_id");--> statement-breakpoint
CREATE INDEX "budget_allocations_category_id_idx" ON "budget_allocations" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_months_workspace_month_idx" ON "budget_months" USING btree ("workspace_id","month");--> statement-breakpoint
CREATE INDEX "budget_months_created_by_idx" ON "budget_months" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "goal_entries_goal_id_idx" ON "goal_entries" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goal_entries_transaction_id_idx" ON "goal_entries" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "goal_entries_created_by_idx" ON "goal_entries" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "goal_links_goal_id_idx" ON "goal_links" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goal_links_account_id_idx" ON "goal_links" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "goal_links_position_id_idx" ON "goal_links" USING btree ("position_id");--> statement-breakpoint
CREATE INDEX "goals_workspace_id_idx" ON "goals" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "goals_created_by_idx" ON "goals" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "recurrences_workspace_id_idx" ON "recurrences" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "recurrences_account_id_idx" ON "recurrences" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "recurrences_category_id_idx" ON "recurrences" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "recurrences_created_by_idx" ON "recurrences" USING btree ("created_by");--> statement-breakpoint
INSERT INTO "institutions" ("slug", "name", "country_code") VALUES
  ('nubank', 'Nubank', 'BR'),
  ('inter', 'Banco Inter', 'BR'),
  ('c6', 'C6 Bank', 'BR'),
  ('mercado-pago', 'Mercado Pago', 'BR'),
  ('generic', 'Outra instituição', 'BR')
ON CONFLICT ("slug") DO NOTHING;
