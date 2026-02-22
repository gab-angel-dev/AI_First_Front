import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params;
    const decoded = decodeURIComponent(number);

    const result = await query(
      `SELECT phone_number, complete_name, require_human
       FROM users
       WHERE phone_number = $1`,
      [decoded]
    );

    if (!result.rows.length) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const row = result.rows[0] as {
      phone_number: string;
      complete_name: string | null;
      require_human: boolean;
    };

    return NextResponse.json({
      phone_number: row.phone_number,
      complete_name: row.complete_name,
      require_human: row.require_human,
    });
  } catch (e) {
    console.error("GET /api/admin/users/[number]:", e);
    return NextResponse.json({ error: "Erro ao buscar usuário" }, { status: 500 });
  }
}