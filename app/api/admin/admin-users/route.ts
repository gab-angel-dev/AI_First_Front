import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  active: boolean;
  created_at: string;
}

// ─── GET /api/admin/admin-users ───────────────────────────────────────────────

export async function GET() {
  try {
    const result = await query(
      `SELECT id, name, email, active,
              TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS created_at
       FROM admin_users
       ORDER BY created_at ASC`
    );

    return NextResponse.json(
      result.rows.map((r: Record<string, unknown>) => ({
        id: String(r.id),
        name: String(r.name),
        email: String(r.email),
        active: Boolean(r.active),
        created_at: String(r.created_at),
      }))
    );
  } catch (e) {
    console.error("GET /api/admin/admin-users:", e);
    return NextResponse.json({ error: "Erro ao listar usuários" }, { status: 500 });
  }
}

// ─── POST /api/admin/admin-users ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!name || name.length < 2)
      return NextResponse.json({ error: "Nome obrigatório (mínimo 2 caracteres)" }, { status: 422 });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: "Email inválido" }, { status: 422 });
    if (!password || password.length < 6)
      return NextResponse.json({ error: "Senha obrigatória (mínimo 6 caracteres)" }, { status: 422 });

    const exists = await query(
      "SELECT id FROM admin_users WHERE email = $1",
      [email]
    );
    if (exists.rows.length > 0)
      return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });

    const hash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO admin_users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, active,
         TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS created_at`,
      [name, email, hash]
    );

    const row = result.rows[0] as Record<string, unknown>;
    return NextResponse.json(
      {
        id: String(row.id),
        name: String(row.name),
        email: String(row.email),
        active: Boolean(row.active),
        created_at: String(row.created_at),
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/admin/admin-users:", e);
    return NextResponse.json({ error: "Erro ao criar usuário" }, { status: 500 });
  }
}
