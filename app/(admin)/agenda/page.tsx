"use client";

import { useEffect, useState, useCallback } from "react";
import { Calendar, dateFnsLocalizer, View, Event } from "react-big-calendar";
import {
  format, parse, startOfWeek, getDay,
  addMonths, subMonths, addWeeks, subWeeks,
  startOfMonth, endOfMonth,
  startOfWeek as startOfWeekFn, endOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft, ChevronRight, Plus, ExternalLink,
  Loader2, Calendar as CalendarIcon, Clock, User, Stethoscope, X,
} from "lucide-react";
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
  insurances: string[];
}

interface UserOption {
  phone_number: string;
  complete_name: string | null;
}

interface CalEvent extends Event {
  resource: AgendaEvent;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function doctorColor(name: string): string {
  const COLORS = [
    "#4f63d2", "#16a34a", "#d97706", "#dc2626",
    "#0891b2", "#7c3aed", "#db2777", "#0284c7",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "success" | "warning" }> = {
  pending:   { label: "Pendente",   variant: "warning" },
  confirmed: { label: "Confirmado", variant: "success" },
  canceled:  { label: "Cancelado",  variant: "destructive" },
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
  const s = startOfWeek(date, { weekStartsOn: 0 });
  const e = endOfWeek(date, { weekStartsOn: 0 });
  return { start: format(s, "yyyy-MM-dd"), end: format(e, "yyyy-MM-dd") };
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function capitalize(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({
  open, message, onConfirm, onCancel,
}: { open: boolean; message: string; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 modal-backdrop" onClick={onCancel} />
      <div className="relative z-[61] bg-card rounded-2xl border p-6 shadow-elevation-xl max-w-sm w-full mx-4 animate-scale-in">
        <p className="text-sm leading-relaxed text-foreground mb-6">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>Confirmar exclusão</Button>
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
  const statusCfg = STATUS_CONFIG[event.status] ?? { label: event.status, variant: "secondary" as const };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 modal-backdrop" onClick={onClose} />
      <div className="relative z-50 bg-card rounded-2xl border shadow-elevation-xl max-w-md w-full mx-4 overflow-hidden animate-scale-in">
        <ConfirmModal
          open={confirm}
          message={`Tem certeza que deseja cancelar a consulta de ${event.patient_name} em ${start.toLocaleDateString("pt-BR")}?`}
          onConfirm={() => { setConfirm(false); onCancel(event.event_id); onClose(); }}
          onCancel={() => setConfirm(false)}
        />

        {/* Header with color accent */}
        <div
          className="h-1.5 w-full"
          style={{ background: doctorColor(event.dr_responsible) }}
        />

        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {event.procedure ?? "Consulta"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">ID: {event.event_id.slice(0, 12)}…</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusCfg.variant} dot>
                {statusCfg.label}
              </Badge>
              <button
                onClick={onClose}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              <InfoField icon={User} label="Paciente" value={event.patient_name} />
              <InfoField icon={Stethoscope} label="Doutor" value={event.dr_responsible} />
              <InfoField
                icon={CalendarIcon}
                label="Data"
                value={start.toLocaleDateString("pt-BR")}
              />
              <InfoField
                icon={Clock}
                label="Horário"
                value={`${start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
              />
            </div>

            {(event.convenio || event.user_number) && (
              <div className="grid grid-cols-2 gap-3">
                {event.convenio && (
                  <InfoField label="Convênio" value={capitalize(event.convenio)} />
                )}
                <InfoField label="WhatsApp" value={event.user_number} />
              </div>
            )}

            {event.description && (
              <div className="rounded-lg bg-muted/50 border border-border/50 p-3">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Observações</p>
                <p className="text-sm text-foreground leading-relaxed">{event.description}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-5 pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => router.push(`/usuarios?number=${event.user_number}`)}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Ver chat
            </Button>
            {event.status !== "canceled" && (
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => setConfirm(true)}
              >
                Cancelar consulta
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({
  label,
  value,
  icon: Icon,
}: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div>
      <div className="flex items-center gap-1 mb-0.5">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
        <p className="text-[10.5px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-0 justify-center mb-5">
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <div className={[
            "step-dot",
            i + 1 < current ? "completed" : i + 1 === current ? "active" : "pending",
          ].join(" ")}>
            {i + 1 < current ? "✓" : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`step-line ${i + 1 < current ? "completed" : ""}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

import React from "react";

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
  const [selectedConvenio, setSelectedConvenio] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [description, setDescription] = useState("");
  const [availability, setAvailability] = useState<{ available: boolean; conflict?: { summary: string } } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userSearch.length < 2) { setUserOptions([]); return; }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/users?q=${encodeURIComponent(userSearch)}`);
        if (res.ok) setUserOptions(await res.json());
      } catch {}
    }, 300);
    return () => clearTimeout(timeout);
  }, [userSearch]);

  useEffect(() => { setSelectedConvenio(""); }, [selectedDoctor]);

  async function checkAvailability() {
    if (!selectedDoctor || !startDate || !startTime || !selectedProcedure) return;
    setCheckingAvailability(true);
    setAvailability(null);
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
    } catch { setAvailability(null); }
    finally { setCheckingAvailability(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser || !selectedDoctor || !selectedProcedure || !startDate || !startTime) return;
    const selectedDateTime = new Date(`${startDate}T${startTime}:00`);
    if (selectedDateTime < new Date()) {
      setError("Não é possível agendar para uma data/hora no passado.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_number: selectedUser.phone_number,
          doctor_id: selectedDoctor.id,
          procedure: selectedProcedure.nome,
          convenio: selectedConvenio || null,
          start_time: selectedDateTime.toISOString(),
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
    setStep(1); setUserSearch(""); setUserOptions([]); setSelectedUser(null);
    setSelectedDoctor(null); setSelectedProcedure(null); setSelectedConvenio("");
    setStartDate(""); setStartTime(""); setDescription(""); setAvailability(null); setError(null);
  }

  if (!open) return null;

  const STEP_TITLES = ["Paciente & Doutor", "Data & Horário", "Revisão"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 modal-backdrop" onClick={() => { onClose(); resetForm(); }} />
      <div className="relative z-50 bg-card rounded-2xl border shadow-elevation-xl max-w-lg w-full mx-4 overflow-hidden animate-scale-in">

        {/* Modal header */}
        <div className="px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Novo Agendamento</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{STEP_TITLES[step - 1]}</p>
            </div>
            <button
              onClick={() => { onClose(); resetForm(); }}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <StepIndicator current={step} total={3} />
        </div>

        <div className="p-6 max-h-[65vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── Passo 1 ── */}
            {step === 1 && (
              <>
                <FormField label="Paciente *">
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Buscar por nome ou número..."
                  />
                  {userOptions.length > 0 && (
                    <div className="border rounded-xl mt-1 divide-y divide-border overflow-hidden shadow-elevation-md">
                      {userOptions.map((u) => (
                        <button
                          key={u.phone_number}
                          type="button"
                          className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors"
                          onClick={() => {
                            setSelectedUser(u);
                            setUserSearch(u.complete_name ?? u.phone_number);
                            setUserOptions([]);
                          }}
                        >
                          <p className="font-medium">{u.complete_name ?? u.phone_number}</p>
                          <p className="text-xs text-muted-foreground">{u.phone_number}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedUser && (
                    <p className="text-xs text-[hsl(var(--success))] mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))] inline-block" />
                      {selectedUser.complete_name ?? selectedUser.phone_number} selecionado
                    </p>
                  )}
                </FormField>

                <FormField label="Doutor *">
                  <select
                    className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                    value={selectedDoctor?.id ?? ""}
                    onChange={(e) => {
                      const dr = doctors.find((d) => d.id === e.target.value) ?? null;
                      setSelectedDoctor(dr);
                      setSelectedProcedure(null);
                    }}
                    aria-label="Selecionar doutor"
                  >
                    <option value="">Selecione um doutor</option>
                    {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </FormField>

                {selectedDoctor && (
                  <FormField label="Procedimento *">
                    <select
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      value={selectedProcedure?.nome ?? ""}
                      onChange={(e) => {
                        const p = selectedDoctor.procedures.find((p) => p.nome === e.target.value) ?? null;
                        setSelectedProcedure(p);
                      }}
                      aria-label="Selecionar procedimento"
                    >
                      <option value="">Selecione um procedimento</option>
                      {selectedDoctor.procedures.map((p) => (
                        <option key={p.nome} value={p.nome}>{p.nome} ({p.duracao_minutos}min)</option>
                      ))}
                    </select>
                  </FormField>
                )}

                {selectedDoctor && (
                  <FormField label="Convênio">
                    {selectedDoctor.insurances.length > 0 ? (
                      <select
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                        value={selectedConvenio}
                        onChange={(e) => setSelectedConvenio(e.target.value)}
                        aria-label="Selecionar convênio"
                      >
                        <option value="">Particular</option>
                        {selectedDoctor.insurances.map((ins) => (
                          <option key={ins} value={ins}>{capitalize(ins)}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs text-muted-foreground">Sem convênios cadastrados</p>
                    )}
                  </FormField>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    disabled={!selectedUser || !selectedDoctor || !selectedProcedure}
                    onClick={() => setStep(2)}
                  >
                    Continuar
                  </Button>
                </div>
              </>
            )}

            {/* ── Passo 2 ── */}
            {step === 2 && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Data *">
                    <Input type="date" value={startDate} min={todayStr()}
                      onChange={(e) => { setStartDate(e.target.value); setAvailability(null); }}
                      required />
                  </FormField>
                  <FormField label="Horário *">
                    <Input type="time" value={startTime}
                      onChange={(e) => { setStartTime(e.target.value); setAvailability(null); }}
                      required />
                  </FormField>
                </div>

                {startDate === todayStr() && startTime && (
                  (() => {
                    const chosen = new Date(`${startDate}T${startTime}:00`);
                    return chosen < new Date() ? (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <span>⚠</span> Este horário já passou.
                      </p>
                    ) : null;
                  })()
                )}

                {selectedProcedure && startDate && startTime && (
                  <div className="rounded-lg bg-muted/50 border border-border/50 p-3 text-xs text-muted-foreground">
                    Duração: <strong className="text-foreground">{selectedProcedure.duracao_minutos} min</strong>
                    {" "}— término às{" "}
                    <strong className="text-foreground">
                      {new Date(
                        new Date(`${startDate}T${startTime}:00`).getTime() +
                        selectedProcedure.duracao_minutos * 60 * 1000
                      ).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </strong>
                  </div>
                )}

                {availability && (
                  <div className={`text-sm p-3 rounded-xl border flex items-center gap-2 ${
                    availability.available
                      ? "border-[hsl(var(--success))/0.3] bg-[hsl(var(--success))/0.06] text-[hsl(var(--success))]"
                      : "border-destructive/25 bg-destructive/5 text-destructive"
                  }`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${availability.available ? "bg-[hsl(var(--success))]" : "bg-destructive"}`} />
                    {availability.available
                      ? "Horário disponível"
                      : `Conflito: ${availability.conflict?.summary}`}
                  </div>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex gap-2 justify-between pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                  <div className="flex gap-2">
                    <Button
                      type="button" variant="outline"
                      disabled={!startDate || !startTime || checkingAvailability}
                      onClick={checkAvailability}
                    >
                      {checkingAvailability ? (
                        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Verificando...</>
                      ) : "Verificar disponibilidade"}
                    </Button>
                    <Button
                      type="button"
                      disabled={!startDate || !startTime}
                      onClick={() => {
                        const chosen = new Date(`${startDate}T${startTime}:00`);
                        if (chosen < new Date()) { setError("Data/hora no passado."); return; }
                        setError(null); setStep(3);
                      }}
                    >
                      Continuar
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* ── Passo 3 ── */}
            {step === 3 && (
              <>
                <FormField label="Observações">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Observações adicionais..."
                    rows={3}
                    className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 resize-none transition-all"
                  />
                </FormField>

                {/* Summary card */}
                <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
                  <div className="px-4 py-2.5 bg-muted/50 border-b border-border">
                    <p className="text-[11px] font-600 text-muted-foreground uppercase tracking-wider">Resumo do agendamento</p>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3">
                    <SummaryItem label="Paciente" value={selectedUser?.complete_name ?? selectedUser?.phone_number ?? "—"} />
                    <SummaryItem label="Doutor" value={selectedDoctor?.name ?? "—"} />
                    <SummaryItem label="Procedimento" value={selectedProcedure?.nome ?? "—"} />
                    <SummaryItem label="Convênio" value={selectedConvenio ? capitalize(selectedConvenio) : "Particular"} />
                    <SummaryItem
                      label="Data e horário"
                      value={startDate && startTime
                        ? `${new Date(startDate + "T00:00:00").toLocaleDateString("pt-BR")} às ${startTime}`
                        : "—"}
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex gap-2 justify-between pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>Voltar</Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Criando...</>
                    ) : "Confirmar agendamento"}
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
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
    } catch { setEvents([]); }
    finally { setLoading(false); }
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
      if (!res.ok) { const d = await res.json(); alert(d.error || "Erro ao cancelar"); return; }
      await fetchEvents();
    } catch { alert("Erro ao cancelar agendamento"); }
  }

  const calEvents: CalEvent[] = events.map((ev) => ({
    title: `${ev.patient_name} — ${ev.procedure ?? "Consulta"}`,
    start: new Date(ev.start_time),
    end: new Date(ev.end_time),
    resource: ev,
  }));

  const title = view === "month"
    ? format(currentDate, "MMMM yyyy", { locale: ptBR })
    : `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), "dd/MM")} – ${format(endOfWeek(currentDate, { weekStartsOn: 0 }), "dd/MM/yyyy")}`;

  // Doctor legend
  const uniqueDoctors = Array.from(new Set(events.map((e) => e.dr_responsible)));

  return (
    <div className="p-5 space-y-4 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">{events.length} agendamento{events.length !== 1 ? "s" : ""} no período</p>
        </div>
        <Button onClick={() => setNewModalOpen(true)} size="sm">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Novo agendamento
        </Button>
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* View toggle */}
        <div className="flex border border-border rounded-lg overflow-hidden">
          {(["month", "week"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {v === "month" ? "Mensal" : "Semanal"}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => navigate("prev")}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("today")} className="text-xs">
            Hoje
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => navigate("next")}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <span className="text-sm font-semibold capitalize text-foreground">{title}</span>

        {/* Doctor legend */}
        {uniqueDoctors.length > 0 && !filterDoctor && (
          <div className="hidden md:flex items-center gap-2 ml-2">
            {uniqueDoctors.slice(0, 4).map((dr) => (
              <div key={dr} className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: doctorColor(dr) }}
                />
                <span className="text-xs text-muted-foreground">{dr.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        )}

        {/* Doctor filter */}
        <select
          value={filterDoctor}
          onChange={(e) => setFilterDoctor(e.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-3 text-xs ml-auto"
          aria-label="Filtrar por doutor"
        >
          <option value="">Todos os doutores</option>
          {doctors.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
      </div>

      {/* Calendar */}
      <div className="flex-1 min-h-0 animate-fade-in" style={{ height: "calc(100vh - 220px)" }}>
        {loading ? (
          <div className="h-full rounded-xl border bg-card flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Carregando agenda...</p>
            </div>
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
              next: "Próximo", previous: "Anterior", today: "Hoje",
              month: "Mês", week: "Semana", day: "Dia",
              noEventsInRange: "Nenhum agendamento neste período",
            }}
            eventPropGetter={(ev) => {
              const color = doctorColor((ev as CalEvent).resource.dr_responsible);
              return {
                style: {
                  backgroundColor: color,
                  borderColor: "transparent",
                  color: "#fff",
                  borderRadius: "5px",
                  fontSize: "11.5px",
                  fontWeight: 500,
                  padding: "2px 7px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.18)",
                },
              };
            }}
          />
        )}
      </div>

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