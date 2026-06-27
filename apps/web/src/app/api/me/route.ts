import { and, eq, getDb, schema } from "@be-rich/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/server/services/auth/session-service";

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const { confirmation } = z
      .object({ confirmation: z.literal("EXCLUIR MINHA CONTA") })
      .parse(await request.json());
    if (!confirmation)
      return NextResponse.json({ error: "Confirmação obrigatória" }, { status: 400 });
    const ownedFamily = await getDb().query.workspaces.findFirst({
      where: and(eq(schema.workspaces.ownerId, user.id), eq(schema.workspaces.type, "FAMILY")),
    });
    if (ownedFamily)
      return NextResponse.json(
        {
          error:
            "Transfira ou encerre a propriedade dos espaços familiares antes de excluir sua conta.",
        },
        { status: 409 },
      );
    await getDb().delete(schema.users).where(eq(schema.users.id, user.id));
    return NextResponse.json(
      { deleted: true },
      { headers: { "clear-site-data": '"cache", "cookies", "storage"' } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao excluir os dados" },
      { status: 400 },
    );
  }
}
