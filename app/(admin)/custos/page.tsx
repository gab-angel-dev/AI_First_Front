"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Coins, TrendingDown, TrendingUp, DollarSign } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Summary {
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  estimated_cost_brl: number;
  exchange_rate: number;
  period: { start: string; end: string };
}

interface TokensByDay {
  dia: string;
  entrada: number;
  saida: number;
}

interface CostByDay {
  dia: string;
  custo_usd: number;
}

interface ByModel {
  model_name: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
}

interface ByUser {
  phone_number: string;
  complete_name: string | null;
  interacoes: number;
  total_tokens: number;
  estimated_cost_usd: number;
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

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#14b8a6", "#a855f7"];

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({
  title,
  value,
  sub,
  icon: Icon,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-muted-foreground">{title}</p>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustosPage() {
  const [range, setRange] = useState(defaultRange);
  const [customMode, setCustomMode] = useState(false);
  const [activePreset, setActivePreset] = useState(30);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [tokensByDay, setTokensByDay] = useState<TokensByDay[]>([]);
  const [costByDay, setCostByDay] = useState<CostByDay[]>([]);
  const [byModel, setByModel] = useState<ByModel[]>([]);
  const [byUser, setByUser] = useState<ByUser[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (start: string, end: string) => {
    setLoading(true);
    setError(null);
    try {
      const p = `start=${start}&end=${end}`;
      const [sRes, tRes, cRes, mRes, uRes] = await Promise.all([
        fetch(`/api/admin/costs/summary?${p}`),
        fetch(`/api/admin/costs/tokens-by-day?${p}`),
        fetch(`/api/admin/costs/cost-by-day?${p}`),
        fetch(`/api/admin/costs/by-model?${p}`),
        fetch(`/api/admin/costs/by-user?${p}`),
      ]);

      if (!sRes.ok) throw new Error("Erro ao buscar resumo");

      const [s, t, c, m, u] = await Promise.all([
        sRes.json(), tRes.json(), cRes.json(), mRes.json(), uRes.json(),
      ]);

      setSummary(s);
      setTokensByDay(Array.isArray(t) ? t : []);
      setCostByDay(Array.isArray(c) ? c : []);
      setByModel(Array.isArray(m) ? m : []);
      setByUser(Array.isArray(u) ? u : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar custos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(range.start, range.end); }, [fetchAll, range]);

  function applyPreset(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    setRange({ start: toDateStr(start), end: toDateStr(end) });
    setActivePreset(days);
    setCustomMode(false);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header + filtro */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Custos</h1>
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
              <Button size="sm" onClick={() => { setCustomMode(false); fetchAll(range.start, range.end); }}>
                Aplicar
              </Button>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total de Tokens"
          value={loading ? "—" : fmtTokens(summary?.total_tokens ?? 0)}
          sub={loading ? undefined : `Entrada: ${fmtTokens(summary?.input_tokens ?? 0)} · Saída: ${fmtTokens(summary?.output_tokens ?? 0)}`}
          icon={Coins}
        />
        <MetricCard
          title="Tokens de Entrada"
          value={loading ? "—" : fmtTokens(summary?.input_tokens ?? 0)}
          icon={TrendingDown}
        />
        <MetricCard
          title="Tokens de Saída"
          value={loading ? "—" : fmtTokens(summary?.output_tokens ?? 0)}
          icon={TrendingUp}
        />
        <MetricCard
          title="Custo Estimado"
          value={loading ? "—" : `$${summary?.estimated_cost_usd.toFixed(4) ?? "0"}`}
          sub={loading ? undefined : `R$ ${summary?.estimated_cost_brl.toFixed(2)} · Câmbio: ${summary?.exchange_rate.toFixed(2)}`}
          icon={DollarSign}
        />
      </div>

      {/* Gráficos linha 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tokens por dia */}
        <Card>
          <CardHeader className="pb-2">
            <p className="font-semibold">Tokens por Dia</p>
            <p className="text-xs text-muted-foreground">Entrada vs Saída</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>
            ) : tokensByDay.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={tokensByDay}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtTokens} />
                  <Tooltip formatter={(v: number) => [fmtTokens(v), ""]} labelFormatter={(v: string) => new Date(v + "T00:00:00").toLocaleDateString("pt-BR")} />
                  <Legend />
                  <Bar dataKey="entrada" name="Entrada" stackId="a" fill="#6366f1" />
                  <Bar dataKey="saida" name="Saída" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Distribuição por modelo */}
        <Card>
          <CardHeader className="pb-2">
            <p className="font-semibold">Distribuição por Modelo</p>
            <p className="text-xs text-muted-foreground">Total de tokens por modelo</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>
            ) : byModel.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={byModel}
                    dataKey="total_tokens"
                    nameKey="model_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ model_name, percent }: { model_name: string; percent: number }) =>
                      `${model_name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {byModel.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [fmtTokens(v), "Tokens"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Custo por dia — linha cheia */}
      <Card>
        <CardHeader className="pb-2">
          <p className="font-semibold">Custo por Dia (USD)</p>
          <p className="text-xs text-muted-foreground">Custo estimado acumulado por dia</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>
          ) : costByDay.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Sem dados no período</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={costByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v.toFixed(4)}`} />
                <Tooltip
                  formatter={(v: number) => [`$${v.toFixed(6)}`, "Custo USD"]}
                  labelFormatter={(v: string) => new Date(v + "T00:00:00").toLocaleDateString("pt-BR")}
                />
                <Line type="monotone" dataKey="custo_usd" name="Custo USD" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Ranking por usuário */}
      <Card>
        <CardHeader className="pb-2">
          <p className="font-semibold">Top 20 Usuários por Consumo</p>
          <p className="text-xs text-muted-foreground">Período selecionado</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : byUser.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados no período</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="text-left pb-2 font-medium">Usuário</th>
                    <th className="text-right pb-2 font-medium">Interações</th>
                    <th className="text-right pb-2 font-medium">Tokens</th>
                    <th className="text-right pb-2 font-medium">Custo (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {byUser.map((u) => (
                    <tr key={u.phone_number} className="border-b last:border-0">
                      <td className="py-2">
                        <p className="font-medium truncate max-w-[180px]">
                          {u.complete_name ?? u.phone_number}
                        </p>
                        {u.complete_name && (
                          <p className="text-xs text-muted-foreground">{u.phone_number}</p>
                        )}
                      </td>
                      <td className="py-2 text-right">{u.interacoes}</td>
                      <td className="py-2 text-right">{fmtTokens(u.total_tokens)}</td>
                      <td className="py-2 text-right">${u.estimated_cost_usd.toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}