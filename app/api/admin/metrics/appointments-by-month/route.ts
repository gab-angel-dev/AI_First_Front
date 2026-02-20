import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const result = await query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', start_time), 'YYYY-MM') AS mes,
         TO_CHAR(DATE_TRUNC('month', start_time), 'Mon/YY') AS mes_label,
         COUNT(*) AS total
       FROM calendar_events
       WHERE start_time >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
       GROUP BY DATE_TRUNC('month', start_time), mes_label
       ORDER BY DATE_TRUNC('month', start_time) ASC`
    );

    return NextResponse.json(result.rows.map((r) => ({
      mes: String(r.mes),
      mes_label: String(r.mes_label),
      total: Number(r.total),
    })));
  } catch (e) {
    console.error("GET /api/admin/metrics/appointments-by-month:", e);
    return NextResponse.json({ error: "Erro ao buscar agendamentos por mês" }, { status: 500 });
  }
}