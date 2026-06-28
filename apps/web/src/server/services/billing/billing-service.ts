import "server-only";

import { and, eq, getDb, inArray, isNull, schema } from "@be-rich/database";
import Decimal from "decimal.js";
import { NormalizedTransactionSchema } from "@/types/financial";

export async function ensureCreditCardBillForImport(batchId: string) {
  const batch = await getDb().query.importBatches.findFirst({
    where: eq(schema.importBatches.id, batchId),
  });
  if (!batch || batch.product !== "CREDIT_CARD" || !batch.accountId) return null;
  const account = await getDb().query.financialAccounts.findFirst({
    where: eq(schema.financialAccounts.id, batch.accountId),
  });
  if (!account) throw new Error("A conta da importação não foi encontrada");
  if (batch.creditCardBillId) {
    return getDb().query.creditCardBills.findFirst({
      where: eq(schema.creditCardBills.id, batch.creditCardBillId),
    });
  }

  const rows = await getDb().query.importRows.findMany({
    where: eq(schema.importRows.batchId, batch.id),
  });
  const transactions = rows.flatMap((row) => {
    const parsed = NormalizedTransactionSchema.safeParse(row.normalized);
    return parsed.success && !row.validationErrors.length ? [parsed.data] : [];
  });
  if (!transactions.length) return null;

  const dates = transactions.map((transaction) => transaction.occurredAt.slice(0, 10)).sort();
  const total = transactions
    .reduce((sum, transaction) => {
      const amount = new Decimal(transaction.amountInBase);
      if (transaction.nature === "REFUND") return sum.minus(amount);
      if (["CONSUMPTION", "INTEREST_FEE"].includes(transaction.nature)) {
        return sum.plus(amount);
      }
      return sum;
    }, new Decimal(0))
    .toFixed(8);
  const periodStart = dates[0];
  const periodEnd = dates.at(-1);
  if (!periodStart || !periodEnd) return null;
  const filenamePeriod = batch.filename.match(/(20\d{2})[-_](0[1-9]|1[0-2])/);
  const referenceMonth = filenamePeriod
    ? `${filenamePeriod[1]}-${filenamePeriod[2]}`
    : periodEnd.slice(0, 7);

  const [created] = await getDb()
    .insert(schema.creditCardBills)
    .values({
      accountId: account.id,
      externalId: `import:${batch.id}`,
      referenceMonth,
      periodStart,
      periodEnd,
      total,
      currency: account.currency,
      status: "OPEN",
    })
    .onConflictDoNothing()
    .returning();
  const bill =
    created ??
    (await getDb().query.creditCardBills.findFirst({
      where: (entry, { and, eq }) =>
        and(eq(entry.accountId, account.id), eq(entry.externalId, `import:${batch.id}`)),
    }));
  if (!bill) throw new Error("Não foi possível registrar a fatura importada");
  await getDb()
    .update(schema.importBatches)
    .set({ creditCardBillId: bill.id, updatedAt: new Date() })
    .where(eq(schema.importBatches.id, batch.id));
  return bill;
}

export async function reconcileCreditCardBills(workspaceId: string) {
  const bills = await getDb()
    .select({
      id: schema.creditCardBills.id,
      total: schema.creditCardBills.total,
      periodEnd: schema.creditCardBills.periodEnd,
      institutionId: schema.financialAccounts.institutionId,
    })
    .from(schema.creditCardBills)
    .innerJoin(
      schema.financialAccounts,
      eq(schema.creditCardBills.accountId, schema.financialAccounts.id),
    )
    .where(
      and(
        eq(schema.financialAccounts.workspaceId, workspaceId),
        eq(schema.creditCardBills.status, "OPEN"),
      ),
    );
  const payments = await getDb()
    .select({
      id: schema.transactions.id,
      amount: schema.transactions.amountInBase,
      postedAt: schema.transactions.postedAt,
      institutionId: schema.financialAccounts.institutionId,
    })
    .from(schema.transactions)
    .innerJoin(
      schema.financialAccounts,
      eq(schema.transactions.accountId, schema.financialAccounts.id),
    )
    .where(
      and(
        eq(schema.transactions.workspaceId, workspaceId),
        eq(schema.transactions.nature, "CARD_PAYMENT"),
        eq(schema.transactions.direction, "DEBIT"),
        isNull(schema.transactions.billId),
        isNull(schema.transactions.settlesBillId),
      ),
    );
  const usedPayments = new Set<string>();
  let linked = 0;

  for (const bill of bills) {
    const candidates = payments.filter((payment) => {
      if (usedPayments.has(payment.id) || payment.institutionId !== bill.institutionId)
        return false;
      if (!new Decimal(payment.amount).equals(bill.total)) return false;
      if (!bill.periodEnd) return true;
      const daysAfterPeriod =
        (payment.postedAt.getTime() - new Date(`${bill.periodEnd}T00:00:00.000Z`).getTime()) /
        86_400_000;
      return daysAfterPeriod >= -7 && daysAfterPeriod <= 60;
    });
    if (candidates.length !== 1) continue;
    const payment = candidates[0];
    if (!payment) continue;
    await getDb()
      .update(schema.transactions)
      .set({ settlesBillId: bill.id, updatedAt: new Date() })
      .where(eq(schema.transactions.id, payment.id));
    await getDb()
      .update(schema.creditCardBills)
      .set({ status: "PAID", updatedAt: new Date() })
      .where(eq(schema.creditCardBills.id, bill.id));
    usedPayments.add(payment.id);
    linked += 1;
  }
  return { linked };
}

export async function repairExistingCreditCardImports() {
  const batches = await getDb().query.importBatches.findMany({
    where: (batch, { and, eq, gt, isNotNull }) =>
      and(
        eq(batch.product, "CREDIT_CARD"),
        eq(batch.status, "COMPLETED"),
        gt(batch.importedRows, 0),
        isNotNull(batch.accountId),
      ),
  });
  const workspaces = new Set<string>();
  let movedTransactions = 0;

  for (const batch of batches) {
    if (!batch.accountId) continue;
    const originalAccount = await getDb().query.financialAccounts.findFirst({
      where: eq(schema.financialAccounts.id, batch.accountId),
    });
    if (!originalAccount) continue;
    const bill = await ensureCreditCardBillForImport(batch.id);
    if (!bill) continue;
    const rows = await getDb().query.importRows.findMany({
      columns: { fingerprint: true },
      where: eq(schema.importRows.batchId, batch.id),
    });
    const fingerprints = rows.flatMap((row) => (row.fingerprint ? [row.fingerprint] : []));
    if (fingerprints.length) {
      const moved = await getDb()
        .update(schema.transactions)
        .set({ accountId: originalAccount.id, billId: bill.id, updatedAt: new Date() })
        .where(
          and(
            eq(schema.transactions.accountId, originalAccount.id),
            inArray(schema.transactions.fingerprint, fingerprints),
          ),
        )
        .returning({ id: schema.transactions.id });
      movedTransactions += moved.length;
    }
    workspaces.add(batch.workspaceId);
  }
  for (const workspaceId of workspaces) await reconcileCreditCardBills(workspaceId);
  return { repairedBatches: batches.length, movedTransactions };
}
