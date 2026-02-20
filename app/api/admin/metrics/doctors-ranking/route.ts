import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// Nota: join feito por dr.name = ce.dr_responsible (por nome, não UUID).
// Considerar adicionar doctor_id em calendar_events futuramente.

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
         dr.name,
         dr.active,
         COUNT(ce.id) AS total_agendamentos
       FROM doctor_rules dr
       LEFT JOIN calendar_events ce
         ON ce.dr_responsible = dr.name
         AND ce.start_time >= $1
         AND ce.start_time <= $2::date + interval '1 day'
       GROUP BY dr.name, dr.active
       ORDER BY total_agendamentos DESC, dr.name ASC`,
      [start, end]
    );

    return NextResponse.json(result.rows.map((r) => ({
      name: String(r.name),
      active: Boolean(r.active),
      total_agendamentos: Number(r.total_agendamentos),
    })));
  } catch (e) {
    console.error("GET /api/admin/metrics/doctors-ranking:", e);
    return NextResponse.json({ error: "Erro ao buscar ranking de doutores" }, { status: 500 });
  }
}