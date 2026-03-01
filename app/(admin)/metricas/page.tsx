"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import {
  MessageSquare, Users, Calendar, TrendingUp,
  FileDown, Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Summary {
  total_messages: number;
  total_users: number;
  total_appointments: number;
  avg_messages_per_conversation: number;
  period: { start: string; end: string };
}
interface AppointmentByMonth { mes: string; mes_label: string; total: number; }
interface MessageByDay { dia: string; user: number; ai: number; human: number; }
interface ProcedureItem { procedure: string; total: number; }
interface DoctorRanking { name: string; active: boolean; total_agendamentos: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
// CORRIGIDO: usa horário local em vez de UTC para evitar virada de dia em fuso UTC-3
function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultRange() {
  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + 30);
  return { start: toDateStr(start), end: toDateStr(end) };
}

function fmtDateBR(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}
function fmtAxisDate(v: string) {
  const [, mm, dd] = String(v).split("-");
  return `${dd}/${mm}`;
}

const PERIOD_OPTIONS = [
  { label: "7d",  days: 7  },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

const PIE_COLORS = ["#4f63d2","#16a34a","#d97706","#dc2626","#0891b2","#7c3aed","#94a3b8"];

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "10px",
  color: "hsl(var(--card-foreground))",
  fontSize: 12,
  boxShadow: "var(--shadow-lg)",
};
const AXIS_TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const GRID_COLOR = "hsl(var(--border))";
const CURSOR_STYLE = { fill: "hsl(var(--muted))", opacity: 0.6 };

// ─── Export PDF ───────────────────────────────────────────────────────────────
async function exportToPDF(
  contentRef: React.RefObject<HTMLDivElement>,
  range: { start: string; end: string }
) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"), import("html2canvas"),
  ]);
  const element = contentRef.current;
  if (!element) return;
  const canvas = await html2canvas(element, {
    scale: 2, useCORS: true, backgroundColor: "#ffffff",
    logging: false, ignoreElements: (el) => el.id === "export-pdf-btn",
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;

  pdf.setFontSize(15);
  pdf.setFont("helvetica", "bold");
  pdf.text("Relatório de Métricas", margin, margin + 6);
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    `Período: ${fmtDateBR(range.start)} a ${fmtDateBR(range.end)}   •   Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    margin, margin + 12
  );
  pdf.setTextColor(0, 0, 0);
  const headerH = margin + 17;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, headerH, pageW - margin, headerH);

  const imgStartY = headerH + 4;
  const availableH = pageH - imgStartY - margin;
  const imgRatio = canvas.width / canvas.height;
  const imgH = contentW / imgRatio;

  if (imgH <= availableH) {
    pdf.addImage(imgData, "PNG", margin, imgStartY, contentW, imgH);
  } else {
    let yOffset = 0, isFirstPage = true;
    while (yOffset < imgH) {
      if (!isFirstPage) {
        pdf.addPage();
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text("Relatório de Métricas", margin, 8);
        pdf.setTextColor(0, 0, 0);
      }
      const startY = isFirstPage ? imgStartY : 12;
      const sliceH = isFirstPage ? availableH : pageH - startY - margin;
      const srcY = (yOffset / imgH) * canvas.height;
      const srcH = (sliceH / imgH) * canvas.height;
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = srcH;
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.drawImage(canvas, 0, -srcY);
      pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, startY, contentW, sliceH);
      yOffset += sliceH;
      isFirstPage = false;
    }
  }
  pdf.save(`metricas_${range.start}_${range.end}.pdf`);
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({
  title, value, icon: Icon, suffix = "", loading, accent,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  suffix?: string;
  loading?: boolean;
  accent?: string;
}) {
  return (
    <Card className="metric-card-accent relative overflow-hidden">
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: accent ?? "linear-gradient(90deg, hsl(var(--primary)), hsl(210,80%,60%))" }}
      />
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        {loading ? (
          <div className="h-8 w-24 bg-muted rounded-lg animate-pulse" />
        ) : (
          <p className="text-2xl font-bold text-foreground tracking-tight">
            {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
            {suffix && <span className="text-base font-normal text-muted-foreground ml-1">{suffix}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Chart Card wrapper ───────────────────────────────────────────────────────
function ChartCard({
  title, subtitle, loading, empty, children, className = "",
}: {
  title: string;
  subtitle?: string;
  loading?: boolean;
  empty?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <span className="text-xs">Carregando...</span>
            </div>
          </div>
        ) : empty ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Sem dados no período</p>
          </div>
        ) : children}
      </CardContent>
    </Card>
  );
}

// ─── Custom Pie Label ─────────────────────────────────────────────────────────
const renderPieLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: any) => {
  if (percent < 0.06) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MetricasPage() {
  const [range, setRange] = useState(defaultRange);
  const [customMode, setCustomMode] = useState(false);
  const [activePreset, setActivePreset] = useState(30);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [appointmentsByMonth, setAppointmentsByMonth] = useState<AppointmentByMonth[]>([]);
  const [messagesByDay, setMessagesByDay] = useState<MessageByDay[]>([]);
  const [procedures, setProcedures] = useState<ProcedureItem[]>([]);
  const [doctorsRanking, setDoctorsRanking] = useState<DoctorRanking[]>([]);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentRef = useRef<HTMLDivElement>(null);
  const { error: toastError, success: toastSuccess } = useToast();

  const fetchAll = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError(null);
    try {
      const p = `start=${start}&end=${end}`;
      const [sRes, aRes, mRes, prRes, dRes] = await Promise.all([
        fetch(`/api/admin/metrics/summary?${p}`),
        fetch(`/api/admin/metrics/appointments-by-month`),
        fetch(`/api/admin/metrics/messages-by-day?${p}`),
        fetch(`/api/admin/metrics/procedures-distribution?${p}`),
        fetch(`/api/admin/metrics/doctors-ranking?${p}`),
      ]);
      if (!sRes.ok) throw new Error("Erro ao buscar resumo");
      const [s, a, m, pr, d] = await Promise.all([
        sRes.json(), aRes.json(), mRes.json(), prRes.json(), dRes.json(),
      ]);
      setSummary(s);
      setAppointmentsByMonth(Array.isArray(a) ? a : []);
      setMessagesByDay(Array.isArray(m) ? m : []);
      setProcedures(Array.isArray(pr) ? pr : []);
      setDoctorsRanking(Array.isArray(d) ? d : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar";
      setError(msg);
      toastError("Erro ao carregar métricas", msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(range.start, range.end); }, [fetchAll, range]);

  function applyPreset(days: number) {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + days);
    setRange({ start: toDateStr(start), end: toDateStr(end) });
    setActivePreset(days);
    setCustomMode(false);
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportToPDF(contentRef, range);
      toastSuccess("PDF exportado com sucesso!");
    } catch {
      toastError("Erro ao exportar PDF");
    } finally {
      setExporting(false);
    }
  }

  const maxAppointments = Math.max(...doctorsRanking.map((d) => d.total_agendamentos), 1);

  return (
    <div className="h-full overflow-y-auto p-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Métricas</h1>
          <p className="page-subtitle">
            {fmtDateBR(range.start)} — {fmtDateBR(range.end)}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Period presets */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => applyPreset(opt.days)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  !customMode && activePreset === opt.days
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button
            variant={customMode ? "default" : "outline"}
            size="sm"
            onClick={() => setCustomMode((v) => !v)}
          >
            Período
          </Button>

          {customMode && (
            <div className="flex items-center gap-2">
              <Input type="date" value={range.start} className="h-8 w-36 text-xs"
                onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))} />
              <span className="text-muted-foreground text-xs">até</span>
              <Input type="date" value={range.end} className="h-8 w-36 text-xs"
                onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))} />
              <Button size="sm" onClick={() => { setCustomMode(false); fetchAll(range.start, range.end); }}>
                Aplicar
              </Button>
            </div>
          )}

          <Button
            id="export-pdf-btn"
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={loading || exporting}
          >
            {exporting
              ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Exportando...</>
              : <><FileDown className="h-3.5 w-3.5 mr-1.5" />Exportar PDF</>
            }
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-5">
          {error}
        </div>
      )}

      <div ref={contentRef} className="space-y-5 bg-background">
        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total de Mensagens" icon={MessageSquare}
            value={loading ? 0 : (summary?.total_messages ?? 0)} loading={loading}
            accent="linear-gradient(90deg, #4f63d2, #818cf8)"
          />
          <MetricCard
            title="Novos Usuários" icon={Users}
            value={loading ? 0 : (summary?.total_users ?? 0)} loading={loading}
            accent="linear-gradient(90deg, #16a34a, #4ade80)"
          />
          <MetricCard
            title="Agendamentos" icon={Calendar}
            value={loading ? 0 : (summary?.total_appointments ?? 0)} loading={loading}
            accent="linear-gradient(90deg, #d97706, #fbbf24)"
          />
          <MetricCard
            title="Média Msg/Conversa" icon={TrendingUp}
            value={loading ? 0 : (summary?.avg_messages_per_conversation ?? 0)} loading={loading}
            accent="linear-gradient(90deg, #0891b2, #22d3ee)"
          />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ChartCard
            title="Agendamentos por Mês"
            subtitle="Últimos 6 meses"
            loading={loading}
            empty={appointmentsByMonth.length === 0}
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={appointmentsByMonth} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_COLOR} />
                <XAxis dataKey="mes_label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_COLOR }} />
                <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={CURSOR_STYLE} />
                <Bar dataKey="total" name="Agendamentos" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Distribuição de Procedimentos"
            subtitle="Top procedimentos no período"
            loading={loading}
            empty={procedures.length === 0}
          >
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie
                    data={procedures} dataKey="total" nameKey="procedure"
                    cx="50%" cy="50%" outerRadius={85} innerRadius={40}
                    labelLine={false} label={renderPieLabel}
                  >
                    {procedures.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [v, "Agendamentos"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {procedures.slice(0, 6).map((p, i) => (
                  <div key={p.procedure} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="text-xs text-muted-foreground truncate flex-1">{p.procedure}</span>
                    <span className="text-xs font-semibold text-foreground">{p.total}</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Messages by day */}
        <ChartCard
          title="Mensagens por Dia"
          subtitle="Volume por tipo de remetente"
          loading={loading}
          empty={messagesByDay.length === 0}
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={messagesByDay} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_COLOR} />
              <XAxis dataKey="dia" tick={AXIS_TICK} tickLine={false}
                axisLine={{ stroke: GRID_COLOR }}
                tickFormatter={fmtAxisDate} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={28} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "4 4" }}
                labelFormatter={(v: string) => fmtDateBR(v)}
              />
              <Legend iconType="circle" iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 12, color: "hsl(var(--muted-foreground))" }} />
              <Line type="monotone" dataKey="user" name="Usuário" stroke="#4f63d2" strokeWidth={2}
                dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              <Line type="monotone" dataKey="ai" name="IA" stroke="#94a3b8" strokeWidth={2}
                dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              <Line type="monotone" dataKey="human" name="Atendente" stroke="#16a34a" strokeWidth={2}
                dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Doctor ranking */}
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm font-semibold text-foreground">Ranking de Doutores</p>
            <p className="text-xs text-muted-foreground">Agendamentos no período</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5 animate-pulse">
                    <div className="flex justify-between">
                      <div className="h-3.5 bg-muted rounded w-32" />
                      <div className="h-3.5 bg-muted rounded w-8" />
                    </div>
                    <div className="h-2 bg-muted rounded-full w-full" />
                  </div>
                ))}
              </div>
            ) : doctorsRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum doutor cadastrado</p>
            ) : (
              <div className="space-y-4">
                {doctorsRanking.map((d, i) => (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                        <span className="text-sm font-medium text-foreground">{d.name}</span>
                        <Badge variant={d.active ? "success" : "secondary"} size="sm" dot>
                          {d.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <span className="text-sm font-bold text-foreground">{d.total_agendamentos}</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(d.total_agendamentos / maxAppointments) * 100}%`,
                          background: `linear-gradient(90deg, hsl(var(--primary)), hsl(210,80%,60%))`,
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
    </div>
  );
}