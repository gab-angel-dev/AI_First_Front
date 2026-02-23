const BASE_URL = (process.env.BASE_URL_SCHEDULER ?? "").replace(/\/+$/, "");
const API_TOKEN = process.env.API_TOKEN_SCHEDULER ?? "";
const WEBHOOK_URL = process.env.WEBHOOK_URL_SCHEDULER ?? "";
const HOURS_BEFORE = 1; // 1 hora antes da consulta

function headers() {
  return {
    Authorization: `Bearer ${API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

export async function createSchedulerMessage(
  eventId: string,
  numero: string,
  scheduleTime: string
): Promise<void> {
  if (!BASE_URL || !API_TOKEN || !WEBHOOK_URL) {
    console.warn("Scheduler não configurado — lembrete não criado");
    return;
  }

  const schedule = new Date(scheduleTime);
  const sendDate = new Date(schedule.getTime() - HOURS_BEFORE * 60 * 60 * 1000);

  // Garante formato ISO sem offset (Z no final)
  const sendDateIso = sendDate.toISOString();

  const payload = {
    id: eventId,
    scheduleTo: sendDateIso,
    payload: {
      numero,
      mensagem:
        "Olá! Passando para lembrar da sua consulta.\nSe houver qualquer imprevisto, entre em contato com o consultório.\nTenha um ótimo dia! 😊",
    },
    webhookUrl: WEBHOOK_URL,
  };

  const res = await fetch(`${BASE_URL}/messages`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text();
    // 409 = já existe, não é erro crítico
    if (res.status === 409) {
      console.warn(`Scheduler: lembrete já existe para ${eventId}`);
      return;
    }
    console.error(`Scheduler erro ${res.status}: ${text}`);
  } else {
    console.log(`Scheduler: lembrete criado para ${eventId} em ${sendDateIso}`);
  }
}

export async function deleteSchedulerMessage(eventId: string): Promise<void> {
  if (!BASE_URL || !API_TOKEN || !eventId) {
    console.warn("Scheduler não configurado ou eventId vazio");
    return;
  }

  // Google Calendar event IDs podem conter caracteres especiais (@, _)
  // que precisam ser URL-encoded
  const encodedId = encodeURIComponent(eventId);

  const res = await fetch(`${BASE_URL}/messages/${encodedId}`, {
    method: "DELETE",
    headers: headers(),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    // 404 = já foi deletado ou nunca existiu, não é erro crítico
    if (res.status === 404) {
      console.warn(`Scheduler: lembrete ${eventId} não encontrado (já deletado?)`);
      return;
    }
    console.error(`Scheduler delete erro ${res.status}: ${await res.text()}`);
  } else {
    console.log(`Scheduler: lembrete deletado para ${eventId}`);
  }
}