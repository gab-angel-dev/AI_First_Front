"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { MessageSquare, Users, Calendar, TrendingUp } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Summary {
  total_messages: number;
  total_users: number;
  total_appointments: number;
  avg_messages_per_conversation: number;
  period: { start: string; end: string };
}

interface AppointmentByMonth {
  mes: string;
  mes_label: string;
  total: number;
}

interface MessageByDay {
  dia: string;
  user: number;
  ai: number;
  human: number;
}

interface ProcedureItem {
  procedure: string;
  total: number;
}

interface DoctorRanking {
  name: string;
  active: boolean;
  total_agendamentos: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return { start: toDateStr(start), end: toDateStr(end) };
}

const PERIOD_OPTIONS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
];

const PIE_COLORS = [
  "#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#14b8a6", "#a855f7", "#94a3b8",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  icon: Icon,
  suffix = "",
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  suffix?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">{title}</p>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-3xl font-bold">
          {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
          {suffix && <span className="text-lg font-normal text-muted-foreground ml-1">{suffix}</span>}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MetricasPage() {
  const [range, setRange] = useState(defaultRange);
  const [customMode, setCustomMode] = useState(false);
  const [activePreset, setActivePreset] = useState<number>(30);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [appointmentsByMonth, setAppointmentsByMonth] = useState<AppointmentByMonth[]>([]);
  const [messagesByDay, setMessagesByDay] = useState<MessageByDay[]>([]);
  const [procedures, setProcedures] = useState<ProcedureItem[]>([]);
  const [doctorsRanking, setDoctorsRanking] = useState<DoctorRanking[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = `start=${start}&end=${end}`;
      const [summaryRes, appointmentsRes, messagesRes, proceduresRes, doctorsRes] =
        await Promise.all([
          fetch(`/api/admin/metrics/summary?${params}`),
          fetch(`/api/admin/metrics/appointments-by-month`),
          fetch(`/api/admin/metrics/messages-by-day?${params}`),
          fetch(`/api/admin/metrics/procedures-distribution?${params}`),
          fetch(`/api/admin/metrics/doctors-ranking?${params}`),
        ]);

      if (!summaryRes.ok) throw new Error("Erro ao buscar resumo");

      const [s, a, m, p, d] = await Promise.all([
        summaryRes.json(),
        appointmentsRes.json(),
        messagesRes.json(),
        proceduresRes.json(),
        doctorsRes.json(),
      ]);

      setSummary(s);
      setAppointmentsByMonth(Array.isArray(a) ? a : []);
      setMessagesByDay(Array.isArray(m) ? m : []);
      setProcedures(Array.isArray(p) ? p : []);
      setDoctorsRanking(Array.isArray(d) ? d : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar métricas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(range.start, range.end);
  }, [fetchAll, range]);

  function applyPreset(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    setRange({ start: toDateStr(start), end: toDateStr(end) });
    setActivePreset(days);
    setCustomMode(false);
  }

  function applyCustom() {
    setCustomMode(false);
    fetchAll(range.start, range.end);
  }

  const maxAppointments = Math.max(...doctorsRanking.map((d) => d.total_agendamentos), 1);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Métricas</h1>

        {/* Filtro de período */}
        <div className="flex items-center gap-2 flex-wrap">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.days}
              variant={!customMode && activePreset === opt.days ? "default" : "outline"}
              size="sm"
              onClick={() => applyPreset(opt.days)}
            >
              {opt.label}
            </Button>
          ))}
          <Button
            variant={customMode ? "default" : "outline"}
            size="sm"
            onClick={() => setCustomMode((v) => !v)}
          >
            Personalizado
          </Button>
          {customMode && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={range.start}
                onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
                className="h-9 w-36"
              />
              <span className="text-muted-foreground text-sm">até</span>
              <Input
                type="date"
                value={range.end}
                onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
                className="h-9 w-36"
              />
              <Button size="sm" onClick={applyCustom}>
                Aplicar
              </Button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Mensagens"
          value={loading ? "—" : (summary?.total_messages ?? 0)}
          icon={MessageSquare}
        />
        <MetricCard
          title="Total de Usuários"
          value={loading ? "—" : (summary?.total_users ?? 0)}
          icon={Users}
        />
        <MetricCard
          title="Agendamentos"
          value={loading ? "—" : (summary?.total_appointments ?? 0)}
          icon={Calendar}
        />
        <MetricCard
          title="Média Msg/Conversa"
          value={loading ? "—" : (summary?.avg_messages_per_conversation ?? 0)}
          icon={TrendingUp}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agendamentos por mês */}
        <Card>
          <CardHeader className="pb-2">
            <p className="font-semibold">Agendamentos por Mês</p>
            <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Carregando...
              </div>
            ) : appointmentsByMonth.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Sem dados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={appointmentsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes_label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total" name="Agendamentos" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Distribuição de procedimentos */}
        <Card>
          <CardHeader className="pb-2">
            <p className="font-semibold">Distribuição de Procedimentos</p>
            <p className="text-xs text-muted-foreground">Top 6 + Outros</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Carregando...
              </div>
            ) : procedures.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Sem dados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={procedures}
                    dataKey="total"
                    nameKey="procedure"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ procedure, percent }) =>
                      `${procedure} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {procedures.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, "Agendamentos"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mensagens por dia — linha cheia */}
      <Card>
        <CardHeader className="pb-2">
          <p className="font-semibold">Mensagens por Dia</p>
          <p className="text-xs text-muted-foreground">Separado por remetente</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              Carregando...
            </div>
          ) : messagesByDay.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              Sem dados no período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={messagesByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="dia"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)} // MM-DD
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  labelFormatter={(v: string) =>
                    new Date(v + "T00:00:00").toLocaleDateString("pt-BR")
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="user"
                  name="Usuário"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="ai"
                  name="IA"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="human"
                  name="Atendente"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Ranking de doutores */}
      <Card>
        <CardHeader className="pb-2">
          <p className="font-semibold">Ranking de Doutores</p>
          <p className="text-xs text-muted-foreground">Agendamentos no período</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : doctorsRanking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum doutor cadastrado</p>
          ) : (
            <div className="space-y-4">
              {doctorsRanking.map((d) => (
                <div key={d.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{d.name}</span>
                      <Badge variant={d.active ? "default" : "secondary"} className="text-xs">
                        {d.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <span className="text-sm font-semibold">{d.total_agendamentos}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${(d.total_agendamentos / maxAppointments) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}