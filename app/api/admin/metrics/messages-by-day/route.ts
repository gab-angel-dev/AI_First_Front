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
         (DATE(created_at AT TIME ZONE 'America/Sao_Paulo'))::text AS dia,
         sender,
         COUNT(*) AS total
       FROM chat
       WHERE created_at >= $1::date
         AND created_at < ($2::date + interval '1 day')
       GROUP BY dia, sender
       ORDER BY dia ASC`,
      [start, end]
    );

    // Pivota: { dia, user, ai, human }
    const map: Record<string, { dia: string; user: number; ai: number; human: number }> = {};
    for (const r of result.rows) {
      const dia = String(r.dia).slice(0, 10);
      if (!map[dia]) map[dia] = { dia, user: 0, ai: 0, human: 0 };
      const sender = String(r.sender) as "user" | "ai" | "human";
      if (sender in map[dia]) {
        (map[dia] as Record<string, number | string>)[sender] =
          ((map[dia] as Record<string, number | string>)[sender] as number) + Number(r.total);
      }
    }

    return NextResponse.json(Object.values(map));
  } catch (e) {
    console.error("GET /api/admin/metrics/messages-by-day:", e);
    return NextResponse.json({ error: "Erro ao buscar mensagens por dia" }, { status: 500 });
  }
}