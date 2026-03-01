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
    const [messagesRes, usersRes, appointmentsRes, avgRes] = await Promise.all([
      query(
        `SELECT COUNT(*) AS total FROM chat
         WHERE created_at >= $1::date
           AND created_at < ($2::date + interval '1 day')`,
        [start, end]
      ),
      query(
        `SELECT COUNT(*) AS total FROM users
         WHERE created_at >= $1::date
           AND created_at < ($2::date + interval '1 day')`,
        [start, end]
      ),
      query(
        `SELECT COUNT(*) AS total FROM calendar_events
         WHERE start_time >= $1::date
           AND start_time < ($2::date + interval '1 day')`,
        [start, end]
      ),
      query(
        `SELECT
           CASE WHEN COUNT(DISTINCT session_id) = 0 THEN 0
                ELSE ROUND(COUNT(*)::numeric / COUNT(DISTINCT session_id), 1)
           END AS avg
         FROM chat
         WHERE created_at >= $1::date
           AND created_at < ($2::date + interval '1 day')`,
        [start, end]
      ),
    ]);

    return NextResponse.json({
      total_messages: Number(messagesRes.rows[0]?.total ?? 0),
      total_users: Number(usersRes.rows[0]?.total ?? 0),
      total_appointments: Number(appointmentsRes.rows[0]?.total ?? 0),
      avg_messages_per_conversation: Number(avgRes.rows[0]?.avg ?? 0),
      period: { start, end },
    });
  } catch (e) {
    console.error("GET /api/admin/metrics/summary:", e);
    return NextResponse.json({ error: "Erro ao buscar métricas" }, { status: 500 });
  }
}