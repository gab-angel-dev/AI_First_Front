import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await query(
      `DELETE FROM rag_embeddings WHERE id = $1`,
      [id]
    );
    if ((result.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: "Embedding não encontrado" }, { status: 404 });
    }
    return NextResponse.json({ deleted: 1 });
  } catch (e) {
    console.error("DELETE /api/admin/embeddings/item/[id]:", e);
    return NextResponse.json({ error: "Erro ao deletar embedding" }, { status: 500 });
  }
}