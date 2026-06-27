import { del, list } from "@vercel/blob";
import { NextResponse } from "next/server";
import { refreshPtaxRates } from "@/server/services/fx/ptax-service";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const fx = await refreshPtaxRates();
  let cleaned = 0;
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "temporary-imports/", cursor, limit: 1000 });
    const abandoned = page.blobs.filter(
      (blob) => Date.now() - blob.uploadedAt.getTime() > 24 * 60 * 60 * 1000,
    );
    if (abandoned.length) await del(abandoned.map((blob) => blob.url));
    cleaned += abandoned.length;
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return NextResponse.json({ ok: true, fx, cleaned });
}
