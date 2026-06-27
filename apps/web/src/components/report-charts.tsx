"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@be-rich/ui/card";
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

function compactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function ReportCharts({ data }: { data: ReportChartData }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Receitas e consumo por mês</CardTitle>
          <p className="text-sm text-muted-foreground">Valores pela data selecionada no filtro.</p>
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
          <CardTitle>Consumo por categoria</CardTitle>
          <p className="text-sm text-muted-foreground">As oito categorias com maior valor.</p>
        </CardHeader>
        <CardContent>
          {data.categories.length ? (
            <div className="h-80 w-full" role="img" aria-label="Gráfico de consumo por categoria">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.categories}
                  layout="vertical"
                  accessibilityLayer
                  margin={{ left: 10, right: 24 }}
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
                    width={112}
                  />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="amount" name="Consumo" fill="#15803d" radius={[0, 5, 5, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="grid h-80 place-items-center text-sm text-muted-foreground">
              Nenhum consumo categorizado no período.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
