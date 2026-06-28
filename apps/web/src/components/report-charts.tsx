"use client";

import { Button } from "@be-rich/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@be-rich/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@be-rich/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import type { ReportChartData } from "@/server/domain/report-charts";

const TRANSACTIONS_PER_PAGE = 8;
const CATEGORY_LABEL_MAX_CHARS = 18;

function compactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function wrapCategoryLabel(label: string) {
  const words = label.split(" ");
  const lines: Array<{ key: string; text: string }> = [];
  let current = "";
  let consumedCharacters = 0;

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > CATEGORY_LABEL_MAX_CHARS && current) {
      lines.push({ key: `${consumedCharacters}-${current}`, text: current });
      consumedCharacters += current.length + 1;
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push({ key: `${consumedCharacters}-${current}`, text: current });

  return lines;
}

function CategoryAxisTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value?: unknown };
}) {
  const label = typeof payload?.value === "string" ? payload.value : "";
  const lines = wrapCategoryLabel(label);
  const lineHeight = 13;
  const startDy = -((lines.length - 1) * lineHeight) / 2;

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        textAnchor="end"
        fill="currentColor"
        className="fill-muted-foreground text-[11px]"
      >
        {lines.map((line, index) => (
          <tspan key={line.key} x={0} dy={index === 0 ? startDy : lineHeight}>
            {line.text}
          </tspan>
        ))}
      </text>
    </g>
  );
}

export function ReportCharts({ data }: { data: ReportChartData }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const selectedDetail = useMemo(
    () => data.categoryDetails.find((detail) => detail.category === selectedCategory),
    [data.categoryDetails, selectedCategory],
  );
  const totalPages = Math.max(
    1,
    Math.ceil((selectedDetail?.transactions.length ?? 0) / TRANSACTIONS_PER_PAGE),
  );
  const currentTransactions =
    selectedDetail?.transactions.slice(
      (page - 1) * TRANSACTIONS_PER_PAGE,
      page * TRANSACTIONS_PER_PAGE,
    ) ?? [];
  const selectedTotal =
    selectedDetail?.transactions.reduce(
      (total, transaction) => total + Number(transaction.amountInBase),
      0,
    ) ?? 0;
  const categoryChartHeight = Math.max(320, data.categories.length * 58);

  function openCategory(category: string) {
    setSelectedCategory(category);
    setPage(1);
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Receitas e consumo por mês</CardTitle>
            <p className="text-sm text-muted-foreground">
              Valores pela data selecionada no filtro.
            </p>
          </CardHeader>
          <CardContent>
            <div
              className="h-80 w-full"
              role="img"
              aria-label="Gráfico de receitas e consumo por mês"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.timeline} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={compactCurrency}
                    tickLine={false}
                    axisLine={false}
                    width={82}
                  />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="income" name="Receitas" fill="#15803d" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="consumption" name="Consumo" fill="#86a893" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Consumo e investimentos por categoria</CardTitle>
            <p className="text-sm text-muted-foreground">
              Clique em uma barra para ver as transações consideradas.
            </p>
          </CardHeader>
          <CardContent>
            {data.categories.length ? (
              <div
                className="w-full"
                style={{ height: categoryChartHeight }}
                role="img"
                aria-label="Gráfico de consumo e investimentos por categoria"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.categories}
                    layout="vertical"
                    accessibilityLayer
                    margin={{ top: 18, right: 24, bottom: 12, left: 18 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={compactCurrency}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      tick={<CategoryAxisTick />}
                      tickMargin={10}
                      width={150}
                    />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar
                      dataKey="amount"
                      name="Consumo e investimentos"
                      fill="#15803d"
                      radius={[0, 5, 5, 0]}
                      cursor="pointer"
                      onClick={(payload) => {
                        const clickedBar = payload as {
                          category?: unknown;
                          payload?: { category?: unknown };
                        };
                        const category =
                          typeof clickedBar.category === "string"
                            ? clickedBar.category
                            : typeof clickedBar.payload?.category === "string"
                              ? clickedBar.payload.category
                              : null;
                        if (category) openCategory(category);
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="grid h-80 place-items-center text-sm text-muted-foreground">
                Nenhum consumo ou investimento categorizado no período.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(selectedCategory)}
        onOpenChange={(open) => {
          if (!open) setSelectedCategory(null);
        }}
      >
        <DialogContent className="max-w-3xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{selectedCategory ?? "Categoria"}</DialogTitle>
            <DialogDescription>
              {selectedDetail?.transactions.length ?? 0} transações · total{" "}
              {formatCurrency(selectedTotal)}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-hidden rounded-xl border">
            <div className="hidden grid-cols-[96px_1fr_128px] bg-muted/60 px-4 py-3 text-xs font-medium text-muted-foreground sm:grid">
              <span>Data</span>
              <span>Descrição</span>
              <span className="text-right">Valor</span>
            </div>
            <div className="divide-y">
              {currentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 px-4 py-3 text-sm sm:grid-cols-[96px_minmax(0,1fr)_128px] sm:items-center sm:gap-3"
                >
                  <span className="tabular text-xs text-muted-foreground sm:text-sm">
                    {new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    }).format(new Date(transaction.date))}
                  </span>
                  <span className="col-span-2 min-w-0 sm:col-span-1">
                    <span className="block truncate font-medium">{transaction.description}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {transaction.institution ?? "Instituição"} · {transaction.account}
                    </span>
                  </span>
                  <span className="tabular row-start-1 text-right font-semibold sm:row-auto">
                    {formatCurrency(transaction.amountInBase)}
                  </span>
                </div>
              ))}
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
