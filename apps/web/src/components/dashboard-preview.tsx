import {
  ArrowDownRight,
  ArrowUpRight,
  Eye,
  MoreHorizontal,
  TrendingUp,
  WalletCards,
} from "lucide-react";

export function DashboardPreview() {
  const bars = [
    "jul:32",
    "ago:48",
    "set:39",
    "out:62",
    "nov:55",
    "dez:74",
    "jan:82",
    "fev:70",
    "mar:88",
    "abr:78",
    "mai:95",
    "jun:91",
  ];
  return (
    <div className="relative z-10 rounded-[1.6rem] border border-border/80 bg-card/95 p-3 shadow-[0_28px_90px_-32px_rgb(17_66_40/28%)] backdrop-blur sm:p-5 lg:rotate-[1deg]">
      <div className="dashboard-grid rounded-2xl border bg-background/70 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Patrimônio líquido</p>
            <p className="tabular mt-1 text-2xl font-semibold tracking-tight">R$ 186.420,80</p>
          </div>
          <button
            type="button"
            aria-label="Mais opções"
            className="rounded-lg p-2 text-muted-foreground"
          >
            <MoreHorizontal className="size-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <PreviewMetric
            icon={<ArrowUpRight className="size-4" />}
            label="Receitas"
            value="R$ 14.850"
            positive
          />
          <PreviewMetric
            icon={<ArrowDownRight className="size-4" />}
            label="Consumo"
            value="R$ 7.240"
          />
          <PreviewMetric
            icon={<WalletCards className="size-4" />}
            label="Disponível"
            value="R$ 22.610"
            positive
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Evolução patrimonial</p>
                <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <TrendingUp className="size-3.5" /> 18,4%
              </span>
            </div>
            <div className="mt-6 flex h-28 items-end gap-2">
              {bars.map((bar) => {
                const [month, height] = bar.split(":");
                return (
                  <div
                    key={month}
                    className="flex-1 rounded-t bg-emerald-500/20"
                    style={{ height: `${height}%` }}
                  >
                    <div className="h-full rounded-t bg-gradient-to-t from-emerald-600/70 to-emerald-400/45" />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Meta viagem</p>
              <Eye className="size-4 text-muted-foreground" />
            </div>
            <div
              className="mx-auto mt-5 grid size-24 place-items-center rounded-full"
              style={{ background: "conic-gradient(var(--primary) 0 68%, var(--muted) 68%)" }}
            >
              <div className="grid size-[4.65rem] place-items-center rounded-full bg-card">
                <span className="tabular text-lg font-semibold">68%</span>
              </div>
            </div>
            <p className="tabular mt-4 text-center text-xs text-muted-foreground">
              R$ 8.160 de R$ 12.000
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewMetric({
  icon,
  label,
  value,
  positive = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-3.5">
      <div
        className={`mb-3 grid size-7 place-items-center rounded-lg ${positive ? "bg-emerald-500/12 text-emerald-600" : "bg-amber-500/12 text-amber-600"}`}
      >
        {icon}
      </div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="tabular mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}
