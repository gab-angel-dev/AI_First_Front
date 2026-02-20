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
         DATE(created_at) AS dia,
         COALESCE(SUM(input_tokens), 0)  AS entrada,
         COALESCE(SUM(output_tokens), 0) AS saida
       FROM token_usage
       WHERE created_at >= $1 AND created_at <= $2::date + interval '1 day'
       GROUP BY dia
       ORDER BY dia ASC`,
      [start, end]
    );

    return NextResponse.json(
      result.rows.map((r: Record<string, unknown>) => ({
        dia: String(r.dia).slice(0, 10),
        entrada: Number(r.entrada),
        saida: Number(r.saida),
      }))
    );
  } catch (e) {
    console.error("GET /api/admin/costs/tokens-by-day:", e);
    return NextResponse.json({ error: "Erro ao buscar tokens por dia" }, { status: 500 });
  }
}