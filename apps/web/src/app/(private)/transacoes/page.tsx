import { Button } from "@be-rich/ui/button";
import { Card, CardContent } from "@be-rich/ui/card";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";
import { reprocessCategoriesAction } from "@/app/classification-actions";
import { PageHeading } from "@/components/page-heading";
import { TransactionList } from "@/components/transaction-list";
import { requireUser } from "@/server/services/auth/session-service";
import { getTransactionsPageForUser } from "@/server/services/transactions/transaction-service";

type TransactionsPageProps = {
  searchParams: Promise<{ page?: string; view?: string }>;
};

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const view = ["ACCOUNT", "CREDIT_CARD"].includes(params.view ?? "")
    ? (params.view as "ACCOUNT" | "CREDIT_CARD")
    : "ALL";
  const data = await getTransactionsPageForUser({
    userId: user.id,
    page: params.page ?? 1,
    view,
  });
  const firstItem = data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const lastItem = Math.min(data.page * data.pageSize, data.total);
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
          <nav aria-label="Visão das transações" className="flex gap-2 border-b p-4">
            {[
              ["ALL", "Consolidada"],
              ["ACCOUNT", "Conta"],
              ["CREDIT_CARD", "Cartão"],
            ].map(([value, label]) => (
              <Button
                key={value}
                asChild
                size="sm"
                variant={view === value ? "secondary" : "ghost"}
              >
                <Link href={value === "ALL" ? "/transacoes" : `/transacoes?view=${value}`}>
                  {label}
                </Link>
              </Button>
            ))}
          </nav>
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
          {data.transactions.length ? (
            <TransactionList
              transactions={data.transactions}
              categories={data.categories}
              bills={data.bills}
            />
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
          {data.total > 0 ? (
            <nav
              aria-label="Paginação de transações"
              className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm text-muted-foreground">
                Exibindo {firstItem}–{lastItem} de {data.total}
              </p>
              <div className="flex items-center gap-2">
                {data.page > 1 ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/transacoes?page=${data.page - 1}${view === "ALL" ? "" : `&view=${view}`}`}
                    >
                      <ChevronLeft className="size-4" /> Anterior
                    </Link>
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="sm" disabled>
                    <ChevronLeft className="size-4" /> Anterior
                  </Button>
                )}
                <span className="min-w-20 text-center text-sm tabular-nums">
                  {data.page} de {data.totalPages}
                </span>
                {data.page < data.totalPages ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/transacoes?page=${data.page + 1}${view === "ALL" ? "" : `&view=${view}`}`}
                    >
                      Próxima <ChevronRight className="size-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="sm" disabled>
                    Próxima <ChevronRight className="size-4" />
                  </Button>
                )}
              </div>
            </nav>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
