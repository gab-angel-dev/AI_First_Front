import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { deletarEvento } from "@/lib/google-calendar";
import { deleteSchedulerMessage } from "@/lib/scheduler";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ event_id: string }> }
) {
  try {
    const { event_id } = await params;

    // Busca o evento no BD para obter calendar_id do doutor
    const eventRes = await query(
      `SELECT ce.event_id, ce.user_number, ce.dr_responsible,
              dr.calendar_id
       FROM calendar_events ce
       LEFT JOIN doctor_rules dr ON dr.name = ce.dr_responsible
       WHERE ce.event_id = $1`,
      [event_id]
    );

    if (!eventRes.rows.length) {
      return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
    }

    const row = eventRes.rows[0] as {
      event_id: string;
      user_number: string;
      dr_responsible: string;
      calendar_id: string | null;
    };

    // Deleta no Google Calendar (se tiver calendar_id)
    if (row.calendar_id) {
      try {
        await deletarEvento(row.calendar_id, event_id);
      } catch (e) {
        console.warn("Evento não encontrado no Google Calendar:", e);
        // Continua mesmo se não encontrar no Calendar
      }
    }

    // Deleta no BD
    await query(`DELETE FROM calendar_events WHERE event_id = $1`, [event_id]);

    // Deleta lembrete no scheduler (fire and forget)
    deleteSchedulerMessage(event_id).catch((e) =>
      console.error("Erro ao deletar lembrete:", e)
    );

    return NextResponse.json({ status: "cancelado", event_id });
  } catch (e) {
    console.error("DELETE /api/admin/agenda/[event_id]:", e);
    return NextResponse.json({ error: "Erro ao cancelar agendamento" }, { status: 500 });
  }
}