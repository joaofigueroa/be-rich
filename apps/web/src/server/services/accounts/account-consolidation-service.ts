import "server-only";

import { and, eq, getDb, isNull, ne, schema } from "@be-rich/database";
import { Decimal } from "decimal.js";

const GENERIC_ACCOUNT_WORDS = new Set([
  "cartao",
  "credito",
  "credit",
  "card",
  "conta",
  "geral",
  "corrente",
  "pagamento",
  "pessoal",
]);

function normalizedTokens(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((token) => token.length > 1 && !GENERIC_ACCOUNT_WORDS.has(token));
}

function isLikelySameAccount(sourceName: string, targetName: string) {
  const sourceTokens = normalizedTokens(sourceName);
  const targetTokens = new Set(normalizedTokens(targetName));
  if (!sourceTokens.length || !targetTokens.size) return false;
  return sourceTokens.some((token) => targetTokens.has(token));
}

export async function consolidateTechnicalCreditCardAccounts(workspaceIds: string[]) {
  if (!workspaceIds.length) return { consolidated: 0 };

  const accounts = await getDb().query.financialAccounts.findMany({
    where: (account, { and, eq, inArray }) =>
      and(inArray(account.workspaceId, workspaceIds), eq(account.active, true)),
  });
  const cardAccounts = accounts.filter((account) => account.type === "CREDIT_CARD");
  const targetAccounts = accounts.filter((account) => account.type !== "CREDIT_CARD");
  let consolidated = 0;

  for (const cardAccount of cardAccounts) {
    const sameInstitutionTargets = targetAccounts.filter(
      (account) =>
        account.workspaceId === cardAccount.workspaceId &&
        Boolean(cardAccount.institutionId) &&
        account.institutionId === cardAccount.institutionId,
    );
    const sameWorkspaceTargets = targetAccounts.filter(
      (account) => account.workspaceId === cardAccount.workspaceId,
    );
    const target =
      sameInstitutionTargets.length === 1
        ? sameInstitutionTargets[0]
        : (sameInstitutionTargets.find((account) =>
            isLikelySameAccount(cardAccount.name, account.name),
          ) ??
          sameWorkspaceTargets.find((account) =>
            isLikelySameAccount(cardAccount.name, account.name),
          ));
    if (!target) continue;

    const cardTransactions = await getDb()
      .select({
        id: schema.transactions.id,
        occurredAt: schema.transactions.occurredAt,
        direction: schema.transactions.direction,
        amountInBase: schema.transactions.amountInBase,
      })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.accountId, cardAccount.id),
          eq(schema.transactions.nature, "CONSUMPTION"),
          isNull(schema.transactions.billId),
        ),
      );
    if (cardTransactions.length) {
      const closingDate = cardTransactions
        .map((transaction) => transaction.occurredAt.toISOString().slice(0, 10))
        .sort((a, b) => a.localeCompare(b))
        .at(-1);
      const total = cardTransactions
        .filter((transaction) => transaction.direction === "DEBIT")
        .reduce((sum, transaction) => sum.plus(transaction.amountInBase), new Decimal(0));
      const externalId = `technical-account:${cardAccount.id}`;
      const existingBill = await getDb().query.creditCardBills.findFirst({
        where: (bill, { and, eq }) =>
          and(eq(bill.accountId, target.id), eq(bill.externalId, externalId)),
      });
      const bill =
        existingBill ??
        (
          await getDb()
            .insert(schema.creditCardBills)
            .values({
              accountId: target.id,
              externalId,
              closingDate,
              total: total.toFixed(8),
              currency: target.currency,
              status: "OPEN",
            })
            .returning({ id: schema.creditCardBills.id })
        )[0];
      if (bill) {
        await getDb()
          .update(schema.transactions)
          .set({ billId: bill.id, updatedAt: new Date() })
          .where(
            and(
              eq(schema.transactions.accountId, cardAccount.id),
              eq(schema.transactions.nature, "CONSUMPTION"),
              isNull(schema.transactions.billId),
            ),
          );
      }
    }

    await getDb()
      .update(schema.transactions)
      .set({ accountId: target.id, updatedAt: new Date() })
      .where(eq(schema.transactions.accountId, cardAccount.id));
    await getDb()
      .update(schema.importBatches)
      .set({ accountId: target.id, updatedAt: new Date() })
      .where(eq(schema.importBatches.accountId, cardAccount.id));
    await getDb()
      .update(schema.creditCardBills)
      .set({ accountId: target.id, updatedAt: new Date() })
      .where(eq(schema.creditCardBills.accountId, cardAccount.id));
    await getDb()
      .update(schema.financialAccounts)
      .set({ active: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.financialAccounts.id, cardAccount.id),
          ne(schema.financialAccounts.id, target.id),
        ),
      );
    consolidated += 1;
  }

  return { consolidated };
}
