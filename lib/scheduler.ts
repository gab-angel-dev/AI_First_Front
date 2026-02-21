const BASE_URL = process.env.BASE_URL_SCHEDULER ?? "";
const API_TOKEN = process.env.API_TOKEN_SCHEDULER ?? "";
const WEBHOOK_URL = process.env.WEBHOOK_URL_SCHEDULER ?? "";
const HOURS_BEFORE = 0.1;

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
  const sendDateIso = sendDate.toISOString().replace("+00:00", "Z");

  const payload = {
    id: eventId,
    scheduleTo: sendDateIso,
    payload: {
      mensagem:
        "Olá, passando aqui para lembrar da nossa consulta.\nSe houver qualquer imprevisto entre em contato com o doutor(a) responsável pela sua consulta.\nTenha um ótimo dia!!",
      numero,
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
    console.error(`Scheduler erro ${res.status}: ${await res.text()}`);
  }
}

export async function deleteSchedulerMessage(eventId: string): Promise<void> {
  if (!BASE_URL || !API_TOKEN || !eventId) {
    console.warn("Scheduler não configurado ou eventId vazio");
    return;
  }

  const res = await fetch(`${BASE_URL}/messages/${eventId}`, {
    method: "DELETE",
    headers: headers(),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    console.error(`Scheduler delete erro ${res.status}: ${await res.text()}`);
  }
}