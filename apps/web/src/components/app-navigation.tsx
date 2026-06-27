"use client";

import {
  BarChart3,
  ChartNoAxesCombined,
  Goal,
  Landmark,
  LayoutDashboard,
  Menu,
  ReceiptText,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  ["Visão geral", "/dashboard", LayoutDashboard],
  ["Transações", "/transacoes", ReceiptText],
  ["Importar", "/importar", Upload],
  ["Patrimônio", "/patrimonio", Landmark],
  ["Planejamento", "/planejamento", Goal],
  ["Relatórios", "/relatorios", BarChart3],
] as const;

export function AppNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="rounded-lg p-2 lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu"
      >
        <Menu className="size-5" />
      </button>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/45 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
        />
      ) : null}
      <nav
        className={`fixed inset-y-0 left-0 z-50 h-svh w-72 max-w-[calc(100vw-2rem)] border-r bg-card p-4 shadow-2xl transition-transform duration-200 ease-out lg:static lg:z-auto lg:h-auto lg:w-auto lg:max-w-none lg:translate-x-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Seções do aplicativo"
      >
        <div className="mb-5 flex justify-end lg:hidden">
          <button
            type="button"
            className="p-2"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="space-y-1">
          {links.map(([label, href, Icon]) => {
            const active =
              pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`motion-soft motion-lift flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Icon className="size-4.5" />
                {label}
              </Link>
            );
          })}
        </div>
        <div className="mt-8 rounded-xl border bg-card p-4 lg:mx-1">
          <ChartNoAxesCombined className="size-5 text-emerald-600" />
          <p className="mt-3 text-sm font-semibold">Open Finance</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Arquitetura pronta para conexão futura.
          </p>
        </div>
      </nav>
    </>
  );
}
