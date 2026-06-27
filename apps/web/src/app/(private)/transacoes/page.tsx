import { Button } from "@be-rich/ui/button";
import { Card, CardContent } from "@be-rich/ui/card";
import { ChevronLeft, ChevronRight, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { reprocessCategoriesAction } from "@/app/classification-actions";
import { PageHeading } from "@/components/page-heading";
import { TransactionList } from "@/components/transaction-list";
import { requireUser } from "@/server/services/auth/session-service";
import { getTransactionsPageForUser } from "@/server/services/transactions/transaction-service";

type TransactionsPageProps = {
  searchParams: Promise<{
    page?: string;
    view?: string;
    q?: string;
    startDate?: string;
    endDate?: string;
    accountId?: string;
    institutionId?: string;
    categoryId?: string;
    nature?: string;
    reviewStatus?: string;
  }>;
};

const TRANSACTION_NATURE_FILTERS = [
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
] as const;
const REVIEW_STATUS_FILTERS = ["NOT_REQUIRED", "PENDING", "CONFIRMED"] as const;

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const view = ["ACCOUNT", "CREDIT_CARD"].includes(params.view ?? "")
    ? (params.view as "ACCOUNT" | "CREDIT_CARD")
    : "ALL";
  const nature = TRANSACTION_NATURE_FILTERS.includes(
    params.nature as (typeof TRANSACTION_NATURE_FILTERS)[number],
  )
    ? (params.nature as (typeof TRANSACTION_NATURE_FILTERS)[number])
    : undefined;
  const reviewStatus = REVIEW_STATUS_FILTERS.includes(
    params.reviewStatus as (typeof REVIEW_STATUS_FILTERS)[number],
  )
    ? (params.reviewStatus as (typeof REVIEW_STATUS_FILTERS)[number])
    : undefined;
  const data = await getTransactionsPageForUser({
    userId: user.id,
    page: params.page ?? 1,
    view,
    ...(params.q ? { q: params.q } : {}),
    ...(params.startDate ? { startDate: params.startDate } : {}),
    ...(params.endDate ? { endDate: params.endDate } : {}),
    ...(params.accountId ? { accountId: params.accountId } : {}),
    ...(params.institutionId ? { institutionId: params.institutionId } : {}),
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    ...(nature ? { nature } : {}),
    ...(reviewStatus ? { reviewStatus } : {}),
  });
  const firstItem = data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const lastItem = Math.min(data.page * data.pageSize, data.total);
  const filterQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(data.filters)) {
    if (key !== "view" && value) filterQuery.set(key, value);
  }
  const buildHref = (next: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams(filterQuery);
    const nextView = next.view ?? data.filters.view;
    if (nextView && nextView !== "ALL") query.set("view", String(nextView));
    else query.delete("view");
    for (const [key, value] of Object.entries(next)) {
      if (key === "view") continue;
      if (value) query.set(key, String(value));
      else query.delete(key);
    }
    const serialized = query.toString();
    return serialized ? `/transacoes?${serialized}` : "/transacoes";
  };
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
                <Link href={buildHref({ view: value, page: undefined })}>{label}</Link>
              </Button>
            ))}
          </nav>
          <form
            method="get"
            className="grid gap-3 border-b p-4 md:grid-cols-2 xl:grid-cols-[1.3fr_0.8fr_0.8fr_0.9fr_0.9fr_0.9fr_0.9fr_auto]"
          >
            {view !== "ALL" ? <input type="hidden" name="view" value={view} /> : null}
            <label htmlFor="transaction-search" className="relative flex-1">
              <span className="sr-only">Buscar transações</span>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="transaction-search"
                name="q"
                className="h-10 w-full rounded-lg border bg-background pl-10 pr-3 text-sm"
                placeholder="Buscar descrição ou estabelecimento"
                defaultValue={data.filters.q}
              />
            </label>
            <input
              aria-label="Data inicial"
              className="h-10 rounded-lg border bg-background px-3 text-sm"
              type="date"
              name="startDate"
              defaultValue={data.filters.startDate}
            />
            <input
              aria-label="Data final"
              className="h-10 rounded-lg border bg-background px-3 text-sm"
              type="date"
              name="endDate"
              defaultValue={data.filters.endDate}
            />
            <select
              aria-label="Conta"
              className="h-10 rounded-lg border bg-background px-3 text-sm"
              name="accountId"
              defaultValue={data.filters.accountId}
            >
              <option value="">Todas as contas</option>
              {data.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Instituição"
              className="h-10 rounded-lg border bg-background px-3 text-sm"
              name="institutionId"
              defaultValue={data.filters.institutionId}
            >
              <option value="">Todos os bancos</option>
              {data.institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Categoria"
              className="h-10 rounded-lg border bg-background px-3 text-sm"
              name="categoryId"
              defaultValue={data.filters.categoryId}
            >
              <option value="">Todas as categorias</option>
              {data.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.parentName} · {category.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Status de revisão"
              className="h-10 rounded-lg border bg-background px-3 text-sm"
              name="reviewStatus"
              defaultValue={data.filters.reviewStatus}
            >
              <option value="">Todas as revisões</option>
              <option value="PENDING">Pendentes</option>
              <option value="CONFIRMED">Confirmadas</option>
              <option value="NOT_REQUIRED">Sem revisão necessária</option>
            </select>
            <div className="flex gap-2">
              <Button type="submit" className="h-10 flex-1">
                Filtrar
              </Button>
              <Button asChild type="button" variant="outline" className="h-10">
                <Link href="/transacoes">Limpar</Link>
              </Button>
            </div>
          </form>
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
                    <Link href={buildHref({ page: data.page - 1 })}>
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
                    <Link href={buildHref({ page: data.page + 1 })}>
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
