import { Button } from "@be-rich/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@be-rich/ui/card";
import { Input } from "@be-rich/ui/input";
import { createFamilyWorkspaceAction, inviteFamilyMemberAction } from "@/app/actions";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/server/services/auth/session-service";
import { getUserWorkspaces } from "@/server/services/workspaces/workspace-service";

export default async function SettingsPage() {
  const user = await requireUser();
  const memberships = await getUserWorkspaces(user.id);
  const family = memberships.filter(({ workspace }) => workspace.type === "FAMILY");
  return (
    <>
      <PageHeading
        eyebrow="Privacidade"
        title="Espaços e dados"
        description="O consolidado inclui seu espaço pessoal e somente os espaços familiares dos quais você participa."
      />
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Novo espaço familiar</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createFamilyWorkspaceAction} className="space-y-3">
              <Input
                aria-label="Nome do espaço familiar"
                name="name"
                required
                placeholder="Ex.: Casa Figueroa"
              />
              <Button type="submit">Criar espaço</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Convidar editor</CardTitle>
          </CardHeader>
          <CardContent>
            {family.length ? (
              <form action={inviteFamilyMemberAction} className="space-y-3">
                <select
                  aria-label="Espaço familiar"
                  name="workspaceId"
                  className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
                >
                  {family.map(({ workspace }) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
                <Input
                  aria-label="E-mail do familiar"
                  name="email"
                  type="email"
                  required
                  placeholder="familiar@exemplo.com"
                />
                <Button type="submit">Enviar convite de 7 dias</Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">Crie um espaço familiar primeiro.</p>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Portabilidade</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Baixe uma cópia JSON dos dados que você pode acessar.
            </p>
            <Button asChild className="mt-4" variant="outline">
              <a href="/api/me/export">Exportar meus dados</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
