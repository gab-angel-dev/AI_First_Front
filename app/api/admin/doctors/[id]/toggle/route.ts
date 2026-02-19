import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const check = await query("SELECT id, active FROM doctor_rules WHERE id = $1", [id]);
    if (!check.rows?.length) {
      return NextResponse.json({ error: "Doutor não encontrado" }, { status: 404 });
    }

    await query(
      `UPDATE doctor_rules SET active = NOT active, updated_at = NOW() WHERE id = $1`,
      [id]
    );

    const result = await query(
      "SELECT id, active FROM doctor_rules WHERE id = $1",
      [id]
    );
    const row = result.rows?.[0] as { id: string; active: boolean };
    return NextResponse.json({ id: row.id, active: row.active });
  } catch (e) {
    console.error("PATCH /api/admin/doctors/[id]/toggle:", e);
    return NextResponse.json(
      { error: "Erro ao alternar status" },
      { status: 500 }
    );
  }
}
