import { Button } from "@be-rich/ui/button";
import { Card, CardContent } from "@be-rich/ui/card";
import { ArrowDownRight, ArrowUpRight, FileSpreadsheet, FileText, WalletCards } from "lucide-react";
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
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto] xl:items-end"
            method="get"
          >
            <label className="space-y-2 text-sm font-medium">
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
            <label className="space-y-2 text-sm font-medium">
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
            <label className="space-y-2 text-sm font-medium">
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
            <label className="space-y-2 text-sm font-medium">
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
            <Button type="submit">Aplicar filtros</Button>
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </span>
        </div>
        <p className="tabular mt-5 text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
