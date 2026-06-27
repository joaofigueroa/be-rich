import { getDb } from "@be-rich/database";
import { Button } from "@be-rich/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@be-rich/ui/card";
import { Input } from "@be-rich/ui/input";
import { CalendarRange, Goal, Repeat2, WalletCards } from "lucide-react";
import { createGoalAction } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { formatCurrency } from "@/lib/format";
import { requireUser } from "@/server/services/auth/session-service";
import { getUserWorkspaces } from "@/server/services/workspaces/workspace-service";

export default async function PlanningPage() {
  const user = await requireUser();
  const memberships = await getUserWorkspaces(user.id);
  const workspace = memberships[0]?.workspace;
  if (!workspace) return null;
  const goals = await getDb().query.goals.findMany({
    where: (goal, { eq }) => eq(goal.workspaceId, workspace.id),
  });
  return (
    <>
      <PageHeading
        eyebrow="Próximos passos"
        title="Planejamento"
        description="Metas, orçamento e recorrências confirmadas formam uma projeção realista — limites não viram despesas fictícias."
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Goal className="size-5 text-emerald-600" /> Metas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {goals.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {goals.map((goal) => {
                    const progress = Math.min(
                      100,
                      (Number(goal.manualBalance) / Number(goal.targetAmount)) * 100,
                    );
                    return (
                      <article key={goal.id} className="rounded-xl border p-4">
                        <div className="flex justify-between">
                          <p className="font-semibold">{goal.name}</p>
                          <span className="tabular text-sm text-muted-foreground">
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                        <p className="tabular mt-4 text-xl font-semibold">
                          {formatCurrency(goal.targetAmount, goal.currency)}
                        </p>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-emerald-600"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {goal.targetDate ? `Até ${goal.targetDate}` : "Sem data limite"}
                        </p>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma meta criada.
                </p>
              )}
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <PlanningCard
              icon={<WalletCards />}
              title="Orçamento mensal"
              text="Defina valores por categoria, compare realizado e copie o mês anterior."
            />
            <PlanningCard
              icon={<Repeat2 />}
              title="Recorrências"
              text="Sugestões só entram na projeção depois da sua confirmação."
            />
            <PlanningCard
              icon={<CalendarRange />}
              title="Projeção de caixa"
              text="Cenários de 1, 3, 6 ou 12 meses com compromissos conhecidos."
            />
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Nova meta</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createGoalAction} className="space-y-4">
              <input type="hidden" name="workspaceId" value={workspace.id} />
              <input type="hidden" name="currency" value={workspace.baseCurrency} />
              <label htmlFor="goal-name" className="space-y-2 text-sm font-medium">
                <span>Nome</span>
                <Input
                  id="goal-name"
                  name="name"
                  required
                  placeholder="Viagem, reserva, notebook..."
                />
              </label>
              <label htmlFor="goal-amount" className="space-y-2 text-sm font-medium">
                <span>Valor-alvo</span>
                <Input
                  id="goal-amount"
                  name="targetAmount"
                  required
                  inputMode="decimal"
                  placeholder="12000.00"
                />
              </label>
              <label htmlFor="goal-date" className="space-y-2 text-sm font-medium">
                <span>Data desejada</span>
                <Input id="goal-date" name="targetDate" type="date" />
              </label>
              <Button type="submit" className="w-full">
                Criar meta
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
function PlanningCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <span className="grid size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 [&>svg]:size-4">
          {icon}
        </span>
        <h2 className="mt-4 font-semibold">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
