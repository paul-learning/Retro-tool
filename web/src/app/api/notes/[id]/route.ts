import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type Params = { id: string };

export async function DELETE(
  _req: Request,
  ctx: { params: Params | Promise<Params> }
) {
  const { id } = await ctx.params;

  if (!id) {
    return NextResponse.json({ error: "id missing" }, { status: 400 });
  }

  await prisma.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
