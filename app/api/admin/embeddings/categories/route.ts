import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const result = await query(
      `SELECT DISTINCT category, COUNT(*) AS total
       FROM rag_embeddings
       GROUP BY category
       ORDER BY category ASC`
    );

    return NextResponse.json(
      result.rows.map((r: Record<string, unknown>) => ({
        category: String(r.category),
        total: Number(r.total),
      }))
    );
  } catch (e) {
    console.error("GET /api/admin/embeddings/categories:", e);
    return NextResponse.json({ error: "Erro ao listar categorias" }, { status: 500 });
  }
}