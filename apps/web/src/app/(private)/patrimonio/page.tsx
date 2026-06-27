import { Card, CardContent, CardHeader, CardTitle } from "@be-rich/ui/card";
import { Building2, CreditCard, Landmark, PiggyBank, Wallet } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { formatCurrency } from "@/lib/format";
import { requireUser } from "@/server/services/auth/session-service";
import { getDashboardSnapshot } from "@/server/services/reports/dashboard-service";

const icons = {
  CHECKING: Building2,
  SAVINGS: PiggyBank,
  PAYMENT: Wallet,
  CREDIT_CARD: CreditCard,
  INVESTMENT: Landmark,
  CASH: Wallet,
  DEBT: CreditCard,
};
export default async function NetWorthPage() {
  const user = await requireUser();
  const data = await getDashboardSnapshot(user.id);
  return (
    <>
      <PageHeading
        eyebrow="Saúde financeira"
        title="Patrimônio"
        description="Caixa, contas e investimentos menos faturas abertas e dívidas — sempre na moeda-base do espaço."
      />
      <Card className="mb-5 border-emerald-500/20 bg-emerald-500/[0.06]">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Patrimônio líquido consolidado</p>
          <p className="tabular mt-2 text-4xl font-semibold tracking-[-0.045em]">
            {formatCurrency(data.netWorth)}
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.accounts.map((account) => {
          const Icon = icons[account.type];
          return (
            <Card key={account.id}>
              <CardHeader className="flex-row items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <Icon className="size-5" />
                </span>
                <div>
                  <CardTitle className="text-base">{account.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {account.type} · {account.currency}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Saldo mais recente</p>
                <p className="tabular mt-1 text-xl font-semibold">Aguardando snapshot</p>
              </CardContent>
            </Card>
          );
        })}
        {!data.accounts.length ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardContent className="grid min-h-56 place-items-center text-center text-sm text-muted-foreground">
              Suas contas, investimentos, faturas e dívidas aparecerão aqui.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
