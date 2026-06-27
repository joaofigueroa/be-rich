import { Button } from "@be-rich/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@be-rich/ui/card";
import { Input } from "@be-rich/ui/input";
import { Label } from "@be-rich/ui/label";
import { Building2, CreditCard, Landmark, PiggyBank, Wallet } from "lucide-react";
import { recordAccountBalanceAction } from "@/app/balance-actions";
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
            {data.netWorthComplete ? formatCurrency(data.netWorth) : "—"}
          </p>
          {!data.netWorthComplete ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Informe o saldo atual de todas as contas para calcular o patrimônio sem estimativas.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.accounts.map((account) => {
          const Icon = icons[account.type];
          const latestBalance = data.accountBalances[account.id];
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
                <p className="tabular mt-1 text-xl font-semibold">
                  {latestBalance
                    ? formatCurrency(latestBalance.balanceInBase)
                    : "Saldo não informado"}
                </p>
                {latestBalance ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Atualizado em {latestBalance.asOf.toLocaleString("pt-BR")}
                  </p>
                ) : null}
                <form className="mt-5 space-y-3 border-t pt-4" action={recordAccountBalanceAction}>
                  <input type="hidden" name="accountId" value={account.id} />
                  <input type="hidden" name="workspaceId" value={account.workspaceId} />
                  <div className="space-y-2">
                    <Label htmlFor={`balance-${account.id}`}>
                      Saldo atual ({account.currency})
                    </Label>
                    <Input
                      id={`balance-${account.id}`}
                      name="balance"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      required
                      placeholder="0,00"
                    />
                  </div>
                  {account.currency !== "BRL" ? (
                    <div className="space-y-2">
                      <Label htmlFor={`balance-base-${account.id}`}>Saldo convertido (BRL)</Label>
                      <Input
                        id={`balance-base-${account.id}`}
                        name="balanceInBase"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        required
                        placeholder="0,00"
                      />
                    </div>
                  ) : null}
                  <Button type="submit" size="sm" variant="outline">
                    Registrar saldo
                  </Button>
                </form>
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
