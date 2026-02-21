import { NextRequest, NextResponse } from "next/server";
import { verificarDisponibilidade } from "@/lib/google-calendar";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const calendarId = searchParams.get("calendar_id");
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!calendarId || !start || !end) {
    return NextResponse.json(
      { error: "Parâmetros 'calendar_id', 'start' e 'end' obrigatórios" },
      { status: 400 }
    );
  }

  try {
    const result = await verificarDisponibilidade(calendarId, start, end);
    return NextResponse.json(result);
  } catch (e) {
    console.error("GET /api/admin/agenda/availability:", e);
    return NextResponse.json({ error: "Erro ao verificar disponibilidade" }, { status: 500 });
  }
}