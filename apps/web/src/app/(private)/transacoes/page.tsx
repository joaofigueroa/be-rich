import { Button } from "@be-rich/ui/button";
import { Card, CardContent } from "@be-rich/ui/card";
import { ArrowDownRight, ArrowUpRight, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { reprocessCategoriesAction } from "@/app/classification-actions";
import { PageHeading } from "@/components/page-heading";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireUser } from "@/server/services/auth/session-service";
import { getTransactionsForUser } from "@/server/services/reports/dashboard-service";

export default async function TransactionsPage() {
  const user = await requireUser();
  const transactions = await getTransactionsForUser(user.id);
  return (
    <>
      <PageHeading
        eyebrow="Livro financeiro"
        title="Transações"
        description="Natureza financeira e categoria são independentes para evitar dupla contagem de transferências e faturas."
        actions={
          <form action={reprocessCategoriesAction}>
            <Button type="submit" variant="outline">
              <Sparkles className="size-4" /> Categorizar pendentes
            </Button>
          </form>
        }
      />
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
            <label htmlFor="transaction-search" className="relative flex-1">
              <span className="sr-only">Buscar transações</span>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="transaction-search"
                className="h-10 w-full rounded-lg border bg-background pl-10 pr-3 text-sm"
                placeholder="Buscar descrição ou estabelecimento"
              />
            </label>
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium"
            >
              <SlidersHorizontal className="size-4" /> Filtros
            </button>
          </div>
          {transactions.length ? (
            <div className="divide-y">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-4 sm:grid-cols-[auto_1fr_140px_120px]"
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
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.category ??
                        (["CONSUMPTION", "INCOME"].includes(transaction.nature)
                          ? "Categoria pendente"
                          : "Categoria não aplicável")}
                      {transaction.reviewStatus === "PENDING" && transaction.category
                        ? " · revisar sugestão"
                        : ""}
                    </p>
                  </div>
                  <p className="hidden text-sm text-muted-foreground sm:block">
                    {formatDate(transaction.occurredAt)}
                  </p>
                  <p className="tabular text-right text-sm font-semibold">
                    {transaction.direction === "DEBIT" ? "−" : "+"}
                    {formatCurrency(transaction.amountInBase)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-80 place-items-center p-8 text-center">
              <div>
                <p className="font-semibold">Nenhum lançamento ainda</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Importe um extrato para começar.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
