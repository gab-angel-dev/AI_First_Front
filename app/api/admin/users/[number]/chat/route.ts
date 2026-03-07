import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { Chat } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params;
    const decoded = decodeURIComponent(number);
    const digitsOnly = decoded.replace(/\D/g, "");

    const result = await query(
      `SELECT id, session_id, sender, agent_name, message,
         TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS created_at
       FROM chat
       WHERE session_id = $1
          OR session_id = $1 || '@s.whatsapp.net'
          OR session_id = $2
          OR session_id = $2 || '@s.whatsapp.net'
          OR regexp_replace(session_id, '[^0-9]', '', 'g') = $2
       ORDER BY created_at ASC`,
      [decoded, digitsOnly]
    );

    const rows = result.rows || [];
    const messages = rows.map((r: Record<string, unknown>) => ({
      id: Number(r.id),
      session_id: String(r.session_id),
      sender: r.sender as "human" | "ai" | "user",
      agent_name: r.agent_name != null ? String(r.agent_name) : null,
      message: (r.message as Chat["message"]) || {},
      created_at: String(r.created_at), // ex: "2026-03-06T17:27:00"
    }));

    return NextResponse.json(messages);
  } catch (e) {
    console.error("GET /api/admin/users/[number]/chat:", e);
    return NextResponse.json(
      { error: "Erro ao buscar histórico" },
      { status: 500 }
    );
  }
}