import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireUser } from "@/server/services/auth/session-service";
import { stageStatementImport } from "@/server/services/imports/import-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let blobUrl: string | undefined;
  try {
    const user = await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024)
      return NextResponse.json({ error: "O arquivo excede 10 MB" }, { status: 413 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const blob = await put(
      `temporary-imports/${crypto.randomUUID()}-${file.name}`,
      Buffer.from(bytes),
      {
        access: "private",
        contentType: file.type || "application/octet-stream",
        addRandomSuffix: false,
      },
    );
    blobUrl = blob.url;
    const review = await stageStatementImport({
      workspaceId: String(form.get("workspaceId") ?? ""),
      accountId: form.get("accountId") ? String(form.get("accountId")) : undefined,
      institution: String(form.get("institution") ?? "generic") as
        | "nubank"
        | "inter"
        | "c6"
        | "mercado-pago"
        | "generic",
      product: String(form.get("product") ?? "ACCOUNT") as "ACCOUNT" | "CREDIT_CARD",
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      password: form.get("password") ? String(form.get("password")) : undefined,
      bytes,
      userId: user.id,
    });
    return NextResponse.json(review);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao processar o arquivo";
    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHENTICATED" ? 401 : 400 },
    );
  } finally {
    if (blobUrl) await del(blobUrl).catch(() => undefined);
  }
}
