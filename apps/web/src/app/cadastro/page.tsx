import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Criar conta" };

export default function SignUpPage() {
  return (
    <main className="app-page-shell grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
      <section className="flex flex-col px-5 py-6 sm:px-10 lg:px-16">
        <Logo />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12">
          <p className="text-sm font-semibold text-emerald-600">Comece pelo essencial</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">Crie sua conta.</h1>
          <p className="mt-3 leading-7 text-muted-foreground">
            Informe seu nome, e-mail e uma senha. Nenhuma confirmação por e-mail é necessária nesta
            versão.
          </p>
          <LoginForm mode="sign-up" />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Já tem uma conta?{" "}
            <Link className="font-semibold text-emerald-700 hover:underline" href="/entrar">
              Entrar
            </Link>
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Ao continuar, você concorda com o uso responsável dos seus dados financeiros.
        </p>
      </section>
      <aside className="relative hidden overflow-hidden bg-[#10291c] p-12 text-white lg:flex lg:flex-col lg:justify-end">
        <div className="absolute inset-0 opacity-40 dashboard-grid" />
        <div className="absolute -right-32 -top-24 size-[34rem] rounded-full bg-emerald-400/20 blur-3xl" />
        <blockquote className="relative max-w-xl text-4xl font-medium leading-tight tracking-[-0.045em]">
          “Clareza financeira não exige perfeição. Exige um bom ponto de partida.”
        </blockquote>
        <p className="relative mt-5 text-sm text-emerald-100/70">
          Sua conta pessoal e seus espaços familiares permanecem separados.
        </p>
      </aside>
    </main>
  );
}
