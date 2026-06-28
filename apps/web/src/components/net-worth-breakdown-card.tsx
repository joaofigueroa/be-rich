"use client";

import { Button } from "@be-rich/ui/button";
import { Card, CardContent } from "@be-rich/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@be-rich/ui/dialog";
import { ChevronLeft, ChevronRight, Landmark } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";

const ITEMS_PER_PAGE = 8;

type BreakdownItem = {
  id: string;
  kind: "ASSET" | "LIABILITY";
  group: string;
  label: string;
  detail: string;
  amount: string;
};

export function NetWorthBreakdownCard({
  value,
  complete,
  items,
  accent = false,
  compact = false,
}: {
  value: string;
  complete: boolean;
  items: BreakdownItem[];
  accent?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const currentItems = useMemo(
    () => items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [items, page],
  );
  const assets = items
    .filter((item) => item.kind === "ASSET")
    .reduce((total, item) => total + Number(item.amount), 0);
  const liabilities = items
    .filter((item) => item.kind === "LIABILITY")
    .reduce((total, item) => total + Number(item.amount), 0);

  function openDialog() {
    setPage(1);
    setOpen(true);
  }

  return (
    <>
      <button type="button" className="w-full text-left" onClick={openDialog}>
        <Card
          className={`${accent ? "border-emerald-600/25 bg-emerald-600/[0.045]" : ""} transition hover:border-emerald-600/30 hover:bg-emerald-600/[0.06]`}
        >
          <CardContent className={compact ? "p-5" : "p-6"}>
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Patrimônio líquido</p>
                <p
                  className={`tabular mt-2 break-words font-semibold tracking-tight ${compact ? "text-xl sm:text-2xl" : "text-4xl tracking-[-0.045em]"}`}
                >
                  {complete ? value : compact ? "Saldo incompleto" : "—"}
                </p>
              </div>
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Landmark className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Clique para ver a composição do valor final.
            </p>
          </CardContent>
        </Card>
      </button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setPage(1);
        }}
      >
        <DialogContent className="max-w-3xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Composição do patrimônio líquido</DialogTitle>
            <DialogDescription>
              Ativos {formatCurrency(assets)} − passivos {formatCurrency(liabilities)} ={" "}
              {complete ? value : "saldo incompleto"}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-hidden rounded-xl border">
            <div className="hidden grid-cols-[140px_1fr_132px] bg-muted/60 px-4 py-3 text-xs font-medium text-muted-foreground sm:grid">
              <span>Grupo</span>
              <span>Componente</span>
              <span className="text-right">Valor</span>
            </div>
            <div className="divide-y">
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 px-4 py-3 text-sm sm:grid-cols-[140px_minmax(0,1fr)_132px] sm:items-center sm:gap-3"
                >
                  <span className="text-xs text-muted-foreground sm:text-sm">{item.group}</span>
                  <span className="col-span-2 min-w-0 sm:col-span-1">
                    <span className="block truncate font-medium">{item.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.detail}
                    </span>
                  </span>
                  <span
                    className={`tabular row-start-1 text-right font-semibold sm:row-auto ${
                      item.kind === "LIABILITY" ? "text-foreground" : ""
                    }`}
                  >
                    {item.kind === "LIABILITY" ? "−" : "+"}
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
              {!currentItems.length ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Ainda não há componentes suficientes para detalhar o patrimônio.
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="size-4" /> Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Próxima <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
