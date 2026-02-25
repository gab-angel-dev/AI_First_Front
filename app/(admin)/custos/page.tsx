"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { DollarSign, Zap, TrendingUp, TrendingDown, FileDown, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CostSummary {
  total_cost: number;
  total_tokens: number;
  total_input_tokens: number;
  total_output_tokens: number;
  avg_cost_per_day: number;
  period: { start: string; end: string };
}
interface CostByDay {
  dia: string;
  custo: number;
  tokens: number;
  input_tokens: number;
  output_tokens: number;
}
interface CostByModel {
  model: string;
  total_cost: number;
  total_tokens: number;
  pct: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 4 });
const fmtUSD = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 4 });
const fmtTokens = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(1)}k` : String(v);

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }
function defaultRange() {
  const end = new Date(), start = new Date();
  start.setDate(end.getDate() - 29);
  return { start: toDateStr(start), end: toDateStr(end) };
}
function fmtDateBR(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}
function fmtAxisDate(v: string) {
  const [, mm, dd] = String(v).split("-");
  return `${dd}/${mm}`;
}

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
const PERIOD_OPTIONS = [{ label: "7d", days: 7 }, { label: "30d", days: 30 }, { label: "90d", days: 90 }];

const MODEL_COLORS = ["#4f63d2", "#16a34a", "#d97706", "#dc2626", "#0891b2", "#7c3aed"];

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({
  title, value, sub, icon: Icon, loading, accent, trend,
}: {
  title: string; value: string; sub?: string; icon: React.ElementType;
  loading?: boolean; accent?: string; trend?: "up" | "down";
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: accent ?? "linear-gradient(90deg, hsl(var(--primary)), hsl(210,80%,60%))" }} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        {loading ? (
          <div className="h-7 w-28 bg-muted rounded-lg animate-pulse" />
        ) : (
          <p className="text-xl font-bold text-foreground tracking-tight">{value}</p>
        )}
        {sub && !loading && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            {trend === "up" && <TrendingUp className="h-3 w-3 text-destructive" />}
            {trend === "down" && <TrendingDown className="h-3 w-3 text-[hsl(152,70%,35%)]" />}
            {sub}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CustosPage() {
  const [range, setRange] = useState(defaultRange);
  const [customMode, setCustomMode] = useState(false);
  const [activePreset, setActivePreset] = useState(30);

  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [byDay, setByDay] = useState<CostByDay[]>([]);
  const [byModel, setByModel] = useState<CostByModel[]>([]);
  const [loading, setLoading] = useState(true);

  const { error: toastError, success: toastSuccess } = useToast();

  const fetchAll = useCallback(async (start: string, end: string) => {
    setLoading(true);
    try {
      const p = `start=${start}&end=${end}`;
      const [sRes, dRes, mRes] = await Promise.all([
        fetch(`/api/admin/costs/summary?${p}`),
        fetch(`/api/admin/costs/by-day?${p}`),
        fetch(`/api/admin/costs/by-model?${p}`),
      ]);
      
      // Validação abrangente: checa se TODOS retornaram 2xx
      if (!sRes.ok || !dRes.ok || !mRes.ok) {
        throw new Error("Erro ao buscar custos da API");
      }

      // Função segura para fazer parse do JSON e evitar erro de HTML
      const parseJSON = async (res: Response) => {
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return null; // Retorna null em vez de estourar a tela se não for JSON válido
        }
      };

      const [s, d, m] = await Promise.all([
        parseJSON(sRes), 
        parseJSON(dRes), 
        parseJSON(mRes)
      ]);

      setSummary(s);
      setByDay(Array.isArray(d) ? d : []);
      setByModel(Array.isArray(m) ? m : []);
    } catch (e) {
      toastError("Erro ao carregar custos", e instanceof Error ? e.message : "Tente novamente");
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => { fetchAll(range.start, range.end); }, [fetchAll, range]);

  function applyPreset(days: number) {
    const end = new Date(), start = new Date();
    start.setDate(end.getDate() - (days - 1));
    setRange({ start: toDateStr(start), end: toDateStr(end) });
    setActivePreset(days);
    setCustomMode(false);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto p-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Custos</h1>
          <p className="page-subtitle">
            {fmtDateBR(range.start)} — {fmtDateBR(range.end)}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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

          <Button variant={customMode ? "default" : "outline"} size="sm"
            onClick={() => setCustomMode((v) => !v)}>
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
        </div>
      </div>

      <div className="space-y-5">
        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Custo Total" icon={DollarSign} loading={loading}
            value={loading ? "—" : fmtUSD(summary?.total_cost ?? 0)}
            sub={loading ? undefined : `Média: ${fmtUSD((summary?.avg_cost_per_day ?? 0))}/dia`}
            accent="linear-gradient(90deg, #4f63d2, #818cf8)"
          />
          <MetricCard
            title="Tokens Totais" icon={Zap} loading={loading}
            value={loading ? "—" : fmtTokens(summary?.total_tokens ?? 0)}
            sub={loading ? undefined : `${fmtTokens(summary?.total_input_tokens ?? 0)} entrada`}
            accent="linear-gradient(90deg, #d97706, #fbbf24)"
          />
          <MetricCard
            title="Tokens de Saída" icon={TrendingUp} loading={loading}
            value={loading ? "—" : fmtTokens(summary?.total_output_tokens ?? 0)}
            accent="linear-gradient(90deg, #0891b2, #22d3ee)"
          />
          <MetricCard
            title="Modelos Usados" icon={Zap} loading={loading}
            value={loading ? "—" : String(byModel.length)}
            sub={loading ? undefined : byModel[0] ? `Principal: ${byModel[0].model.split("-").slice(0, 2).join("-")}` : undefined}
            accent="linear-gradient(90deg, #7c3aed, #a78bfa)"
          />
        </div>

        {/* Cost over time */}
        <Card>
          <CardHeader className="pb-1">
            <p className="text-sm font-semibold text-foreground">Custo por Dia</p>
            <p className="text-xs text-muted-foreground">Evolução de gastos no período</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <span className="text-xs">Carregando...</span>
                </div>
              </div>
            ) : byDay.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Sem dados no período</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={byDay} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_COLOR} />
                  <XAxis dataKey="dia" tick={AXIS_TICK} tickLine={false}
                    axisLine={{ stroke: GRID_COLOR }}
                    tickFormatter={fmtAxisDate} interval="preserveStartEnd" />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={60}
                    tickFormatter={(v) => `$${v.toFixed(4)}`} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "4 4" }}
                    labelFormatter={(v: string) => fmtDateBR(v)}
                    formatter={(v: number) => [fmtUSD(v), "Custo"]}
                  />
                  <Area type="monotone" dataKey="custo" name="Custo"
                    stroke="hsl(var(--primary))" strokeWidth={2}
                    fill="url(#costGrad)" dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tokens by day + by model */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card>
            <CardHeader className="pb-1">
              <p className="text-sm font-semibold text-foreground">Tokens por Dia</p>
              <p className="text-xs text-muted-foreground">Entrada vs. Saída</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-52 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : byDay.length === 0 ? (
                <div className="h-52 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Sem dados</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={byDay} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_COLOR} />
                    <XAxis dataKey="dia" tick={AXIS_TICK} tickLine={false}
                      axisLine={{ stroke: GRID_COLOR }}
                      tickFormatter={fmtAxisDate} interval="preserveStartEnd" />
                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40}
                      tickFormatter={(v) => fmtTokens(v)} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={CURSOR_STYLE}
                      labelFormatter={(v: string) => fmtDateBR(v)}
                      formatter={(v: number, name: string) => [fmtTokens(v), name === "input_tokens" ? "Entrada" : "Saída"]} />
                    <Legend iconType="circle" iconSize={8}
                      wrapperStyle={{ fontSize: 11, paddingTop: 8, color: "hsl(var(--muted-foreground))" }} />
                    <Bar dataKey="input_tokens" name="Entrada" fill="#4f63d2" radius={[3, 3, 0, 0]} stackId="a" maxBarSize={32} />
                    <Bar dataKey="output_tokens" name="Saída" fill="#818cf8" radius={[3, 3, 0, 0]} stackId="a" maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* By model */}
          <Card>
            <CardHeader className="pb-2">
              <p className="text-sm font-semibold text-foreground">Custo por Modelo</p>
              <p className="text-xs text-muted-foreground">Distribuição de gastos</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3 pt-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-1.5 animate-pulse">
                      <div className="h-3.5 bg-muted rounded w-40" />
                      <div className="h-2 bg-muted rounded-full" />
                    </div>
                  ))}
                </div>
              ) : byModel.length === 0 ? (
                <div className="h-52 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Nenhum dado de modelo</p>
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  {byModel.map((m, i) => (
                    <div key={m.model}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: MODEL_COLORS[i % MODEL_COLORS.length] }}
                          />
                          <span className="text-xs font-medium text-foreground truncate max-w-[160px]" title={m.model}>
                            {m.model}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-muted-foreground">{fmtTokens(m.total_tokens)} tok</span>
                          <span className="text-xs font-bold text-foreground">{fmtUSD(m.total_cost)}</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${m.pct}%`,
                            backgroundColor: MODEL_COLORS[i % MODEL_COLORS.length],
                          }}
                        />
                      </div>
                      <div className="flex justify-end mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{m.pct.toFixed(1)}% do total</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}