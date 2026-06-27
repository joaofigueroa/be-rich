import "server-only";

import { getDb, schema } from "@be-rich/database";
import { format, subDays } from "date-fns";
import { z } from "zod";

const PtaxResponseSchema = z.object({
  value: z.array(z.object({ cotacaoVenda: z.number().positive(), dataHoraCotacao: z.string() })),
});

export function fallbackDates(date: Date, days = 7) {
  return Array.from({ length: days }, (_, index) => subDays(date, index));
}

export async function fetchPtax(currency: string, date: Date) {
  for (const candidate of fallbackDates(date)) {
    const formatted = format(candidate, "MM-dd-yyyy");
    const url = new URL(
      "https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaDia(moeda=@moeda,dataCotacao=@dataCotacao)",
    );
    url.searchParams.set("@moeda", `'${currency}'`);
    url.searchParams.set("@dataCotacao", `'${formatted}'`);
    url.searchParams.set("$format", "json");
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      next: { revalidate: 86400 },
    });
    if (!response.ok) continue;
    const result = PtaxResponseSchema.parse(await response.json());
    const last = result.value.at(-1);
    if (last)
      return {
        currency,
        baseCurrency: "BRL" as const,
        rate: last.cotacaoVenda.toFixed(12),
        source: "BCB_PTAX" as const,
        rateDate: format(candidate, "yyyy-MM-dd"),
        metadata: { quotedAt: last.dataHoraCotacao },
      };
  }
  throw new Error(`Cotação PTAX indisponível para ${currency}`);
}

export async function refreshPtaxRates(date = new Date()) {
  const results = await Promise.allSettled(
    ["USD", "EUR", "GBP", "CAD", "AUD", "JPY"].map((currency) => fetchPtax(currency, date)),
  );
  for (const result of results)
    if (result.status === "fulfilled")
      await getDb().insert(schema.fxRates).values(result.value).onConflictDoNothing();
  return results.map((result) =>
    result.status === "fulfilled"
      ? { currency: result.value.currency, ok: true }
      : { currency: "unknown", ok: false, error: String(result.reason) },
  );
}
