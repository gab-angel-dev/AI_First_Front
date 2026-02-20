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
         tu.phone_number,
         u.complete_name,
         COUNT(*) AS interacoes,
         COALESCE(SUM(tu.input_tokens), 0)  AS input_tokens,
         COALESCE(SUM(tu.output_tokens), 0) AS output_tokens,
         COALESCE(SUM(tu.total_tokens), 0)  AS total_tokens,
         array_agg(DISTINCT tu.model_name)  AS models
       FROM token_usage tu
       LEFT JOIN users u ON u.phone_number = tu.phone_number
       WHERE tu.created_at >= $1 AND tu.created_at <= $2::date + interval '1 day'
       GROUP BY tu.phone_number, u.complete_name
       ORDER BY total_tokens DESC
       LIMIT 20`,
      [start, end]
    );

    return NextResponse.json(
      result.rows.map((r: Record<string, unknown>) => {
        const models = (r.models as string[]) ?? [];
        // Custo aproximado: usa primeiro modelo do usuário
        const custo = calcularCusto(
          Number(r.input_tokens),
          Number(r.output_tokens),
          models[0] ?? ""
        );
        return {
          phone_number: String(r.phone_number),
          complete_name: r.complete_name ? String(r.complete_name) : null,
          interacoes: Number(r.interacoes),
          input_tokens: Number(r.input_tokens),
          output_tokens: Number(r.output_tokens),
          total_tokens: Number(r.total_tokens),
          estimated_cost_usd: custo,
        };
      })
    );
  } catch (e) {
    console.error("GET /api/admin/costs/by-user:", e);
    return NextResponse.json({ error: "Erro ao buscar consumo por usuário" }, { status: 500 });
  }
}