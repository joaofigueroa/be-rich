import { Badge } from "@be-rich/ui/badge";
import { Button } from "@be-rich/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@be-rich/ui/card";
import { ArrowDownRight, ArrowUpRight, Plus, Sparkles, Target, Upload } from "lucide-react";
import Link from "next/link";
import { AccountCreateDialog } from "@/components/account-create-dialog";
import { NetWorthBreakdownCard } from "@/components/net-worth-breakdown-card";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireUser } from "@/server/services/auth/session-service";
import { getDashboardSnapshot } from "@/server/services/reports/dashboard-service";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardSnapshot(user.id);
  const hasData = data.accounts.length > 0 || data.recent.length > 0;
  const primaryWorkspaceId = data.workspaceIds[0];
  return (
    <>
      <div className="mb-7 flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Boa gestão, {user.name.split(" ")[0]}.</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
            Sua vida financeira
          </h1>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {primaryWorkspaceId ? <AccountCreateDialog workspaceId={primaryWorkspaceId} /> : null}
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/planejamento">
              <Plus className="size-4" /> Nova meta
            </Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/importar">
              <Upload className="size-4" /> Importar extrato
            </Link>
          </Button>
        </div>
      </div>
      {!hasData ? <Onboarding /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <NetWorthBreakdownCard
          value={data.netWorthComplete ? formatCurrency(data.netWorth) : "Saldo incompleto"}
          complete={data.netWorthComplete}
          items={data.netWorthBreakdown}
          accent
          compact
        />
        <MetricCard
          label="Receitas · 30 dias"
          value={formatCurrency(data.totals.income)}
          icon={<ArrowUpRight className="size-4" />}
        />
        <MetricCard
          label="Consumo · 30 dias"
          value={formatCurrency(data.totals.consumption)}
          icon={<ArrowDownRight className="size-4" />}
        />
        <MetricCard
          label="Fluxo de caixa"
          value={formatCurrency(data.totals.cashFlow)}
          icon={<Sparkles className="size-4" />}
        />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_0.55fr]">
        <Card className="overflow-hidden">
          <CardHeader className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle>Movimentações recentes</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Compras na ocorrência; caixa no lançamento.
              </p>
            </div>
            <Button asChild size="sm" variant="ghost" className="w-full sm:w-auto">
              <Link href="/transacoes">Ver todas</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recent.length ? (
              <div className="divide-y">
                {data.recent.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex min-w-0 items-start gap-3 py-3 sm:items-center"
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-xl ${transaction.direction === "CREDIT" ? "bg-emerald-500/12 text-emerald-600" : "bg-muted text-muted-foreground"}`}
                    >
                      {transaction.direction === "CREDIT" ? (
                        <ArrowUpRight className="size-4" />
                      ) : (
                        <ArrowDownRight className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(transaction.occurredAt)}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-right text-sm font-semibold">
                      {transaction.direction === "DEBIT" ? "−" : "+"}
                      {formatCurrency(transaction.amountInBase)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty message="Seus lançamentos aparecerão aqui depois da primeira importação." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="size-4 text-emerald-600" /> Metas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.goals.length ? (
              <div className="space-y-5">
                {data.goals.map((goal) => {
                  const progress = Math.min(
                    100,
                    (Number(goal.manualBalance) / Number(goal.targetAmount)) * 100,
                  );
                  return (
                    <div key={goal.id}>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{goal.name}</span>
                        <span className="tabular text-muted-foreground">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Empty message="Crie uma meta para acompanhar o que importa." />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function MetricCard({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className={accent ? "border-emerald-600/25 bg-emerald-600/[0.045]" : ""}>
      <CardContent className="p-5">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </span>
        </div>
        <p className="tabular mt-5 break-words text-xl font-semibold tracking-tight sm:text-2xl">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
function Empty({ message }: { message: string }) {
  return (
    <div className="grid min-h-36 place-items-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
function Onboarding() {
  return (
    <div className="mb-5 flex flex-col items-start justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.07] p-5 sm:flex-row sm:items-center">
      <div>
        <Badge variant="secondary">Primeiros passos</Badge>
        <h2 className="mt-3 font-semibold">
          Comece adicionando uma conta e importando seu primeiro extrato.
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Você revisa tudo antes que qualquer lançamento entre no livro financeiro.
        </p>
      </div>
      <Button asChild className="w-full sm:w-auto">
        <Link href="/importar">
          Começar <Upload className="size-4" />
        </Link>
      </Button>
    </div>
  );
}
