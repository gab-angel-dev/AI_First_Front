"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { DoctorRule, Procedure } from "@/lib/types";

const WEEKDAY_LABELS: Record<number, string> = {
  0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb",
};

const emptyProcedure: Omit<Procedure, "descricao" | "triagem"> & {
  descricao: string; triagem: string;
} = { nome: "", duracao_minutos: 15, preco: 0, descricao: "", triagem: "" };

export interface DoctorFormValues {
  name: string;
  doctor_number: string;
  calendar_id: string;
  active: boolean;
  procedures: Array<{
    nome: string;
    duracao_minutos: number;
    preco: number | "definir_com_doutor";
    descricao: string | null;
    triagem: string | null;
  }>;
  available_weekdays: number[];
  working_hours: {
    manha: { inicio: string; fim: string };
    tarde?: { inicio: string; fim: string };
  };
  insurances: string[];
  restrictions: Record<string, unknown> | null;
}

// ── Restrições: pares chave→valor ────────────────────────────────────────────
interface RestrictionRow { key: string; value: string }

function rowsToObject(rows: RestrictionRow[]): Record<string, unknown> | null {
  const filled = rows.filter((r) => r.key.trim());
  if (!filled.length) return null;
  return Object.fromEntries(filled.map((r) => [r.key.trim(), r.value.trim()]));
}

function objectToRows(obj: Record<string, unknown> | null): RestrictionRow[] {
  if (!obj || !Object.keys(obj).length) return [{ key: "", value: "" }];
  return Object.entries(obj).map(([key, value]) => ({
    key,
    value: typeof value === "string" ? value : JSON.stringify(value),
  }));
}

const defaultValues: DoctorFormValues = {
  name: "", doctor_number: "", calendar_id: "", active: true,
  procedures: [{ nome: "", duracao_minutos: 15, preco: 0, descricao: null, triagem: null }],
  available_weekdays: [1, 2, 3, 4, 5],
  working_hours: {
    manha: { inicio: "08:00", fim: "12:00" },
    tarde: { inicio: "14:00", fim: "18:00" },
  },
  insurances: [],
  restrictions: null,
};

interface DoctorFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: DoctorRule | null;
  onSubmit: (values: DoctorFormValues) => Promise<void>;
  submitError: string | null;
}

export function DoctorFormModal({
  open, onOpenChange, doctor, onSubmit, submitError,
}: DoctorFormModalProps) {
  const [values, setValues] = useState<DoctorFormValues>(() =>
    doctor ? doctorToFormValues(doctor) : { ...defaultValues }
  );
  const [insuranceInput, setInsuranceInput] = useState("");
  const [restrictionRows, setRestrictionRows] = useState<RestrictionRow[]>([{ key: "", value: "" }]);
  const [loading, setLoading] = useState(false);
  // FIX 4: erro de validação whatsapp
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setValues(doctor ? doctorToFormValues(doctor) : { ...defaultValues });
    setInsuranceInput("");
    setRestrictionRows(objectToRows(doctor?.restrictions ?? null));
    setPhoneError(null);
  }, [doctor]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetForm();
      onOpenChange(next);
    },
    [onOpenChange, resetForm]
  );

  useEffect(() => {
    if (open) {
      setValues(doctor ? doctorToFormValues(doctor) : { ...defaultValues });
      setInsuranceInput("");
      setRestrictionRows(objectToRows(doctor?.restrictions ?? null));
      setPhoneError(null);
    }
  }, [open, doctor]);

  // FIX 4: validação whatsapp
  function validatePhone(raw: string): string | null {
    if (!raw.trim()) return null; // opcional
    const digits = raw.replace(/\D/g, "");
    if (!digits.startsWith("55")) return "Deve começar com DDI 55 (ex: 558599990000)";
    if (digits.length !== 12) return "Deve ter exatamente 12 dígitos (ex: 558599990000)";
    return null;
  }

  const handlePhoneChange = (val: string) => {
    setValues((v) => ({ ...v, doctor_number: val }));
    setPhoneError(validatePhone(val));
  };

  // FIX 3: split por vírgula + Enter
  function commitInsurances(raw: string) {
    const tags = raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!tags.length) return;
    setValues((v) => ({
      ...v,
      insurances: [
        ...v.insurances,
        ...tags.filter((t) => !v.insurances.includes(t)),
      ],
    }));
    setInsuranceInput("");
  }

  const handleInsuranceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); commitInsurances(insuranceInput); }
    if (e.key === ",") { e.preventDefault(); commitInsurances(insuranceInput); }
  };

  const handleInsuranceBlur = () => {
    if (insuranceInput.trim()) commitInsurances(insuranceInput);
  };

  const removeInsurance = (idx: number) =>
    setValues((v) => ({ ...v, insurances: v.insurances.filter((_, i) => i !== idx) }));

  const toggleWeekday = (d: number) =>
    setValues((v) => {
      const next = v.available_weekdays.includes(d)
        ? v.available_weekdays.filter((x) => x !== d)
        : [...v.available_weekdays, d].sort((a, b) => a - b);
      return { ...v, available_weekdays: next };
    });

  const addProcedure = () =>
    setValues((v) => ({
      ...v,
      procedures: [...v.procedures, { ...emptyProcedure, descricao: null, triagem: null }],
    }));

  const updateProcedure = (idx: number, field: keyof Procedure, value: unknown) =>
    setValues((v) => {
      const arr = [...v.procedures];
      const p = { ...arr[idx], [field]: value };
      if (field === "duracao_minutos") p.duracao_minutos = Number(value);
      if (field === "preco")
        p.preco = value === "definir_com_doutor" ? "definir_com_doutor" : Number(value);
      if (field === "descricao") p.descricao = (value as string) || null;
      if (field === "triagem") p.triagem = (value as string) || null;
      arr[idx] = p;
      return { ...v, procedures: arr };
    });

  const removeProcedure = (idx: number) => {
    if (values.procedures.length <= 1) return;
    setValues((v) => ({ ...v, procedures: v.procedures.filter((_, i) => i !== idx) }));
  };

  // FIX 2: restrições — pares chave/valor
  const updateRow = (idx: number, field: "key" | "value", val: string) =>
    setRestrictionRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r))
    );
  const addRow = () => setRestrictionRows((prev) => [...prev, { key: "", value: "" }]);
  const removeRow = (idx: number) =>
    setRestrictionRows((prev) =>
      prev.length === 1 ? [{ key: "", value: "" }] : prev.filter((_, i) => i !== idx)
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pErr = validatePhone(values.doctor_number);
    if (pErr) { setPhoneError(pErr); return; }
    if (insuranceInput.trim()) commitInsurances(insuranceInput);
    setLoading(true);
    try {
      const restrictions = rowsToObject(restrictionRows);
      const wh = { ...values.working_hours };
      if (!wh.tarde?.inicio || !wh.tarde?.fim) delete wh.tarde;
      await onSubmit({ ...values, working_hours: wh, restrictions });
      handleOpenChange(false);
    } catch {
      // erro vem via submitError
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent title={doctor ? "Editar Doutor" : "Novo Doutor"} className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Dados básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nome *</label>
              <Input
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                placeholder="Dra. Maria Silva"
                required minLength={3}
              />
            </div>
            <div>
              {/* FIX 4 */}
              <label className="text-sm font-medium mb-1 block">WhatsApp</label>
              <Input
                value={values.doctor_number}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="558599990000"
                maxLength={15}
              />
              {phoneError ? (
                <p className="text-xs text-destructive mt-1">{phoneError}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  12 dígitos · DDI 55 obrigatório · ex: 558599990000
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Google Calendar ID *</label>
            <Input
              value={values.calendar_id}
              onChange={(e) => setValues((v) => ({ ...v, calendar_id: e.target.value }))}
              placeholder="medico@gmail.com"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={values.active}
              onCheckedChange={(c) => setValues((v) => ({ ...v, active: c }))}
            />
            <span className="text-sm font-medium">Ativo</span>
          </div>

          {/* Procedimentos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Procedimentos *</label>
              <Button type="button" variant="outline" size="sm" onClick={addProcedure}>
                + Adicionar procedimento
              </Button>
            </div>
            <div className="space-y-4 border rounded-lg p-4">
              {values.procedures.map((p, idx) => (
                <div key={idx} className="border-b pb-4 last:border-0 last:pb-0 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Procedimento {idx + 1}</span>
                    {values.procedures.length > 1 && (
                      <Button type="button" variant="ghost" size="sm"
                        className="text-destructive" onClick={() => removeProcedure(idx)}>
                        Remover
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Nome *</label>
                      <Input
                        value={p.nome}
                        onChange={(e) => updateProcedure(idx, "nome", e.target.value)}
                        placeholder="Limpeza" required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Duração (min) *</label>
                      <Input
                        type="number" min={15}
                        value={p.duracao_minutos}
                        onChange={(e) => updateProcedure(idx, "duracao_minutos", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Preço *</label>
                    <div className="flex gap-2">
                      <Input
                        type="number" min={0}
                        step="1" // FIX 1: incremento R$1,00
                        value={p.preco === "definir_com_doutor" ? "" : p.preco}
                        onChange={(e) => {
                          if (e.target.value === "") return;
                          updateProcedure(idx, "preco", parseFloat(e.target.value) || 0);
                        }}
                        placeholder="0"
                        disabled={p.preco === "definir_com_doutor"}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant={p.preco === "definir_com_doutor" ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          updateProcedure(idx, "preco",
                            p.preco === "definir_com_doutor" ? 0 : "definir_com_doutor")
                        }
                      >
                        Definir com doutor
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Descrição</label>
                    <Textarea
                      value={p.descricao ?? ""}
                      onChange={(e) => updateProcedure(idx, "descricao", e.target.value)}
                      placeholder="Texto explicativo..." rows={2}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Triagem (instrução para IA)</label>
                    <Textarea
                      value={p.triagem ?? ""}
                      onChange={(e) => updateProcedure(idx, "triagem", e.target.value)}
                      placeholder="Deixe vazio para sem triagem" rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dias da semana */}
          <div>
            <label className="text-sm font-medium mb-2 block">Dias disponíveis *</label>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <label
                  key={d}
                  className={`cursor-pointer px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    values.available_weekdays.includes(d)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  <input type="checkbox" checked={values.available_weekdays.includes(d)}
                    onChange={() => toggleWeekday(d)} className="sr-only" />
                  {WEEKDAY_LABELS[d]}
                </label>
              ))}
            </div>
          </div>

          {/* Horários */}
          <div>
            <label className="text-sm font-medium mb-2 block">Horário de trabalho *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Manhã início</label>
                <Input type="time" value={values.working_hours.manha.inicio}
                  onChange={(e) => setValues((v) => ({
                    ...v, working_hours: { ...v.working_hours,
                      manha: { ...v.working_hours.manha, inicio: e.target.value } }
                  }))} required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Manhã fim</label>
                <Input type="time" value={values.working_hours.manha.fim}
                  onChange={(e) => setValues((v) => ({
                    ...v, working_hours: { ...v.working_hours,
                      manha: { ...v.working_hours.manha, fim: e.target.value } }
                  }))} required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tarde início</label>
                <Input type="time" value={values.working_hours.tarde?.inicio ?? ""}
                  onChange={(e) => setValues((v) => ({
                    ...v, working_hours: { ...v.working_hours,
                      tarde: { ...v.working_hours.tarde, inicio: e.target.value,
                        fim: v.working_hours.tarde?.fim ?? "18:00" } }
                  }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tarde fim</label>
                <Input type="time" value={values.working_hours.tarde?.fim ?? ""}
                  onChange={(e) => setValues((v) => ({
                    ...v, working_hours: { ...v.working_hours,
                      tarde: { ...v.working_hours.tarde, fim: e.target.value,
                        inicio: v.working_hours.tarde?.inicio ?? "14:00" } }
                  }))} />
              </div>
            </div>
          </div>

          {/* FIX 3: Convênios separados por vírgula ou Enter */}
          <div>
            <label className="text-sm font-medium mb-1 block">Convênios</label>
            <p className="text-xs text-muted-foreground mb-2">
              Separe por vírgula ou pressione Enter · salvo em lowercase
            </p>
            <Input
              value={insuranceInput}
              onChange={(e) => setInsuranceInput(e.target.value)}
              onKeyDown={handleInsuranceKeyDown}
              onBlur={handleInsuranceBlur}
              placeholder="unimed, bradesco, particular"
            />
            {values.insurances.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {values.insurances.map((ins, i) => (
                  <span key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-muted text-foreground text-sm">
                    {ins}
                    <button type="button" className="hover:text-destructive"
                      onClick={() => removeInsurance(i)} aria-label={`Remover ${ins}`}>
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* FIX 2: Restrições como pares chave→valor */}
          <div>
            <label className="text-sm font-medium mb-1 block">Restrições</label>
            <p className="text-xs text-muted-foreground mb-2">
              Ex: "observacao" → "Não atende plano X" · "ferias" → "2026-07-01"
            </p>
            <div className="space-y-2">
              {restrictionRows.map((row, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={row.key}
                    onChange={(e) => updateRow(idx, "key", e.target.value)}
                    placeholder="chave"
                    className="flex-1"
                  />
                  <span className="text-muted-foreground text-sm shrink-0">→</span>
                  <Input
                    value={row.value}
                    onChange={(e) => updateRow(idx, "value", e.target.value)}
                    placeholder="valor"
                    className="flex-[2]"
                  />
                  <button type="button" onClick={() => removeRow(idx)}
                    className="text-muted-foreground hover:text-destructive text-xl leading-none shrink-0"
                    aria-label="Remover linha">
                    ×
                  </button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addRow}>
                + Adicionar restrição
              </Button>
            </div>
          </div>

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !!phoneError}>
              {loading ? "Salvando..." : doctor ? "Atualizar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function doctorToFormValues(d: DoctorRule): DoctorFormValues {
  return {
    name: d.name,
    doctor_number: d.doctor_number ?? "",
    calendar_id: d.calendar_id,
    active: d.active,
    procedures: d.procedures?.length > 0
      ? d.procedures.map((p) => ({
          nome: p.nome, duracao_minutos: p.duracao_minutos, preco: p.preco,
          descricao: p.descricao ?? null, triagem: p.triagem ?? null,
        }))
      : [{ ...emptyProcedure, descricao: null, triagem: null }],
    available_weekdays: d.available_weekdays ?? [1, 2, 3, 4, 5],
    working_hours: d.working_hours ?? {
      manha: { inicio: "08:00", fim: "12:00" },
      tarde: { inicio: "14:00", fim: "18:00" },
    },
    insurances: d.insurances ?? [],
    restrictions: d.restrictions ?? null,
  };
}