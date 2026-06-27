export function toCsv(rows: Array<Record<string, string | number | null | Date>>) {
  const headers = Object.keys(
    rows[0] ?? {
      data_ocorrencia: "",
      data_lancamento: "",
      descricao: "",
      conta: "",
      instituicao: "",
      categoria: "",
      natureza: "",
      direcao: "",
      valor_original: "",
      moeda: "",
      valor_base: "",
    },
  );
  const escapeCell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return `\uFEFF${headers.map(escapeCell).join(",")}\r\n${rows.map((row) => headers.map((header) => escapeCell(row[header])).join(",")).join("\r\n")}`;
}
