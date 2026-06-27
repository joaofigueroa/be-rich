import { getDb } from "@be-rich/database";
import { Button } from "@be-rich/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@be-rich/ui/card";
import { Input } from "@be-rich/ui/input";
import { createFinancialAccountAction } from "@/app/actions";
import { ImportWizard } from "@/components/import-wizard";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/server/services/auth/session-service";
import { getUserWorkspaces } from "@/server/services/workspaces/workspace-service";

export default async function ImportPage() {
  const user = await requireUser();
  const workspaces = await getUserWorkspaces(user.id);
  const workspace = workspaces[0]?.workspace;
  const accounts = workspace
    ? await getDb().query.financialAccounts.findMany({
        where: (account, { and, eq }) =>
          and(eq(account.workspaceId, workspace.id), eq(account.active, true)),
      })
    : [];
  const destinationAccounts = accounts.filter((account) => account.type !== "CREDIT_CARD");
  if (!workspace) return null;
  return (
    <>
      <PageHeading
        eyebrow="Dados"
        title="Importar extrato"
        description="Faça a leitura, confira os lançamentos e só então efetive a importação. Reimportações são deduplicadas automaticamente."
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Nova importação</CardTitle>
          </CardHeader>
          <CardContent>
            <ImportWizard
              workspaceId={workspace.id}
              accounts={destinationAccounts.map(({ id, name, type }) => ({ id, name, type }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contas de destino</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {destinationAccounts.map((account) => (
                <div key={account.id} className="rounded-xl border p-3">
                  <p className="text-sm font-medium">{account.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {account.type} · {account.currency}
                  </p>
                </div>
              ))}
            </div>
            <form action={createFinancialAccountAction} className="mt-5 space-y-3 border-t pt-5">
              <input type="hidden" name="workspaceId" value={workspace.id} />
              <input type="hidden" name="currency" value="BRL" />
              <p className="text-sm font-semibold">Adicionar conta</p>
              <Input
                aria-label="Nome da conta"
                name="name"
                required
                placeholder="Ex.: Nubank pessoal"
              />
              <select
                aria-label="Tipo da conta"
                name="type"
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              >
                <option value="CHECKING">Conta corrente</option>
                <option value="PAYMENT">Conta de pagamento</option>
                <option value="INVESTMENT">Investimentos / caixinha</option>
                <option value="DEBT">Dívida</option>
              </select>
              <Button type="submit" variant="outline" className="w-full">
                Criar conta
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
