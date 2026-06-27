import { Button } from "@be-rich/ui/button";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { requireUser } from "@/server/services/auth/session-service";
import { acceptFamilyInvite } from "@/server/services/workspaces/family-service";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const user = await requireUser();
  const { token } = await params;
  async function accept() {
    "use server";
    await acceptFamilyInvite({ token, userId: user.id, email: user.email });
    redirect("/dashboard");
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5">
      <Logo />
      <div className="mt-10 rounded-2xl border bg-card p-7">
        <h1 className="text-2xl font-semibold">Participar do espaço familiar</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Ao aceitar, você verá apenas contas criadas ou movidas para o espaço compartilhado. Suas
          contas pessoais permanecem privadas.
        </p>
        <form action={accept}>
          <Button className="mt-6 w-full" type="submit">
            Aceitar convite
          </Button>
        </form>
      </div>
    </main>
  );
}
