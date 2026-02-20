import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get("categoria") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const offset = (page - 1) * limit;

  try {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (categoria) {
      params.push(categoria.toLowerCase());
      conditions.push(`category = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [countRes, itemsRes] = await Promise.all([
      query(`SELECT COUNT(*) AS total FROM rag_embeddings ${where}`, params),
      query(
        `SELECT id, content, category, created_at
         FROM rag_embeddings
         ${where}
         ORDER BY created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      ),
    ]);

    return NextResponse.json({
      total: Number(countRes.rows[0]?.total ?? 0),
      page,
      limit,
      items: itemsRes.rows.map((r: Record<string, unknown>) => ({
        id: String(r.id),
        content: String(r.content),
        category: String(r.category),
        created_at: r.created_at,
      })),
    });
  } catch (e) {
    console.error("GET /api/admin/embeddings:", e);
    return NextResponse.json({ error: "Erro ao listar embeddings" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "Lista de IDs vazia" }, { status: 400 });
    }

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
    const result = await query(
      `DELETE FROM rag_embeddings WHERE id IN (${placeholders})`,
      ids
    );

    return NextResponse.json({ deleted: result.rowCount ?? 0 });
  } catch (e) {
    console.error("DELETE /api/admin/embeddings (bulk):", e);
    return NextResponse.json({ error: "Erro ao deletar embeddings" }, { status: 500 });
  }
}