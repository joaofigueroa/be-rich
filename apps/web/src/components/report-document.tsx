import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/format";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, color: "#17251c" },
  title: { fontSize: 22, fontWeight: 700 },
  subtitle: { marginTop: 5, color: "#66736a" },
  metrics: { flexDirection: "row", gap: 8, marginTop: 22, marginBottom: 22 },
  metric: { flexGrow: 1, border: "1 solid #dfe5df", borderRadius: 6, padding: 10 },
  label: { color: "#66736a", fontSize: 8 },
  value: { fontSize: 13, fontWeight: 700, marginTop: 4 },
  row: { flexDirection: "row", borderBottom: "1 solid #e7ebe7", paddingVertical: 6 },
  date: { width: "14%" },
  description: { width: "37%" },
  category: { width: "25%", color: "#66736a" },
  amount: { width: "24%", textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 36,
    right: 36,
    color: "#879087",
    fontSize: 7,
    textAlign: "center",
  },
});
type Report = Awaited<
  ReturnType<typeof import("@/server/services/reports/report-service").getReportData>
>;
export function ReportDocument({ report }: { report: Report }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Be Rich · Relatório financeiro</Text>
        <Text style={styles.subtitle}>
          {report.input.startDate} a {report.input.endDate} · Base{" "}
          {report.input.dateBasis === "OCCURRED" ? "ocorrência" : "lançamento"} · Visão{" "}
          {report.input.accountScope === "ACCOUNT"
            ? "conta"
            : report.input.accountScope === "CREDIT_CARD"
              ? "cartão"
              : "consolidada"}
        </Text>
        <View style={styles.metrics}>
          <Metric label="Receitas" value={formatCurrency(report.totals.income)} />
          <Metric label="Consumo líquido" value={formatCurrency(report.totals.consumption)} />
          <Metric label="Fluxo de caixa" value={formatCurrency(report.totals.cashFlow)} />
        </View>
        <View style={[styles.row, { backgroundColor: "#f2f5f2", fontWeight: 700 }]}>
          <Text style={styles.date}>Data</Text>
          <Text style={styles.description}>Descrição</Text>
          <Text style={styles.category}>Categoria</Text>
          <Text style={styles.amount}>Valor</Text>
        </View>
        {report.rows.slice(0, 250).map((row) => (
          <View key={row.id} style={styles.row}>
            <Text style={styles.date}>{row.occurredAt.toISOString().slice(0, 10)}</Text>
            <Text style={styles.description}>{row.description}</Text>
            <Text style={styles.category}>{row.category ?? "Pendente"}</Text>
            <Text style={styles.amount}>
              {row.direction === "DEBIT" ? "−" : "+"}
              {formatCurrency(row.amountInBase)}
            </Text>
          </View>
        ))}
        <Text style={styles.footer} fixed>
          Gerado sob demanda · nenhum relatório financeiro foi persistido.
        </Text>
      </Page>
    </Document>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}
