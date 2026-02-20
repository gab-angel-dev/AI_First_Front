import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ categoria: string }> }
) {
  try {
    const { categoria } = await params;
    const decoded = decodeURIComponent(categoria).toLowerCase().trim();

    if (!decoded) {
      return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });
    }

    const result = await query(
      `DELETE FROM rag_embeddings WHERE category = $1`,
      [decoded]
    );

    return NextResponse.json({ deleted: result.rowCount ?? 0 });
  } catch (e) {
    console.error("DELETE /api/admin/embeddings/category/[categoria]:", e);
    return NextResponse.json({ error: "Erro ao deletar categoria" }, { status: 500 });
  }
}