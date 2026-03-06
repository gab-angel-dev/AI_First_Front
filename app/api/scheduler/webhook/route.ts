import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendText } from "@/lib/evo";

export const runtime = "nodejs";

interface SchedulerPayload {
  numero?: string;
  mensagem?: string;
}

interface SchedulerWebhookBody {
  id?: string;
  payload?: SchedulerPayload;
}

export async function POST(req: NextRequest) {
  console.log("\n" + "=".repeat(60));
  console.log("🔔 SCHEDULER DISPAROU — Enviando lembrete");
  console.log("=".repeat(60));

  try {
    const body = (await req.json()) as SchedulerWebhookBody;
    console.log("Payload recebido:", JSON.stringify(body, null, 2));

    const { numero, mensagem } = (body.payload ?? body) as SchedulerPayload;

    if (!numero || !mensagem) {
      console.error("❌ Payload inválido: número ou mensagem ausente");
      return NextResponse.json(
        { error: "Número e mensagem são obrigatórios" },
        { status: 400 }
      );
    }

    console.log(`📱 Número: ${numero}`);
    console.log(`💬 Mensagem: ${mensagem}`);

    await sendText(numero, mensagem);

    await query(
      `INSERT INTO chat (session_id, sender, agent_name, message)
       VALUES ($1, 'ai', 'lembrete', $2)`,
      [numero, JSON.stringify({ type: "ai", content: mensagem })]
    ).catch((e) => console.error("Erro ao salvar lembrete no chat:", e));

    console.log(`✅ Mensagem enviada com sucesso para ${numero}!`);
    console.log("=".repeat(60) + "\n");

    return NextResponse.json({ status: "enviado", numero }, { status: 200 });
  } catch (e) {
    console.error("❌ Erro ao processar webhook do scheduler:", e);
    return NextResponse.json(
      { error: "Erro interno ao processar webhook" },
      { status: 500 }
    );
  }
}