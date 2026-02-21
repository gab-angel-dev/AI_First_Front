"use client";

import { useEffect, useState, useCallback } from "react";
import { Calendar, dateFnsLocalizer, View, Event } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addMonths, subMonths, addWeeks, subWeeks, startOfMonth, endOfMonth, startOfWeek as startOfWeekFn, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Plus, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

// ─── Localizer ────────────────────────────────────────────────────────────────

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { "pt-BR": ptBR },
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface AgendaEvent {
  id: number;
  event_id: string;
  user_number: string;
  patient_name: string;
  convenio: string | null;
  dr_responsible: string;
  procedure: string | null;
  description: string | null;
  status: string;
  summary: string | null;
  start_time: string;
  end_time: string;
}

interface DoctorOption {
  id: string;
  name: string;
  calendar_id: string;
  procedures: Array<{ nome: string; duracao_minutos: number }>;
}

interface UserOption {
  phone_number: string;
  complete_name: string | null;
}

interface CalEvent extends Event {
  resource: AgendaEvent;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Gera cor consistente por nome do doutor via hash
function doctorColor(name: string): string {
  const COLORS = [
    "#6366f1", "#22c55e", "#f59e0b", "#ef4444",
    "#14b8a6", "#a855f7", "#ec4899", "#0ea5e9",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  canceled: "Cancelado",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  confirmed: "default",
  canceled: "destructive",
};

function getRangeForView(date: Date, view: View): { start: string; end: string } {
  if (view === "month") {
    const s = startOfMonth(date);
    const e = endOfMonth(date);
    return {
      start: format(startOfWeekFn(s, { weekStartsOn: 0 }), "yyyy-MM-dd"),
      end: format(endOfWeek(e, { weekStartsOn: 0 }), "yyyy-MM-dd"),
    };
  }
  // week
  const s = startOfWeek(date, { weekStartsOn: 0 });
  const e = endOfWeek(date, { weekStartsOn: 0 });
  return { start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd") };
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  open, message, onConfirm, onCancel,
}: { open: boolean; message: string; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-50 bg-background rounded-lg border p-6 shadow-lg max-w-sm w-full mx-4">
        <p className="text-sm mb-6">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>Confirmar</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Event Detail Modal ───────────────────────────────────────────────────────

function EventDetailModal({
  event, onClose, onCancel,
}: { event: AgendaEvent | null; onClose: () => void; onCancel: (eventId: string) => void }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);

  if (!event) return null;

  const start = new Date(event.start_time);
  const end = new Date(event.end_time);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 bg-background rounded-lg border p-6 shadow-lg max-w-md w-full mx-4">
        <ConfirmModal
          open={confirm}
          message={`Tem certeza que deseja cancelar a consulta de ${event.patient_name} em ${start.toLocaleDateString("pt-BR")}?`}
          onConfirm={() => { setConfirm(false); onCancel(event.event_id); onClose(); }}
          onCancel={() => setConfirm(false)}
        />

        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-semibold">{event.procedure ?? "Consulta"}</h2>
          <Badge variant={STATUS_VARIANTS[event.status] ?? "secondary"}>
            {STATUS_LABELS[event.status] ?? event.status}
          </Badge>
        </div>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Paciente</p>
              <p className="font-medium">{event.patient_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">WhatsApp</p>
              <p className="font-medium">{event.user_number}</p>
            </div>
          </div>

          {event.convenio && (
            <div>
              <p className="text-xs text-muted-foreground">Convênio</p>
              <p>{event.convenio}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Doutor</p>
              <p>{event.dr_responsible}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data</p>
              <p>{start.toLocaleDateString("pt-BR")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Início</p>
              <p>{start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fim</p>
              <p>{end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>

          {event.description && (
            <div>
              <p className="text-xs text-muted-foreground">Observações</p>
              <p>{event.description}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => router.push(`/usuarios?number=${event.user_number}`)}
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            Ir para o chat
          </Button>
          {event.status !== "canceled" && (
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => setConfirm(true)}
            >
              Cancelar Agendamento
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
}

// ─── New Appointment Modal ────────────────────────────────────────────────────

function NewAppointmentModal({
  open, onClose, onSuccess, doctors,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  doctors: DoctorOption[];
}) {
  const [step, setStep] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorOption | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<{ nome: string; duracao_minutos: number } | null>(null);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [description, setDescription] = useState("");
  const [availability, setAvailability] = useState<{ available: boolean; conflict?: { summary: string } } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Busca usuários ao digitar
  useEffect(() => {
    if (userSearch.length < 2) { setUserOptions([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/users");
        if (res.ok) {
          const all: UserOption[] = await res.json();
          const q = userSearch.toLowerCase();
          setUserOptions(
            all.filter(
              (u) =>
                u.phone_number.includes(q) ||
                (u.complete_name ?? "").toLowerCase().includes(q)
            ).slice(0, 8)
          );
        }
      } catch {}
    }, 300);
    return () => clearTimeout(timeout);
  }, [userSearch]);

  async function checkAvailability() {
    if (!selectedDoctor || !startDate || !startTime || !selectedProcedure) return;
    const startIso = new Date(`${startDate}T${startTime}:00`).toISOString();
    const endIso = new Date(
      new Date(`${startDate}T${startTime}:00`).getTime() +
        selectedProcedure.duracao_minutos * 60 * 1000
    ).toISOString();

    try {
      const res = await fetch(
        `/api/admin/agenda/availability?calendar_id=${encodeURIComponent(selectedDoctor.calendar_id)}&start=${startIso}&end=${endIso}`
      );
      if (res.ok) setAvailability(await res.json());
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser || !selectedDoctor || !selectedProcedure || !startDate || !startTime) return;

    setLoading(true);
    setError(null);

    try {
      const startIso = new Date(`${startDate}T${startTime}:00`).toISOString();
      const res = await fetch("/api/admin/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_number: selectedUser.phone_number,
          doctor_id: selectedDoctor.id,
          procedure: selectedProcedure.nome,
          start_time: startIso,
          description: description || "Agendado pelo painel admin",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar agendamento");

      onSuccess();
      onClose();
      resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setStep(1);
    setUserSearch("");
    setUserOptions([]);
    setSelectedUser(null);
    setSelectedDoctor(null);
    setSelectedProcedure(null);
    setStartDate("");
    setStartTime("");
    setDescription("");
    setAvailability(null);
    setError(null);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={() => { onClose(); resetForm(); }} />
      <div className="relative z-50 bg-background rounded-lg border p-6 shadow-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">
          Novo Agendamento — Passo {step}/3
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Passo 1 */}
          {step === 1 && (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">Paciente *</label>
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Buscar por nome ou número..."
                />
                {userOptions.length > 0 && (
                  <div className="border rounded-md mt-1 divide-y max-h-48 overflow-y-auto">
                    {userOptions.map((u) => (
                      <button
                        key={u.phone_number}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => { setSelectedUser(u); setUserSearch(u.complete_name ?? u.phone_number); setUserOptions([]); }}
                      >
                        <p className="font-medium">{u.complete_name ?? u.phone_number}</p>
                        <p className="text-xs text-muted-foreground">{u.phone_number}</p>
                      </button>
                    ))}
                  </div>
                )}
                {selectedUser && (
                  <p className="text-xs text-green-600 mt-1">✓ {selectedUser.complete_name ?? selectedUser.phone_number} selecionado</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Doutor *</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedDoctor?.id ?? ""}
                  onChange={(e) => {
                    const dr = doctors.find((d) => d.id === e.target.value) ?? null;
                    setSelectedDoctor(dr);
                    setSelectedProcedure(null);
                  }}
                  title="Selecionar doutor"
                  aria-label="Selecionar doutor"
                >
                  <option value="">Selecione um doutor</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {selectedDoctor && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Procedimento *</label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedProcedure?.nome ?? ""}
                    onChange={(e) => {
                      const p = selectedDoctor.procedures.find((p) => p.nome === e.target.value) ?? null;
                      setSelectedProcedure(p);
                    }}
                    title="Selecionar procedimento"
                    aria-label="Selecionar procedimento"
                  >
                    <option value="">Selecione um procedimento</option>
                    {selectedDoctor.procedures.map((p) => (
                      <option key={p.nome} value={p.nome}>{p.nome} ({p.duracao_minutos}min)</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  type="button"
                  disabled={!selectedUser || !selectedDoctor || !selectedProcedure}
                  onClick={() => setStep(2)}
                >
                  Próximo
                </Button>
              </div>
            </>
          )}

          {/* Passo 2 */}
          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Data *</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setAvailability(null); }}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Horário *</label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => { setStartTime(e.target.value); setAvailability(null); }}
                    required
                  />
                </div>
              </div>

              {selectedProcedure && startDate && startTime && (
                <div className="text-xs text-muted-foreground">
                  Duração: {selectedProcedure.duracao_minutos} minutos → término às{" "}
                  {new Date(
                    new Date(`${startDate}T${startTime}:00`).getTime() +
                      selectedProcedure.duracao_minutos * 60 * 1000
                  ).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              )}

              {availability && (
                <div className={`text-sm p-3 rounded-lg border ${availability.available ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>
                  {availability.available
                    ? "✓ Horário disponível"
                    : `✗ Conflito: ${availability.conflict?.summary}`}
                </div>
              )}

              <div className="flex gap-2 justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!startDate || !startTime}
                    onClick={checkAvailability}
                  >
                    Verificar Disponibilidade
                  </Button>
                  <Button
                    type="button"
                    disabled={!startDate || !startTime}
                    onClick={() => setStep(3)}
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Passo 3 */}
          {step === 3 && (
            <>
              <div>
                <label className="text-sm font-medium mb-1 block">Observações</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Observações do agendamento..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>

              {/* Resumo */}
              <Card>
                <CardContent className="p-4 text-sm space-y-1">
                  <p className="font-medium mb-2">Resumo</p>
                  <p>👤 {selectedUser?.complete_name ?? selectedUser?.phone_number}</p>
                  <p>👨‍⚕️ {selectedDoctor?.name}</p>
                  <p>🦷 {selectedProcedure?.nome}</p>
                  <p>📅 {startDate && new Date(startDate + "T00:00:00").toLocaleDateString("pt-BR")} às {startTime}</p>
                </CardContent>
              </Card>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2 justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>Voltar</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Criando..." : "Confirmar Agendamento"}
                </Button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgendaPage() {
  const [view, setView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterDoctor, setFilterDoctor] = useState("");
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [newModalOpen, setNewModalOpen] = useState(false);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/doctors");
      if (res.ok) setDoctors(await res.json());
    } catch {}
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getRangeForView(currentDate, view);
      const params = new URLSearchParams({ start, end });
      if (filterDoctor) params.set("doctor", filterDoctor);
      const res = await fetch(`/api/admin/agenda?${params}`);
      if (res.ok) setEvents(await res.json());
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [currentDate, view, filterDoctor]);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  function navigate(direction: "prev" | "next" | "today") {
    if (direction === "today") { setCurrentDate(new Date()); return; }
    if (view === "month") {
      setCurrentDate(direction === "next" ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else {
      setCurrentDate(direction === "next" ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    }
  }

  async function handleCancel(eventId: string) {
    try {
      const res = await fetch(`/api/admin/agenda/${eventId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Erro ao cancelar");
        return;
      }
      await fetchEvents();
    } catch {
      alert("Erro ao cancelar agendamento");
    }
  }

  // Converte para formato react-big-calendar
  const calEvents: CalEvent[] = events.map((ev) => ({
    title: `${ev.patient_name} — ${ev.procedure ?? "Consulta"}`,
    start: new Date(ev.start_time),
    end: new Date(ev.end_time),
    resource: ev,
  }));

  const title = view === "month"
    ? format(currentDate, "MMMM yyyy", { locale: ptBR })
    : `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), "dd/MM")} – ${format(endOfWeek(currentDate, { weekStartsOn: 0 }), "dd/MM/yyyy")}`;

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <Button onClick={() => setNewModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Toggle view */}
        <div className="flex border rounded-md overflow-hidden">
          {(["month", "week"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                view === v ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              }`}
            >
              {v === "month" ? "Mensal" : "Semanal"}
            </button>
          ))}
        </div>

        {/* Navegação */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => navigate("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("today")}>
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <span className="text-sm font-medium capitalize">{title}</span>

        {/* Filtro doutor */}
        <select
          value={filterDoctor}
          onChange={(e) => setFilterDoctor(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm ml-auto"
          aria-label="Filtrar por doutor"
          title="Filtrar por doutor"
        >
          <option value="">Todos os doutores</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
      </div>

      {/* Calendário */}
      <div className="flex-1 min-h-0" style={{ height: "calc(100vh - 220px)" }}>
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Carregando...
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={calEvents}
            view={view}
            date={currentDate}
            onView={setView}
            onNavigate={setCurrentDate}
            onSelectEvent={(ev) => setSelectedEvent((ev as CalEvent).resource)}
            toolbar={false}
            culture="pt-BR"
            messages={{
              next: "Próximo",
              previous: "Anterior",
              today: "Hoje",
              month: "Mês",
              week: "Semana",
              day: "Dia",
              noEventsInRange: "Nenhum agendamento neste período",
            }}
            eventPropGetter={(ev) => {
              const color = doctorColor((ev as CalEvent).resource.dr_responsible);
              return {
                style: {
                  backgroundColor: color,
                  borderColor: color,
                  color: "#fff",
                  borderRadius: "4px",
                  fontSize: "12px",
                },
              };
            }}
          />
        )}
      </div>

      {/* Modais */}
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onCancel={handleCancel}
      />

      <NewAppointmentModal
        open={newModalOpen}
        onClose={() => setNewModalOpen(false)}
        onSuccess={fetchEvents}
        doctors={doctors}
      />
    </div>
  );
}