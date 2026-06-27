import { AppNavigation } from "@/components/app-navigation";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireUser } from "@/server/services/auth/session-service";

export const dynamic = "force-dynamic";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden border-r bg-card px-4 py-5 lg:flex lg:flex-col">
        <div className="px-2">
          <Logo />
        </div>
        <div className="mt-9 flex-1">
          <AppNavigation />
        </div>
        <div className="flex items-center gap-3 border-t px-2 pt-4">
          <span className="grid size-9 place-items-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </aside>
      <div className="min-w-0 overflow-x-hidden">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <AppNavigation />
            </div>
            <span className="lg:hidden">
              <Logo compact />
            </span>
            <button
              type="button"
              className="hidden items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm font-medium sm:flex"
            >
              Minha visão consolidada <span className="text-muted-foreground">⌄</span>
            </button>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <span className="mx-2 h-5 w-px bg-border" />
            <span className="grid size-8 place-items-center rounded-full bg-emerald-700 text-xs font-semibold text-white">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
