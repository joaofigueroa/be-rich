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
import { ChevronLeft, ChevronRight, CreditCard } from "lucide-react";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";

const ITEMS_PER_PAGE = 8;

type FutureInstallmentItem = {
  id: string;
  accountName: string;
  billReference: string;
  description: string;
  occurredAt: string;
  installmentNumber: number;
  totalInstallments: number;
  remainingInstallments: number;
  installmentAmount: string;
  projectedAmount: string;
};

export function FutureInstallmentsCard({
  total,
  items,
}: {
  total: string;
  items: FutureInstallmentItem[];
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
  const currentItems = useMemo(
    () => items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE),
    [items, page],
  );

  function openDialog() {
    setPage(1);
    setOpen(true);
  }

  return (
    <>
      <button type="button" className="w-full text-left" onClick={openDialog}>
        <Card className="transition hover:border-emerald-600/30 hover:bg-emerald-600/[0.04]">
          <CardContent className="p-6">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Parcelamentos futuros</p>
                <p className="tabular mt-2 break-words text-3xl font-semibold tracking-tight">
                  {formatCurrency(total)}
                </p>
              </div>
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <CreditCard className="size-4" />
              </span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {items.length
                ? `${items.length} parcelamentos ativos encontrados nas últimas faturas.`
                : "Nenhum parcelamento ativo encontrado nas últimas faturas."}
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
        <DialogContent className="max-w-4xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Parcelamentos futuros</DialogTitle>
            <DialogDescription>
              Soma das parcelas remanescentes identificadas nas faturas mais recentes:{" "}
              {formatCurrency(total)}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-hidden rounded-xl border">
            <div className="hidden grid-cols-[1fr_108px_128px_132px] bg-muted/60 px-4 py-3 text-xs font-medium text-muted-foreground sm:grid">
              <span>Compra</span>
              <span>Parcela atual</span>
              <span className="text-right">Parcela</span>
              <span className="text-right">Restante</span>
            </div>
            <div className="divide-y">
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_108px_128px_132px] sm:items-center sm:gap-3"
                >
                  <span className="col-span-2 min-w-0 sm:col-span-1">
                    <span className="block truncate font-medium">{item.description}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.accountName} · {item.billReference}
                    </span>
                  </span>
                  <span className="tabular text-xs text-muted-foreground sm:text-sm">
                    {item.installmentNumber}/{item.totalInstallments}
                  </span>
                  <span className="tabular text-right text-sm font-medium">
                    {formatCurrency(item.installmentAmount)}
                  </span>
                  <span className="tabular row-start-1 text-right font-semibold sm:row-auto">
                    {item.remainingInstallments}x · {formatCurrency(item.projectedAmount)}
                  </span>
                </div>
              ))}
              {!currentItems.length ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum parcelamento ativo encontrado nas faturas mais recentes.
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
