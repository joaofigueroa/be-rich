"use client";

import { Button } from "@be-rich/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@be-rich/ui/dialog";
import { Label } from "@be-rich/ui/label";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { updateTransactionAction } from "@/app/transaction-actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { categoryTypeForNature, type TransactionNature } from "@/server/domain/transaction-edit";

const NATURE_LABELS = {
  INCOME: "Receita",
  CONSUMPTION: "Consumo",
  OWN_TRANSFER: "Transferência entre contas próprias",
  CARD_PAYMENT: "Pagamento de fatura",
  INVESTMENT_CONTRIBUTION: "Aporte em investimento",
  INVESTMENT_REDEMPTION: "Resgate de investimento",
  DEBT_PRINCIPAL: "Pagamento de principal da dívida",
  INTEREST_FEE: "Juros ou tarifa",
  REFUND: "Reembolso",
  ADJUSTMENT: "Ajuste",
} as const;

type TransactionItem = {
  id: string;
  workspaceId: string;
  description: string;
  direction: "CREDIT" | "DEBIT";
  nature: TransactionNature;
  amountInBase: string;
  occurredAt: Date;
  categoryId: string | null;
  category: string | null;
  reviewStatus: "NOT_REQUIRED" | "PENDING" | "CONFIRMED";
  notes: string | null;
};

type CategoryOption = {
  id: string;
  workspaceId: string;
  type: "EXPENSE" | "INCOME";
  name: string;
  parentName: string;
};

type TransactionListProps = {
  transactions: TransactionItem[];
  categories: CategoryOption[];
};

export function TransactionList({ transactions, categories }: TransactionListProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<TransactionItem | null>(null);
  const [nature, setNature] = useState<TransactionNature>("CONSUMPTION");
  const [categoryId, setCategoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openEditor(transaction: TransactionItem) {
    setSelected(transaction);
    setNature(transaction.nature);
    setCategoryId(transaction.categoryId ?? "");
    setNotes(transaction.notes ?? "");
    setError(null);
  }

  function changeNature(nextNature: TransactionNature) {
    setNature(nextNature);
    const categoryType = categoryTypeForNature(nextNature);
    const currentCategory = categories.find((category) => category.id === categoryId);
    if (!categoryType || currentCategory?.type !== categoryType) setCategoryId("");
  }

  function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateTransactionAction({
          transactionId: selected.id,
          nature,
          categoryId: categoryId || null,
          notes: notes || null,
        });
        setSelected(null);
        router.refresh();
      } catch (updateError) {
        setError(
          updateError instanceof Error ? updateError.message : "Não foi possível atualizar.",
        );
      }
    });
  }

  const categoryType = categoryTypeForNature(nature);
  const availableCategories = selected
    ? categories.filter(
        (category) =>
          category.workspaceId === selected.workspaceId && category.type === categoryType,
      )
    : [];
  const categoryGroups = new Map<string, CategoryOption[]>();
  for (const category of availableCategories) {
    const group = categoryGroups.get(category.parentName) ?? [];
    group.push(category);
    categoryGroups.set(category.parentName, group);
  }

  return (
    <>
      <div className="divide-y">
        {transactions.map((transaction) => (
          <button
            type="button"
            key={transaction.id}
            onClick={() => openEditor(transaction)}
            className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[auto_1fr_140px_120px]"
          >
            <span
              className={`grid size-9 place-items-center rounded-xl ${transaction.direction === "CREDIT" ? "bg-emerald-500/12 text-emerald-600" : "bg-muted text-muted-foreground"}`}
            >
              {transaction.direction === "CREDIT" ? (
                <ArrowUpRight className="size-4" />
              ) : (
                <ArrowDownRight className="size-4" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{transaction.description}</span>
              <span className="block text-xs text-muted-foreground">
                {transaction.category ??
                  (["CONSUMPTION", "INCOME"].includes(transaction.nature)
                    ? "Categoria pendente"
                    : NATURE_LABELS[transaction.nature])}
                {transaction.reviewStatus === "PENDING" && transaction.category
                  ? " · revisar sugestão"
                  : ""}
              </span>
            </span>
            <span className="hidden text-sm text-muted-foreground sm:block">
              {formatDate(transaction.occurredAt)}
            </span>
            <span className="tabular text-right text-sm font-semibold">
              {transaction.direction === "DEBIT" ? "−" : "+"}
              {formatCurrency(transaction.amountInBase)}
            </span>
          </button>
        ))}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisar transação</DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.description} · ${formatDate(selected.occurredAt)} · ${formatCurrency(selected.amountInBase)}`
                : "Revise a natureza e a categoria do lançamento."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-5" onSubmit={submitUpdate}>
            <div className="space-y-2">
              <Label htmlFor="transaction-nature">Tipo da transação</Label>
              <select
                id="transaction-nature"
                value={nature}
                onChange={(event) => changeNature(event.target.value as TransactionNature)}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {Object.entries(NATURE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transaction-category">Categoria</Label>
              <select
                id="transaction-category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                disabled={!categoryType}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {categoryType ? "Sem categoria" : "Não aplicável a este tipo"}
                </option>
                {[...categoryGroups.entries()].map(([group, options]) => (
                  <optgroup key={group} label={group}>
                    {options.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transaction-notes">Observações</Label>
              <textarea
                id="transaction-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Adicione um contexto para este lançamento"
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setSelected(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Salvando…" : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
