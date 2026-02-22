import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export interface UserListItem {
  phone_number: string;
  complete_name: string | null;
  require_human: boolean;
  last_message: string | null;
  last_activity: string | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  try {
    // ── Busca com filtro (autocomplete do modal de agendamento) ──────────────
    if (q) {
      const result = await query(
        `SELECT phone_number, complete_name
         FROM users
         WHERE phone_number ILIKE $1
            OR complete_name ILIKE $1
         ORDER BY complete_name ASC NULLS LAST
         LIMIT 10`,
        [`%${q}%`]
      );
      return NextResponse.json(
        result.rows.map((r: Record<string, unknown>) => ({
          phone_number: String(r.phone_number),
          complete_name: r.complete_name ? String(r.complete_name) : null,
        }))
      );
    }

    // ── Lista completa com última mensagem (aba Usuários) ────────────────────
    const result = await query(`
      WITH last_msg AS (
        SELECT DISTINCT ON (regexp_replace(session_id, '[^0-9]', '', 'g'))
          session_id,
          message,
          created_at
        FROM chat
        ORDER BY regexp_replace(session_id, '[^0-9]', '', 'g'), created_at DESC
      )
      SELECT
        u.phone_number,
        u.complete_name,
        u.require_human,
        lm.message   AS last_message_raw,
        lm.created_at AS last_activity
      FROM users u
      LEFT JOIN last_msg lm
        ON regexp_replace(lm.session_id, '[^0-9]', '', 'g')
         = regexp_replace(u.phone_number, '[^0-9]', '', 'g')
      ORDER BY lm.created_at DESC NULLS LAST, u.phone_number
    `);

    const users: UserListItem[] = result.rows.map((r: Record<string, unknown>) => {
      const msg = r.last_message_raw;
      let last_message: string | null = null;
      if (msg && typeof msg === "object") {
        const o = msg as Record<string, unknown>;
        last_message =
          typeof o.content === "string"
            ? o.content
            : typeof o.text === "string"
            ? o.text
            : null;
      } else if (typeof msg === "string") {
        last_message = msg;
      }
      return {
        phone_number: String(r.phone_number),
        complete_name: r.complete_name != null ? String(r.complete_name) : null,
        require_human: Boolean(r.require_human),
        last_message,
        last_activity: r.last_activity
          ? new Date(r.last_activity as string).toISOString()
          : null,
      };
    });

    return NextResponse.json(users);
  } catch (e) {
    console.error("GET /api/admin/users:", e);
    return NextResponse.json({ error: "Erro ao listar usuários" }, { status: 500 });
  }
}