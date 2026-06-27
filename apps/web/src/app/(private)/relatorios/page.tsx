import { Button } from "@be-rich/ui/button";
import { Card, CardContent } from "@be-rich/ui/card";
import { Download, FileSpreadsheet, FileText, PieChart } from "lucide-react";
import { PageHeading } from "@/components/page-heading";

export default function ReportsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Análise"
        title="Relatórios"
        description="Os mesmos filtros alimentam tela, CSV e PDF para que cada total seja conciliável."
        actions={
          <>
            <Button asChild variant="outline">
              <a href="/api/reports/export.csv">
                <FileSpreadsheet className="size-4" /> CSV
              </a>
            </Button>
            <Button asChild>
              <a href="/api/reports/export.pdf">
                <FileText className="size-4" /> PDF
              </a>
            </Button>
          </>
        }
      />
      <Card>
        <CardContent className="grid min-h-[28rem] place-items-center p-8 text-center">
          <div>
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <PieChart className="size-6" />
            </span>
            <h2 className="mt-5 text-xl font-semibold">Escolha um período para analisar</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Filtros de período, espaço, conta, instituição, categoria, moeda e base temporal serão
              aplicados às exportações.
            </p>
            <div className="mt-6 flex justify-center">
              <Button variant="outline">
                <Download className="size-4" /> Últimos 30 dias
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
