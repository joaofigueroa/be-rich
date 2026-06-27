"use client";

import { Button } from "@be-rich/ui/button";
import { Input } from "@be-rich/ui/input";
import {
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  FileSpreadsheet,
  LoaderCircle,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import type { DragEvent, FormEvent } from "react";
import { useRef, useState } from "react";

type Account = { id: string; name: string; type: string };
type Preview = {
  batch: {
    id: string;
    filename: string;
    product: "ACCOUNT" | "CREDIT_CARD";
    totalRows: number;
    validRows: number;
    warnings: string[];
  };
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  function resetImport() {
    setPreview(null);
    setSelectedFile(null);
    setIsDragging(false);
    setError("");
    setState("idle");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function parse(form: FormData) {
    if (!selectedFile) {
      setError("Selecione ou arraste um arquivo para preparar a revisão.");
      setState("error");
      return;
    }
    setState("uploading");
    setError("");
    form.set("workspaceId", workspaceId);
    form.set("file", selectedFile, selectedFile.name);
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
  function handleFile(file: File | undefined) {
    if (!file) return;
    setSelectedFile(file);
    setPreview(null);
    setError("");
    setState("idle");
  }
  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files[0]);
  }
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void parse(new FormData(event.currentTarget));
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
        <Button type="button" className="mt-5" onClick={resetImport}>
          <UploadCloud className="size-4" /> Fazer nova importação
        </Button>
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
        onBack={resetImport}
      />
    );
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
        aria-label="Selecionar ou arrastar extrato"
        aria-busy={state === "uploading"}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        disabled={state === "uploading"}
        className={`group relative grid w-full place-items-center rounded-2xl border-2 border-dashed px-5 py-14 text-center transition-colors ${
          isDragging
            ? "border-emerald-600 bg-emerald-500/10"
            : selectedFile
              ? "border-emerald-500/50 bg-emerald-500/5"
              : "border-border bg-muted/25 hover:border-emerald-600/50 hover:bg-emerald-500/5"
        } ${state === "uploading" ? "cursor-wait opacity-80" : ""}`}
      >
        {state === "uploading" ? (
          <>
            <span className="grid size-12 place-items-center rounded-2xl bg-emerald-500/12 text-emerald-600">
              <LoaderCircle className="size-6 animate-spin" />
            </span>
            <span className="mt-4 font-semibold">Lendo arquivo e preparando revisão...</span>
            <span className="mt-1 text-sm text-muted-foreground">
              Isso pode levar alguns segundos em extratos maiores.
            </span>
          </>
        ) : selectedFile ? (
          <>
            <span className="grid size-12 place-items-center rounded-2xl bg-emerald-500/12 text-emerald-600">
              <FileCheck2 className="size-6" />
            </span>
            <span className="mt-4 max-w-full truncate font-semibold">{selectedFile.name}</span>
            <span className="mt-1 text-sm text-muted-foreground">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB · clique para trocar ou arraste
              outro arquivo
            </span>
          </>
        ) : (
          <>
            <span className="grid size-12 place-items-center rounded-2xl bg-emerald-500/12 text-emerald-600">
              <UploadCloud className="size-6" />
            </span>
            <span className="mt-4 font-semibold">Arraste seu extrato aqui</span>
            <span className="mt-1 text-sm text-muted-foreground">
              ou clique para selecionar · CSV, XLSX, OFX ou PDF textual · até 10 MB
            </span>
          </>
        )}
      </button>
      <Input
        ref={fileRef}
        name="file"
        type="file"
        accept=".csv,.xlsx,.ofx,.pdf"
        className="sr-only"
        onChange={(event) => handleFile(event.target.files?.[0])}
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
        <Button type="submit" disabled={!selectedFile || state === "uploading"}>
          {state === "uploading" ? (
            <>
              <LoaderCircle className="size-4 animate-spin" /> Preparando...
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
  const compatibleAccounts = accounts;
  const [accountId, setAccountId] = useState(compatibleAccounts[0]?.id ?? "");
  return (
    <div>
      <div className="mb-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-emerald-500/12 text-emerald-600">
            <CheckCircle2 className="size-4" />
          </span>
          <div>
            <p className="font-semibold">Arquivo lido com sucesso</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A revisão está pronta. Escolha a conta de destino e importe todos os lançamentos
              válidos quando estiver tudo certo.
            </p>
          </div>
        </div>
      </div>
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
          {compatibleAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </div>
      {!compatibleAccounts.length ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm"
        >
          Crie uma conta principal antes de confirmar esta importação.
        </p>
      ) : null}
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
            <>
              <LoaderCircle className="size-4 animate-spin" /> Importando...
            </>
          ) : (
            <>
              <CheckCircle2 className="size-4" /> Importar tudo
            </>
          )}
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
