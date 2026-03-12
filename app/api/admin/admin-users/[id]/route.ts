import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

// ─── PUT /api/admin/admin-users/[id] — Editar nome/email ─────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";

    if (!name || name.length < 2)
      return NextResponse.json({ error: "Nome obrigatório (mínimo 2 caracteres)" }, { status: 422 });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: "Email inválido" }, { status: 422 });

    // Verifica se email já pertence a outro usuário
    const conflict = await query(
      "SELECT id FROM admin_users WHERE email = $1 AND id != $2",
      [email, id]
    );
    if (conflict.rows.length > 0)
      return NextResponse.json({ error: "Email já está em uso" }, { status: 409 });

    const result = await query(
      `UPDATE admin_users
       SET name = $1, email = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, email, active,
         TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS created_at`,
      [name, email, id]
    );

    if (!result.rows.length)
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    const row = result.rows[0] as Record<string, unknown>;
    return NextResponse.json({
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      active: Boolean(row.active),
      created_at: String(row.created_at),
    });
  } catch (e) {
    console.error("PUT /api/admin/admin-users/[id]:", e);
    return NextResponse.json({ error: "Erro ao atualizar usuário" }, { status: 500 });
  }
}

// ─── DELETE /api/admin/admin-users/[id] ──────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Impede deletar o último usuário ativo
    const countRes = await query(
      "SELECT COUNT(*) AS total FROM admin_users WHERE active = true"
    );
    const total = Number((countRes.rows[0] as Record<string, unknown>).total);

    const targetRes = await query(
      "SELECT active FROM admin_users WHERE id = $1",
      [id]
    );
    if (!targetRes.rows.length)
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    const isActive = Boolean((targetRes.rows[0] as Record<string, unknown>).active);
    if (isActive && total <= 1)
      return NextResponse.json(
        { error: "Não é possível deletar o único usuário ativo" },
        { status: 409 }
      );

    await query("DELETE FROM admin_users WHERE id = $1", [id]);
    return NextResponse.json({ deleted: 1 });
  } catch (e) {
    console.error("DELETE /api/admin/admin-users/[id]:", e);
    return NextResponse.json({ error: "Erro ao deletar usuário" }, { status: 500 });
  }
}

// ─── PATCH /api/admin/admin-users/[id] — Toggle ativo ou trocar senha ────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const action = body?.action as string | undefined;

    // ── Trocar senha ──────────────────────────────────────────────────────────
    if (action === "change-password") {
      const password = typeof body?.password === "string" ? body.password : "";
      if (password.length < 6)
        return NextResponse.json({ error: "Senha mínima de 6 caracteres" }, { status: 422 });

      const hash = await bcrypt.hash(password, 12);
      const result = await query(
        "UPDATE admin_users SET password = $1, updated_at = NOW() WHERE id = $2 RETURNING id",
        [hash, id]
      );
      if (!result.rows.length)
        return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

      return NextResponse.json({ ok: true });
    }

    // ── Toggle ativo/inativo ──────────────────────────────────────────────────
    if (action === "toggle") {
      const targetRes = await query(
        "SELECT active FROM admin_users WHERE id = $1",
        [id]
      );
      if (!targetRes.rows.length)
        return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

      const isCurrentlyActive = Boolean(
        (targetRes.rows[0] as Record<string, unknown>).active
      );

      // Impede desativar o último ativo
      if (isCurrentlyActive) {
        const countRes = await query(
          "SELECT COUNT(*) AS total FROM admin_users WHERE active = true"
        );
        const total = Number((countRes.rows[0] as Record<string, unknown>).total);
        if (total <= 1)
          return NextResponse.json(
            { error: "Não é possível desativar o único usuário ativo" },
            { status: 409 }
          );
      }

      const result = await query(
        `UPDATE admin_users
         SET active = NOT active, updated_at = NOW()
         WHERE id = $1
         RETURNING id, active`,
        [id]
      );

      const row = result.rows[0] as Record<string, unknown>;
      return NextResponse.json({ id: String(row.id), active: Boolean(row.active) });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (e) {
    console.error("PATCH /api/admin/admin-users/[id]:", e);
    return NextResponse.json({ error: "Erro ao processar operação" }, { status: 500 });
  }
}