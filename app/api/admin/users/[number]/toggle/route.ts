import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params;
    const decoded = decodeURIComponent(number);

    const check = await query(
      "SELECT require_human FROM users WHERE phone_number = $1",
      [decoded]
    );
    if (!check.rows?.length) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    await query(
      `UPDATE users SET require_human = NOT require_human, updated_at = NOW()
       WHERE phone_number = $1`,
      [decoded]
    );

    const result = await query(
      "SELECT phone_number, require_human FROM users WHERE phone_number = $1",
      [decoded]
    );
    const row = result.rows?.[0] as { phone_number: string; require_human: boolean };
    return NextResponse.json({
      phone_number: row.phone_number,
      require_human: row.require_human,
    });
  } catch (e) {
    console.error("PUT /api/admin/users/[number]/toggle:", e);
    return NextResponse.json(
      { error: "Erro ao alternar status" },
      { status: 500 }
    );
  }
}
