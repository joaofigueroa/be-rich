import { getDb, schema } from "@be-rich/database";
import { NextResponse } from "next/server";
import { start } from "workflow/api";
import { z } from "zod";
import { requireUser } from "@/server/services/auth/session-service";
import { prepareImportConfirmation } from "@/server/services/imports/import-service";
import { processImportWorkflow } from "@/workflows/process-import";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = z
      .object({ batchId: z.uuidv7(), accountId: z.uuidv7() })
      .parse(await request.json());
    await prepareImportConfirmation({ ...input, userId: user.id });
    const run = await start(processImportWorkflow, [input.batchId]);
    await getDb()
      .update(schema.importBatches)
      .set({ workflowRunId: run.runId, status: "PROCESSING", updatedAt: new Date() })
      .where((await import("@be-rich/database")).eq(schema.importBatches.id, input.batchId));
    return NextResponse.json({ runId: run.runId, batchId: input.batchId }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao confirmar" },
      { status: 400 },
    );
  }
}
