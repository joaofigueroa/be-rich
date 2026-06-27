ALTER TABLE "credit_card_bills" ADD COLUMN "reference_month" text;--> statement-breakpoint
ALTER TABLE "credit_card_bills" ADD COLUMN "period_start" date;--> statement-breakpoint
ALTER TABLE "credit_card_bills" ADD COLUMN "period_end" date;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "settles_bill_id" uuid;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "credit_card_bill_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_settles_bill_id_credit_card_bills_id_fk" FOREIGN KEY ("settles_bill_id") REFERENCES "public"."credit_card_bills"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_credit_card_bill_id_credit_card_bills_id_fk" FOREIGN KEY ("credit_card_bill_id") REFERENCES "public"."credit_card_bills"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_settles_bill_id_idx" ON "transactions" USING btree ("settles_bill_id");--> statement-breakpoint
CREATE INDEX "import_batches_credit_card_bill_id_idx" ON "import_batches" USING btree ("credit_card_bill_id");