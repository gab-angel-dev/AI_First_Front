import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { adicionarEvento } from "@/lib/google-calendar";
import { createSchedulerMessage } from "@/lib/scheduler";
import { sendText } from "@/lib/evo";

export const runtime = "nodejs";

// ─── GET /api/admin/agenda ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const doctor = searchParams.get("doctor") || "";

  if (!start || !end) {
    return NextResponse.json(
      { error: "Parâmetros 'start' e 'end' obrigatórios" },
      { status: 400 }
    );
  }

  try {
    const params: unknown[] = [start, end];
    let doctorFilter = "";
    if (doctor) {
      params.push(doctor);
      doctorFilter = `AND ce.dr_responsible = $${params.length}`;
    }

    const result = await query(
      `SELECT
         ce.id,
         ce.event_id,
         ce.user_number,
         COALESCE(u.complete_name, ce.user_number) AS patient_name,
         u.metadata,
         ce.dr_responsible,
         ce.procedure,
         ce.description,
         ce.status,
         ce.summary,
         ce.start_time,
         ce.end_time,
         ce.created_at
       FROM calendar_events ce
       LEFT JOIN users u ON u.phone_number = ce.user_number
       WHERE ce.start_time >= $1
         AND ce.start_time <= $2::date + interval '1 day'
         ${doctorFilter}
       ORDER BY ce.start_time ASC`,
      params
    );

    return NextResponse.json(
      result.rows.map((r: Record<string, unknown>) => ({
        id: Number(r.id),
        event_id: String(r.event_id),
        user_number: String(r.user_number),
        patient_name: String(r.patient_name),
        convenio: (r.metadata as Record<string, unknown> | null)?.convenio_tipo ?? null,
        dr_responsible: String(r.dr_responsible),
        procedure: r.procedure ? String(r.procedure) : null,
        description: r.description ? String(r.description) : null,
        status: String(r.status),
        summary: r.summary ? String(r.summary) : null,
        start_time: r.start_time,
        end_time: r.end_time,
        created_at: r.created_at,
      }))
    );
  } catch (e) {
    console.error("GET /api/admin/agenda:", e);
    return NextResponse.json({ error: "Erro ao listar agenda" }, { status: 500 });
  }
}

// ─── POST /api/admin/agenda ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      user_number,
      doctor_id,
      procedure: proc,
      convenio,  // ← novo campo
      start_time,
      description,
    } = body as {
      user_number: string;
      doctor_id: string;
      procedure: string;
      convenio?: string | null;
      start_time: string;
      description?: string;
    };

    if (!user_number || !doctor_id || !proc || !start_time) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    // Validação: não permite agendamento no passado
    const startDate = new Date(start_time);
    if (startDate < new Date()) {
      return NextResponse.json(
        { error: "Não é possível agendar para uma data/hora no passado" },
        { status: 400 }
      );
    }

    // Busca dados do doutor
    const drRes = await query(
      `SELECT id, name, calendar_id, doctor_number, procedures FROM doctor_rules WHERE id = $1 AND active = true`,
      [doctor_id]
    );
    if (!drRes.rows.length) {
      return NextResponse.json({ error: "Doutor não encontrado ou inativo" }, { status: 404 });
    }
    const doctor = drRes.rows[0] as {
      id: string;
      name: string;
      calendar_id: string;
      doctor_number: string | null;
      procedures: Array<{ nome: string; duracao_minutos: number }>;
    };

    // Busca duração do procedimento
    const procedureData = doctor.procedures.find((p) => p.nome === proc);
    if (!procedureData) {
      return NextResponse.json({ error: "Procedimento não encontrado para este doutor" }, { status: 404 });
    }

    // Calcula end_time
    const endDate = new Date(startDate.getTime() + procedureData.duracao_minutos * 60 * 1000);
    const end_time = endDate.toISOString();

    // Busca dados do paciente
    const userRes = await query(
      `SELECT complete_name, metadata FROM users WHERE phone_number = $1`,
      [user_number]
    );
    const patient = userRes.rows[0] as {
      complete_name: string | null;
      metadata: Record<string, unknown> | null;
    } | undefined;
    const patientName = patient?.complete_name ?? user_number;

    // Cria evento no Google Calendar
    const summary = `Consulta ${patientName}`;
    const calEvent = await adicionarEvento(
      doctor.calendar_id,
      summary,
      start_time,
      end_time,
      description ?? "Agendado pelo painel admin"
    );

    // Insere no BD
    const insertRes = await query(
      `INSERT INTO calendar_events
         (user_number, event_id, summary, dr_responsible, procedure, description, status, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)
       RETURNING id, event_id, status, start_time, end_time`,
      [
        user_number,
        calEvent.id,
        summary,
        doctor.name,
        proc,
        description ?? "Agendado pelo painel admin",
        start_time,
        end_time,
      ]
    );

    const row = insertRes.rows[0] as Record<string, unknown>;

    // Notifica doutor via WhatsApp (fire and forget)
    if (doctor.doctor_number) {
      const dataStr = startDate.toLocaleDateString("pt-BR");
      const horaInicio = startDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const horaFim = endDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

      // Prioridade: convenio enviado pelo painel → metadata do usuário → "Não informado"
      const convenioLabel = convenio
        ? convenio.charAt(0).toUpperCase() + convenio.slice(1)
        : (patient?.metadata as Record<string, unknown> | null)?.convenio_tipo as string
          ?? "Não informado";

      const mensagem = `🔔 *Novo Agendamento Realizado*\n\n👤 Paciente: ${patientName}\n📞 Telefone: ${user_number}\n📅 Data: ${dataStr}\n🕐 Horário: ${horaInicio} às ${horaFim}\nConvênio: ${convenioLabel}\nProcedimento: ${proc}\nObservações: ${description ?? "—"}\n\nVerifique a agenda ou entre em contato.`;

      sendText(doctor.doctor_number, mensagem).catch((e) =>
        console.error("Erro ao notificar doutor:", e)
      );
    }

    // Cria lembrete no scheduler (fire and forget)
    createSchedulerMessage(calEvent.id, user_number, start_time).catch((e) =>
      console.error("Erro ao criar lembrete:", e)
    );

    return NextResponse.json(
      {
        event_id: String(row.event_id),
        start_time: row.start_time,
        end_time: row.end_time,
        status: String(row.status),
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/admin/agenda:", e);
    return NextResponse.json({ error: "Erro ao criar agendamento" }, { status: 500 });
  }
}