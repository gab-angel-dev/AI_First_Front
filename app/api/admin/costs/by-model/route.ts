import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "Parâmetros 'start' e 'end' obrigatórios" }, { status: 400 });
  }

  try {
    const result = await query(
      `SELECT
         model_name,
         COALESCE(SUM(total_tokens), 0) AS total_tokens,
         COALESCE(SUM(input_tokens), 0) AS input_tokens,
         COALESCE(SUM(output_tokens), 0) AS output_tokens
       FROM token_usage
       WHERE created_at >= $1 AND created_at <= $2::date + interval '1 day'
       GROUP BY model_name
       ORDER BY total_tokens DESC`,
      [start, end]
    );

    return NextResponse.json(
      result.rows.map((r: Record<string, unknown>) => ({
        model_name: String(r.model_name),
        total_tokens: Number(r.total_tokens),
        input_tokens: Number(r.input_tokens),
        output_tokens: Number(r.output_tokens),
      }))
    );
  } catch (e) {
    console.error("GET /api/admin/costs/by-model:", e);
    return NextResponse.json({ error: "Erro ao buscar distribuição por modelo" }, { status: 500 });
  }
}