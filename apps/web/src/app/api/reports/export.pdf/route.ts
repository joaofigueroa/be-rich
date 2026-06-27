import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { ReportDocument } from "@/components/report-document";
import { requireUser } from "@/server/services/auth/session-service";
import { getReportData } from "@/server/services/reports/report-service";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const report = await getReportData(user.id, {
      startDate: url.searchParams.get("startDate") ?? undefined,
      endDate: url.searchParams.get("endDate") ?? undefined,
      dateBasis: url.searchParams.get("dateBasis") ?? undefined,
    });
    const pdf = await renderToBuffer(ReportDocument({ report }));
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="be-rich-${report.input.startDate}-${report.input.endDate}.pdf"`,
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
