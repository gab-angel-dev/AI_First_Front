import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { deleteFile } from "@/lib/files";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const check = await query(
      `SELECT id, category, "filename" FROM files WHERE id = $1`,
      [id]
    );

    if (!check.rows.length) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    }

    const row = check.rows[0] as { id: number; category: string; fileName: string };

    // Remove arquivo físico da VPS
    try {
      deleteFile(row.category, row.fileName);
    } catch (e) {
      console.warn("Arquivo físico não encontrado ao deletar:", e);
      // Continua mesmo se o arquivo físico não existir — remove do BD
    }

    await query(`DELETE FROM files WHERE id = $1`, [id]);

    return NextResponse.json({ deleted: 1 });
  } catch (e) {
    console.error("DELETE /api/admin/files/[id]:", e);
    return NextResponse.json({ error: "Erro ao deletar arquivo" }, { status: 500 });
  }
}