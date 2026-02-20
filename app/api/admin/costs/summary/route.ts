import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { calcularCusto, getUsdToBrl } from "@/lib/costs";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "Parâmetros 'start' e 'end' obrigatórios" }, { status: 400 });
  }

  try {
    const [totalsRes, modelsRes, { rate }] = await Promise.all([
      query(
        `SELECT
           COALESCE(SUM(input_tokens), 0)  AS input_tokens,
           COALESCE(SUM(output_tokens), 0) AS output_tokens,
           COALESCE(SUM(total_tokens), 0)  AS total_tokens
         FROM token_usage
         WHERE created_at >= $1 AND created_at <= $2::date + interval '1 day'`,
        [start, end]
      ),
      query(
        `SELECT model_name,
                COALESCE(SUM(input_tokens), 0)  AS input_tokens,
                COALESCE(SUM(output_tokens), 0) AS output_tokens
         FROM token_usage
         WHERE created_at >= $1 AND created_at <= $2::date + interval '1 day'
         GROUP BY model_name`,
        [start, end]
      ),
      getUsdToBrl(),
    ]);

    const totals = totalsRes.rows[0] as {
      input_tokens: string;
      output_tokens: string;
      total_tokens: string;
    };

    // Calcula custo por modelo e soma
    let estimatedCostUsd = 0;
    for (const row of modelsRes.rows as { model_name: string; input_tokens: string; output_tokens: string }[]) {
      estimatedCostUsd += calcularCusto(
        Number(row.input_tokens),
        Number(row.output_tokens),
        row.model_name
      );
    }
    estimatedCostUsd = Math.round(estimatedCostUsd * 1_000_000) / 1_000_000;

    return NextResponse.json({
      total_tokens: Number(totals.total_tokens),
      input_tokens: Number(totals.input_tokens),
      output_tokens: Number(totals.output_tokens),
      estimated_cost_usd: estimatedCostUsd,
      estimated_cost_brl: Math.round(estimatedCostUsd * rate * 100) / 100,
      exchange_rate: rate,
      period: { start, end },
    });
  } catch (e) {
    console.error("GET /api/admin/costs/summary:", e);
    return NextResponse.json({ error: "Erro ao buscar resumo de custos" }, { status: 500 });
  }
}