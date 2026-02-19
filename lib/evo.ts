/**
 * Cliente Evolution API para envio de mensagens WhatsApp
 */

const BASE_URL = process.env.BASE_URL_EVO || "";
const API_KEY = process.env.API_KEY_EVO || "";
const INSTANCE = process.env.INSTANCE_NAME || "";

export async function sendText(number: string, text: string): Promise<void> {
  if (!BASE_URL || !API_KEY || !INSTANCE) {
    throw new Error(
      "Evolution API não configurada: BASE_URL_EVO, API_KEY_EVO, INSTANCE_NAME obrigatórios"
    );
  }
  const url = `${BASE_URL.replace(/\/$/, "")}/message/sendText/${INSTANCE}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: API_KEY,
    },
    body: JSON.stringify({
      number: number.replace(/\D/g, ""),
      text,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Evolution API erro ${res.status}: ${err}`);
  }
}
