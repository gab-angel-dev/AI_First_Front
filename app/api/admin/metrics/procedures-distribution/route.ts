import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

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
         INITCAP(LOWER(COALESCE(NULLIF(procedure, ''), 'Não informado'))) AS procedure,
         COUNT(*) AS total
       FROM calendar_events
       WHERE start_time >= $1::date
         AND start_time < ($2::date + interval '1 day')
       GROUP BY INITCAP(LOWER(COALESCE(NULLIF(procedure, ''), 'Não informado')))
       ORDER BY total DESC`,
      [start, end]
    );

    const rows = result.rows.map((r) => ({
      procedure: String(r.procedure),
      total: Number(r.total),
    }));

    if (rows.length <= 6) {
      return NextResponse.json(rows);
    }

    const top6 = rows.slice(0, 6);
    const outros = rows.slice(6).reduce((acc, r) => acc + r.total, 0);
    return NextResponse.json([...top6, { procedure: "Outros", total: outros }]);
  } catch (e) {
    console.error("GET /api/admin/metrics/procedures-distribution:", e);
    return NextResponse.json({ error: "Erro ao buscar procedimentos" }, { status: 500 });
  }
}