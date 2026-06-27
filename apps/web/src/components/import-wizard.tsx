"use client";

import { Button } from "@be-rich/ui/button";
import { Input } from "@be-rich/ui/input";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { useRef, useState } from "react";

type Account = { id: string; name: string };
type Preview = {
  batch: { id: string; filename: string; totalRows: number; validRows: number; warnings: string[] };
  rows: Array<{
    id: string;
    rowNumber: number;
    normalized?: { occurredAt: string; description: string; amount: string; direction: string };
  }>;
};

export function ImportWizard({
  workspaceId,
  accounts,
}: {
  workspaceId: string;
  accounts: Account[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<
    "idle" | "uploading" | "review" | "confirming" | "done" | "error"
  >("idle");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  async function parse(form: FormData) {
    setState("uploading");
    setError("");
    form.set("workspaceId", workspaceId);
    const response = await fetch("/api/imports/parse", { method: "POST", body: form });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Falha ao ler o arquivo");
      setState("error");
      return;
    }
    setPreview(body);
    setState("review");
  }
  async function confirm(accountId: string) {
    if (!preview) return;
    setState("confirming");
    const response = await fetch("/api/imports/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ batchId: preview.batch.id, accountId }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Falha ao confirmar");
      setState("error");
      return;
    }
    setState("done");
  }
  if (state === "done")
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-7 text-center">
        <CheckCircle2 className="mx-auto size-9 text-emerald-600" />
        <h2 className="mt-4 text-xl font-semibold">Importação em processamento</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A normalização e deduplicação seguem em um Workflow durável. Você pode sair desta página.
        </p>
      </div>
    );
  if (preview && (state === "review" || state === "confirming" || state === "error"))
    return (
      <Review
        preview={preview}
        accounts={accounts}
        confirming={state === "confirming"}
        error={error}
        onConfirm={confirm}
        onBack={() => {
          setPreview(null);
          setState("idle");
        }}
      />
    );
  return (
    <form action={parse} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Instituição">
          <select
            aria-label="Instituição"
            name="institution"
            className="h-11 w-full rounded-lg border bg-background px-3 text-sm"
          >
            <option value="nubank">Nubank</option>
            <option value="inter">Inter</option>
            <option value="c6">C6 Bank</option>
            <option value="mercado-pago">Mercado Pago</option>
            <option value="generic">Outro / detectar</option>
          </select>
        </Field>
        <Field label="Produto">
          <select
            aria-label="Produto"
            name="product"
            className="h-11 w-full rounded-lg border bg-background px-3 text-sm"
          >
            <option value="ACCOUNT">Conta</option>
            <option value="CREDIT_CARD">Cartão de crédito</option>
          </select>
        </Field>
      </div>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="group grid w-full place-items-center rounded-2xl border-2 border-dashed border-border bg-muted/25 px-5 py-14 text-center transition-colors hover:border-emerald-600/50 hover:bg-emerald-500/5"
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-emerald-500/12 text-emerald-600">
          <UploadCloud className="size-6" />
        </span>
        <span className="mt-4 font-semibold">Selecione seu extrato</span>
        <span className="mt-1 text-sm text-muted-foreground">
          CSV, XLSX, OFX ou PDF textual · até 10 MB
        </span>
      </button>
      <Input
        ref={fileRef}
        name="file"
        type="file"
        required
        accept=".csv,.xlsx,.ofx,.pdf"
        className="sr-only"
      />
      <Field label="Senha do PDF (opcional)">
        <Input
          aria-label="Senha do PDF"
          name="password"
          type="password"
          autoComplete="off"
          placeholder="Usada apenas em memória"
        />
      </Field>
      {error ? (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" />
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-600" />O arquivo original é apagado após a
          leitura.
        </p>
        <Button type="submit" disabled={state === "uploading"}>
          {state === "uploading" ? (
            <>
              <LoaderCircle className="size-4 animate-spin" /> Lendo...
            </>
          ) : (
            <>
              Preparar revisão <FileSpreadsheet className="size-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function Review({
  preview,
  accounts,
  confirming,
  error,
  onConfirm,
  onBack,
}: {
  preview: Preview;
  accounts: Account[];
  confirming: boolean;
  error: string;
  onConfirm: (id: string) => void;
  onBack: () => void;
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">{preview.batch.filename}</h2>
          <p className="text-sm text-muted-foreground">
            {preview.batch.validRows} de {preview.batch.totalRows} linhas prontas
          </p>
        </div>
        <select
          aria-label="Conta de destino"
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          className="h-10 rounded-lg border bg-background px-3 text-sm"
        >
          <option value="">Selecione a conta</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {preview.rows.slice(0, 25).map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 tabular">
                  {row.normalized?.occurredAt.slice(0, 10) ?? "—"}
                </td>
                <td className="max-w-sm truncate px-4 py-3">
                  {row.normalized?.description ?? "Linha inválida"}
                </td>
                <td className="px-4 py-3 text-right tabular">
                  {row.normalized?.direction === "DEBIT" ? "−" : "+"}
                  {row.normalized?.amount ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    Pronto
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button disabled={!accountId || confirming} onClick={() => onConfirm(accountId)}>
          {confirming ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}{" "}
          Confirmar importação
        </Button>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 text-sm font-medium">
      <p>{label}</p>
      {children}
    </div>
  );
}
