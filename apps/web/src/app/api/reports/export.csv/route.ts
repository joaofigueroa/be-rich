import { NextResponse } from "next/server";
import { requireUser } from "@/server/services/auth/session-service";
import { toCsv } from "@/server/services/reports/csv";
import { getReportData } from "@/server/services/reports/report-service";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const report = await getReportData(user.id, {
      startDate: url.searchParams.get("startDate") ?? undefined,
      endDate: url.searchParams.get("endDate") ?? undefined,
      dateBasis: url.searchParams.get("dateBasis") ?? undefined,
      accountScope: url.searchParams.get("accountScope") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      accountId: url.searchParams.get("accountId") ?? undefined,
      institutionId: url.searchParams.get("institutionId") ?? undefined,
      categoryId: url.searchParams.get("categoryId") ?? undefined,
    });
    const csv = toCsv(
      report.rows.map((row) => ({
        data_ocorrencia: row.occurredAt.toISOString(),
        data_lancamento: row.postedAt.toISOString(),
        descricao: row.description,
        conta: row.account,
        tipo_conta: row.accountType,
        instituicao: row.institution,
        categoria: row.category,
        natureza: row.nature,
        direcao: row.direction,
        valor_original: row.amount,
        moeda: row.currency,
        valor_base: row.amountInBase,
      })),
    );
    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="be-rich-${report.input.startDate}-${report.input.endDate}.csv"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha na exportação" },
      { status: 400 },
    );
  }
}
