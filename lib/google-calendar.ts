import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

function buildClient(): { cal: ReturnType<typeof google.calendar>; oauth2: OAuth2Client } {
  const tokenJson = process.env.GOOGLE_CALENDAR_TOKEN_JSON;
  if (!tokenJson) {
    throw new Error("GOOGLE_CALENDAR_TOKEN_JSON não configurada no .env");
  }

  let tokenData: Record<string, unknown>;
  try {
    tokenData = JSON.parse(tokenJson);
  } catch {
    throw new Error("GOOGLE_CALENDAR_TOKEN_JSON inválida — verifique o JSON");
  }
  const oauth2 = new google.auth.OAuth2(
    tokenData.client_id as string,
    tokenData.client_secret as string,
    "http://localhost"
  );

  oauth2.setCredentials({
    access_token: tokenData.token as string,
    refresh_token: tokenData.refresh_token as string,
    scope: SCOPES.join(" "),
    token_type: "Bearer",
    expiry_date: tokenData.expiry
      ? new Date(tokenData.expiry as string).getTime()
      : undefined,
  });

  const cal = google.calendar({ version: "v3", auth: oauth2 });
  return { cal, oauth2 };
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
}

export async function verificarDisponibilidade(
  calendarId: string,
  startTime: string,
  endTime: string
): Promise<{ available: boolean; conflict?: CalendarEvent }> {
  const { cal } = buildClient();
  const res = await cal.events.list({
    calendarId,
    timeMin: startTime,
    timeMax: endTime,
    singleEvents: true,
    orderBy: "startTime",
  });

  const events = res.data.items ?? [];
  if (events.length === 0) return { available: true };

  const first = events[0];
  return {
    available: false,
    conflict: {
      id: first.id ?? "",
      summary: first.summary ?? "Sem título",
      start: first.start?.dateTime ?? first.start?.date ?? "",
      end: first.end?.dateTime ?? first.end?.date ?? "",
    },
  };
}

export async function adicionarEvento(
  calendarId: string,
  summary: string,
  startTime: string,
  endTime: string,
  description = ""
): Promise<CalendarEvent> {
  const { cal } = buildClient();
  const res = await cal.events.insert({
    calendarId,
    requestBody: {
      summary,
      description,
      start: { dateTime: startTime, timeZone: "America/Sao_Paulo" },
      end: { dateTime: endTime, timeZone: "America/Sao_Paulo" },
    },
  });

  const ev = res.data;
  return {
    id: ev.id ?? "",
    summary: ev.summary ?? "",
    start: ev.start?.dateTime ?? "",
    end: ev.end?.dateTime ?? "",
  };
}

export async function deletarEvento(
  calendarId: string,
  eventId: string
): Promise<void> {
  const { cal } = buildClient();
  await cal.events.delete({ calendarId, eventId });
}