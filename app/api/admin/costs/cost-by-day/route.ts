import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { calcularCusto } from "@/lib/costs";

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
         model_name,
         COALESCE(SUM(input_tokens), 0)  AS input_tokens,
         COALESCE(SUM(output_tokens), 0) AS output_tokens
       FROM token_usage
       WHERE created_at >= $1 AND created_at <= $2::date + interval '1 day'
       GROUP BY dia, model_name
       ORDER BY dia ASC`,
      [start, end]
    );

    // Agrupa por dia e soma custo de todos os modelos
    const map: Record<string, number> = {};
    for (const r of result.rows as {
      dia: string;
      model_name: string;
      input_tokens: string;
      output_tokens: string;
    }[]) {
      const dia = String(r.dia).slice(0, 10);
      const custo = calcularCusto(
        Number(r.input_tokens),
        Number(r.output_tokens),
        r.model_name
      );
      map[dia] = (map[dia] ?? 0) + custo;
    }

    return NextResponse.json(
      Object.entries(map).map(([dia, custo_usd]) => ({
        dia,
        custo_usd: Math.round(custo_usd * 1_000_000) / 1_000_000,
      }))
    );
  } catch (e) {
    console.error("GET /api/admin/costs/cost-by-day:", e);
    return NextResponse.json({ error: "Erro ao buscar custo por dia" }, { status: 500 });
  }
}