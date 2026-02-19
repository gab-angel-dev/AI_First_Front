import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { DoctorRule } from "@/lib/types";
import type { CreateDoctorPayload } from "../route";

function rowToDoctor(row: Record<string, unknown>): DoctorRule {
  return {
    id: String(row.id),
    name: String(row.name),
    doctor_number: row.doctor_number != null ? String(row.doctor_number) : "",
    calendar_id: String(row.calendar_id ?? ""),
    active: Boolean(row.active),
    procedures: (row.procedures as DoctorRule["procedures"]) ?? [],
    available_weekdays: Array.isArray(row.available_weekdays) ? (row.available_weekdays as number[]) : [],
    working_hours: (row.working_hours as DoctorRule["working_hours"]) ?? {},
    insurances: Array.isArray(row.insurances) ? (row.insurances as string[]) : [],
    restrictions: (row.restrictions as Record<string, unknown> | null) ?? null,
    created_at: new Date(row.created_at as string),
    updated_at: new Date(row.updated_at as string),
  };
}

function normalizePayload(payload: CreateDoctorPayload): CreateDoctorPayload {
  return {
    ...payload,
    insurances: payload.insurances?.map((s) => s.toLowerCase().trim()).filter(Boolean) ?? [],
    doctor_number: payload.doctor_number?.trim() || null,
  };
}

function validateDoctorPayload(payload: Partial<CreateDoctorPayload>): string | null {
  if (!payload.name || payload.name.trim().length < 3)
    return "Nome é obrigatório (mínimo 3 caracteres)";
  if (!payload.calendar_id?.trim()) return "calendar_id é obrigatório";
  if (!Array.isArray(payload.procedures) || payload.procedures.length < 1)
    return "É necessário pelo menos 1 procedimento";
  for (let i = 0; i < payload.procedures!.length; i++) {
    const p = payload.procedures![i];
    if (!p.nome?.trim()) return `Procedimento ${i + 1}: nome obrigatório`;
    const dur = Number(p.duracao_minutos);
    if (!Number.isInteger(dur) || dur < 15)
      return `Procedimento ${i + 1}: duração mínima 15 minutos`;
    if (p.preco !== "definir_com_doutor" && (typeof p.preco !== "number" || p.preco < 0))
      return `Procedimento ${i + 1}: preço inválido`;
  }
  if (!Array.isArray(payload.available_weekdays) || payload.available_weekdays.length < 1)
    return "Selecione pelo menos 1 dia da semana";
  const wh = payload.working_hours;
  if (!wh?.manha?.inicio || !wh?.manha?.fim)
    return "Horário da manhã é obrigatório";
  const mIni = wh.manha.inicio;
  const mFim = wh.manha.fim;
  if (mIni >= mFim) return "Horário manhã: início deve ser antes do fim";
  if (wh.tarde?.inicio && wh.tarde?.fim) {
    if (wh.tarde.inicio >= wh.tarde.fim)
      return "Horário tarde: início deve ser antes do fim";
  }
  const num = payload.doctor_number?.replace(/\D/g, "") ?? "";
  if (num && (num.length < 10 || num.length > 13))
    return "WhatsApp: entre 10 e 13 dígitos";
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await query(
      `SELECT id, name, doctor_number, calendar_id, active, procedures,
              available_weekdays, working_hours, insurances, restrictions,
              created_at, updated_at
       FROM doctor_rules WHERE id = $1`,
      [id]
    );
    const row = result.rows?.[0];
    if (!row) {
      return NextResponse.json({ error: "Doutor não encontrado" }, { status: 404 });
    }
    const doctor = rowToDoctor(row as Record<string, unknown>);
    return NextResponse.json(doctor);
  } catch (e) {
    console.error("GET /api/admin/doctors/[id]:", e);
    return NextResponse.json(
      { error: "Erro ao buscar doutor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as Partial<CreateDoctorPayload>;
    const payload = normalizePayload(body as CreateDoctorPayload);
    const err = validateDoctorPayload(payload);
    if (err) return NextResponse.json({ error: err }, { status: 422 });

    const check = await query("SELECT id FROM doctor_rules WHERE id = $1", [id]);
    if (!check.rows?.length) {
      return NextResponse.json({ error: "Doutor não encontrado" }, { status: 404 });
    }

    await query(
      `UPDATE doctor_rules SET
        name = $1, doctor_number = $2, calendar_id = $3, active = $4,
        procedures = $5, available_weekdays = $6, working_hours = $7,
        insurances = $8, restrictions = $9, updated_at = NOW()
       WHERE id = $10`,
      [
        payload.name.trim(),
        payload.doctor_number,
        payload.calendar_id.trim(),
        payload.active,
        JSON.stringify(payload.procedures),
        JSON.stringify(payload.available_weekdays),
        JSON.stringify(payload.working_hours),
        JSON.stringify(payload.insurances ?? []),
        payload.restrictions ? JSON.stringify(payload.restrictions) : null,
        id,
      ]
    );

    const result = await query(
      `SELECT id, name, doctor_number, calendar_id, active, procedures,
              available_weekdays, working_hours, insurances, restrictions,
              created_at, updated_at FROM doctor_rules WHERE id = $1`,
      [id]
    );
    const row = result.rows?.[0] as Record<string, unknown>;
    const doctor = rowToDoctor(row);
    return NextResponse.json(doctor);
  } catch (e) {
    console.error("PUT /api/admin/doctors/[id]:", e);
    return NextResponse.json(
      { error: "Erro ao atualizar doutor" },
      { status: 500 }
    );
  }
}
