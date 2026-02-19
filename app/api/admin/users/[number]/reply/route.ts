import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendText } from "@/lib/evo";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params;
    const decoded = decodeURIComponent(number);
    const body = await req.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { error: "Campo 'message' obrigatório" },
        { status: 422 }
      );
    }

    const userResult = await query(
      "SELECT require_human FROM users WHERE phone_number = $1",
      [decoded]
    );
    const user = userResult.rows?.[0] as { require_human: boolean } | undefined;
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }
    if (!user.require_human) {
      return NextResponse.json(
        { error: "IA está no controle. Ative Atendimento Humano para responder." },
        { status: 409 }
      );
    }

    await sendText(decoded, message);

    const msgPayload = JSON.stringify({ type: "ai", content: message });
    await query(
      `INSERT INTO chat (session_id, sender, agent_name, message)
       VALUES ($1, 'human', NULL, $2::jsonb)`,
      [decoded, msgPayload]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/admin/users/[number]/reply:", e);
    const msg = e instanceof Error ? e.message : "Erro ao enviar mensagem";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
