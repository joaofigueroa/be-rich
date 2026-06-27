import { Button } from "@be-rich/ui/button";
import { ArrowRight, Check, Landmark, LockKeyhole, Sparkles } from "lucide-react";
import Link from "next/link";
import { DashboardPreview } from "@/components/dashboard-preview";
import { Logo } from "@/components/logo";

const features = [
  [
    "Tudo em um só lugar",
    "Contas, cartões, investimentos, dívidas e metas em uma visão conciliada.",
  ],
  ["Importação sem atrito", "Nubank, Inter, C6 e Mercado Pago em CSV, XLSX, OFX e PDF textual."],
  [
    "Inteligência que aprende",
    "A categorização sugere, você decide, e suas correções viram regras privadas.",
  ],
];

export default function Home() {
  return (
    <main className="app-page-shell overflow-hidden">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8"
        aria-label="Navegação principal"
      >
        <Logo />
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/entrar">Entrar</Link>
          </Button>
          <Button asChild>
            <Link href="/cadastro">
              Começar agora <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-16 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:pb-28 lg:pt-24">
        <div className="relative z-10 flex flex-col justify-center">
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <Sparkles className="size-3.5" /> Seu dinheiro, finalmente legível
          </div>
          <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Clareza para construir uma vida <span className="text-emerald-600">mais rica.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            O Be Rich transforma extratos dispersos em uma visão simples do presente — e em um plano
            realista para o futuro.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/cadastro">
                Organizar minhas finanças <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#como-funciona">Ver como funciona</a>
            </Button>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="size-4 text-emerald-600" /> Sem planilhas
            </span>
            <span className="flex items-center gap-1.5">
              <LockKeyhole className="size-4 text-emerald-600" /> Privacidade por espaço
            </span>
            <span className="flex items-center gap-1.5">
              <Landmark className="size-4 text-emerald-600" /> Open Finance ready
            </span>
          </div>
        </div>
        <DashboardPreview />
        <div className="hero-glow" aria-hidden="true" />
      </section>

      <section id="como-funciona" className="border-y border-border/70 bg-muted/35">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-20 md:grid-cols-3 lg:px-8">
          {features.map(([title, description], index) => (
            <article
              key={title}
              className="motion-soft motion-lift rounded-2xl border border-border/70 bg-background p-6 shadow-sm"
            >
              <span className="mb-8 grid size-9 place-items-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                0{index + 1}
              </span>
              <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
