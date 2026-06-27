import { Button } from "@be-rich/ui/button";
import { Card, CardContent } from "@be-rich/ui/card";
import {
  ArrowDownRight,
  ArrowUpRight,
  FileSpreadsheet,
  FileText,
  Search,
  WalletCards,
} from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { ReportCharts } from "@/components/report-charts";
import { formatCurrency } from "@/lib/format";
import { requireUser } from "@/server/services/auth/session-service";
import { getReportData } from "@/server/services/reports/report-service";

type ReportsPageProps = {
  searchParams: Promise<{
    startDate?: string | string[];
    endDate?: string | string[];
    dateBasis?: string | string[];
    accountScope?: string | string[];
    q?: string | string[];
    accountId?: string | string[];
    institutionId?: string | string[];
    categoryId?: string | string[];
  }>;
};

function singleValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const report = await getReportData(user.id, {
    startDate: singleValue(params.startDate),
    endDate: singleValue(params.endDate),
    dateBasis: singleValue(params.dateBasis),
    accountScope: singleValue(params.accountScope),
    q: singleValue(params.q),
    accountId: singleValue(params.accountId),
    institutionId: singleValue(params.institutionId),
    categoryId: singleValue(params.categoryId),
  });
  const exportQuery = new URLSearchParams(report.input).toString();

  return (
    <>
      <PageHeading
        eyebrow="Análise"
        title="Relatórios"
        description="Tela, CSV e PDF usam o mesmo período e a mesma base temporal."
        actions={
          <>
            <Button asChild variant="outline">
              <a href={`/api/reports/export.csv?${exportQuery}`}>
                <FileSpreadsheet className="size-4" /> CSV
              </a>
            </Button>
            <Button asChild>
              <a href={`/api/reports/export.pdf?${exportQuery}`}>
                <FileText className="size-4" /> PDF
              </a>
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-5">
          <form
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr_0.9fr_0.9fr_0.9fr_auto] 2xl:items-end"
            method="get"
          >
            <label className="min-w-0 space-y-2 text-sm font-medium sm:col-span-2 lg:col-span-1">
              Busca
              <span className="relative block">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="block h-10 w-full rounded-lg border bg-background pl-10 pr-3 font-normal"
                  name="q"
                  placeholder="Descrição ou estabelecimento"
                  defaultValue={report.input.q}
                />
              </span>
            </label>
            <label className="min-w-0 space-y-2 text-sm font-medium">
              Data inicial
              <input
                className="block h-10 w-full rounded-lg border bg-background px-3 font-normal"
                type="date"
                name="startDate"
                defaultValue={report.input.startDate}
                min={report.bounds.startDate}
                max={report.bounds.endDate}
              />
            </label>
            <label className="min-w-0 space-y-2 text-sm font-medium">
              Data final
              <input
                className="block h-10 w-full rounded-lg border bg-background px-3 font-normal"
                type="date"
                name="endDate"
                defaultValue={report.input.endDate}
                min={report.bounds.startDate}
                max={report.bounds.endDate}
              />
            </label>
            <label className="min-w-0 space-y-2 text-sm font-medium">
              Base temporal
              <select
                className="block h-10 w-full rounded-lg border bg-background px-3 font-normal"
                name="dateBasis"
                defaultValue={report.input.dateBasis}
              >
                <option value="OCCURRED">Data da compra/ocorrência</option>
                <option value="POSTED">Data de lançamento</option>
              </select>
            </label>
            <label className="min-w-0 space-y-2 text-sm font-medium">
              Visão
              <select
                className="block h-10 w-full rounded-lg border bg-background px-3 font-normal"
                name="accountScope"
                defaultValue={report.input.accountScope}
              >
                <option value="ALL">Consolidada</option>
                <option value="ACCOUNT">Conta bancária</option>
                <option value="CREDIT_CARD">Cartão de crédito</option>
              </select>
            </label>
            <label className="min-w-0 space-y-2 text-sm font-medium">
              Conta
              <select
                className="block h-10 w-full rounded-lg border bg-background px-3 font-normal"
                name="accountId"
                defaultValue={report.input.accountId}
              >
                <option value="">Todas as contas</option>
                {report.accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 space-y-2 text-sm font-medium">
              Banco
              <select
                className="block h-10 w-full rounded-lg border bg-background px-3 font-normal"
                name="institutionId"
                defaultValue={report.input.institutionId}
              >
                <option value="">Todos os bancos</option>
                {report.institutions.map((institution) => (
                  <option key={institution.id} value={institution.id}>
                    {institution.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 space-y-2 text-sm font-medium">
              Categoria
              <select
                className="block h-10 w-full rounded-lg border bg-background px-3 font-normal"
                name="categoryId"
                defaultValue={report.input.categoryId}
              >
                <option value="">Todas as categorias</option>
                {report.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.parentName} · {category.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex min-w-0 gap-2 sm:col-span-2 lg:col-span-3 2xl:col-span-1">
              <Button type="submit" className="flex-1">
                Aplicar
              </Button>
              <Button asChild type="button" variant="outline" className="flex-1 sm:flex-none">
                <a href="/relatorios">Limpar</a>
              </Button>
            </div>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Dados disponíveis de {report.bounds.startDate} a {report.bounds.endDate}.
          </p>
        </CardContent>
      </Card>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Receitas" value={formatCurrency(report.totals.income)} icon={ArrowUpRight} />
        <Metric
          label="Consumo líquido"
          value={formatCurrency(report.totals.consumption)}
          icon={ArrowDownRight}
        />
        <Metric
          label="Fluxo de caixa"
          value={formatCurrency(report.totals.cashFlow)}
          icon={WalletCards}
        />
        <Metric label="Transações" value={String(report.rows.length)} icon={FileSpreadsheet} />
      </div>

      {report.rows.length ? (
        <ReportCharts data={report.charts} />
      ) : (
        <Card>
          <CardContent className="grid min-h-72 place-items-center p-8 text-center">
            <div>
              <h2 className="text-lg font-semibold">Nenhuma transação neste período</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Ajuste as datas para incluir seus extratos importados.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof ArrowUpRight;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </span>
        </div>
        <p className="tabular mt-5 break-words text-xl font-semibold tracking-tight sm:text-2xl">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
