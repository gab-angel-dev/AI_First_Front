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
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

const emptyProcedure: Omit<Procedure, "descricao" | "triagem"> & {
  descricao: string;
  triagem: string;
} = {
  nome: "",
  duracao_minutos: 15,
  preco: 0,
  descricao: "",
  triagem: "",
};

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

const defaultValues: DoctorFormValues = {
  name: "",
  doctor_number: "",
  calendar_id: "",
  active: true,
  procedures: [
    {
      nome: "",
      duracao_minutos: 15,
      preco: 0,
      descricao: null,
      triagem: null,
    },
  ],
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
  open,
  onOpenChange,
  doctor,
  onSubmit,
  submitError,
}: DoctorFormModalProps) {
  const [values, setValues] = useState<DoctorFormValues>(() =>
    doctor ? doctorToFormValues(doctor) : { ...defaultValues }
  );
  const [insuranceInput, setInsuranceInput] = useState("");
  const [restrictionsText, setRestrictionsText] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = useCallback(() => {
    setValues(doctor ? doctorToFormValues(doctor) : { ...defaultValues });
    setInsuranceInput("");
    setRestrictionsText(doctor?.restrictions ? JSON.stringify(doctor.restrictions, null, 2) : "");
  }, [doctor]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetForm();
      onOpenChange(next);
    },
    [onOpenChange, resetForm]
  );

  const handleInsuranceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && insuranceInput.trim()) {
      e.preventDefault();
      const tag = insuranceInput.trim().toLowerCase();
      if (!values.insurances.includes(tag)) {
        setValues((v) => ({ ...v, insurances: [...v.insurances, tag] }));
        setInsuranceInput("");
      }
    }
  };

  const removeInsurance = (idx: number) => {
    setValues((v) => ({
      ...v,
      insurances: v.insurances.filter((_, i) => i !== idx),
    }));
  };

  const toggleWeekday = (d: number) => {
    setValues((v) => {
      const next = v.available_weekdays.includes(d)
        ? v.available_weekdays.filter((x) => x !== d)
        : [...v.available_weekdays, d].sort((a, b) => a - b);
      return { ...v, available_weekdays: next };
    });
  };

  const addProcedure = () => {
    setValues((v) => ({
      ...v,
      procedures: [
        ...v.procedures,
        { ...emptyProcedure, descricao: null, triagem: null },
      ],
    }));
  };

  const updateProcedure = (idx: number, field: keyof Procedure, value: unknown) => {
    setValues((v) => {
      const arr = [...v.procedures];
      const p = { ...arr[idx], [field]: value };
      if (field === "duracao_minutos") p.duracao_minutos = Number(value);
      if (field === "preco") {
        p.preco = value === "definir_com_doutor" ? "definir_com_doutor" : Number(value);
      }
      if (field === "descricao") p.descricao = (value as string) || null;
      if (field === "triagem") p.triagem = (value as string) || null;
      arr[idx] = p;
      return { ...v, procedures: arr };
    });
  };

  const removeProcedure = (idx: number) => {
    if (values.procedures.length <= 1) return;
    setValues((v) => ({
      ...v,
      procedures: v.procedures.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let restrictions: Record<string, unknown> | null = null;
      if (restrictionsText.trim()) {
        try {
          restrictions = JSON.parse(restrictionsText);
        } catch {
          alert("Restrições: JSON inválido");
          setLoading(false);
          return;
        }
      }
      const wh = { ...values.working_hours };
      if (!wh.tarde?.inicio || !wh.tarde?.fim) {
        delete wh.tarde;
      }
      await onSubmit({ ...values, working_hours: wh, restrictions });
      handleOpenChange(false);
    } catch {
      // error já vem via submitError
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      if (doctor) {
        setValues(doctorToFormValues(doctor));
        setRestrictionsText(doctor.restrictions ? JSON.stringify(doctor.restrictions, null, 2) : "");
      } else {
        setValues({ ...defaultValues });
        setRestrictionsText("");
        setInsuranceInput("");
      }
    }
  }, [open, doctor]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        title={doctor ? "Editar Doutor" : "Novo Doutor"}
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campos simples */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nome *</label>
              <Input
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                placeholder="Dra. Maria Silva"
                required
                minLength={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">WhatsApp</label>
              <Input
                value={values.doctor_number}
                onChange={(e) => setValues((v) => ({ ...v, doctor_number: e.target.value }))}
                placeholder="5585999990000"
              />
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => removeProcedure(idx)}
                      >
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
                        placeholder="Limpeza"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Duração (min) *</label>
                      <Input
                        type="number"
                        min={15}
                        value={p.duracao_minutos}
                        onChange={(e) =>
                          updateProcedure(idx, "duracao_minutos", e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Preço *</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={p.preco === "definir_com_doutor" ? "" : p.preco}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "") return;
                          updateProcedure(idx, "preco", parseFloat(v) || 0);
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
                          updateProcedure(
                            idx,
                            "preco",
                            p.preco === "definir_com_doutor" ? 0 : "definir_com_doutor"
                          )
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
                      placeholder="Texto explicativo..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Triagem (instrução para IA)</label>
                    <Textarea
                      value={p.triagem ?? ""}
                      onChange={(e) => updateProcedure(idx, "triagem", e.target.value)}
                      placeholder="null = sem triagem"
                      rows={2}
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
                  <input
                    type="checkbox"
                    checked={values.available_weekdays.includes(d)}
                    onChange={() => toggleWeekday(d)}
                    className="sr-only"
                  />
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
                <Input
                  type="time"
                  value={values.working_hours.manha.inicio}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      working_hours: {
                        ...v.working_hours,
                        manha: { ...v.working_hours.manha, inicio: e.target.value },
                      },
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Manhã fim</label>
                <Input
                  type="time"
                  value={values.working_hours.manha.fim}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      working_hours: {
                        ...v.working_hours,
                        manha: { ...v.working_hours.manha, fim: e.target.value },
                      },
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tarde início</label>
                <Input
                  type="time"
                  value={values.working_hours.tarde?.inicio ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      working_hours: {
                        ...v.working_hours,
                        tarde: {
                          ...v.working_hours.tarde,
                          inicio: e.target.value,
                          fim: v.working_hours.tarde?.fim ?? "18:00",
                        },
                      },
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tarde fim</label>
                <Input
                  type="time"
                  value={values.working_hours.tarde?.fim ?? ""}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      working_hours: {
                        ...v.working_hours,
                        tarde: {
                          ...v.working_hours.tarde,
                          inicio: v.working_hours.tarde?.inicio ?? "14:00",
                          fim: e.target.value,
                        },
                      },
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Convênios (tags) */}
          <div>
            <label className="text-sm font-medium mb-1 block">Convênios</label>
            <p className="text-xs text-muted-foreground mb-2">
              Digite e pressione Enter para adicionar (salvo em lowercase)
            </p>
            <Input
              value={insuranceInput}
              onChange={(e) => setInsuranceInput(e.target.value)}
              onKeyDown={handleInsuranceKeyDown}
              placeholder="unimed, bradesco, particular..."
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {values.insurances.map((ins, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-sm"
                >
                  {ins}
                  <button
                    type="button"
                    className="hover:text-destructive"
                    onClick={() => removeInsurance(i)}
                    aria-label={`Remover ${ins}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Restrições JSON */}
          <div>
            <label className="text-sm font-medium mb-1 block">Restrições (JSON)</label>
            <Textarea
              value={restrictionsText}
              onChange={(e) => setRestrictionsText(e.target.value)}
              placeholder='{"observacao": "...", "ferias": "2026-07-01/2026-07-15"}'
              rows={4}
              className="font-mono text-sm"
            />
          </div>

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
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
    procedures:
      d.procedures?.length > 0
        ? d.procedures.map((p) => ({
            nome: p.nome,
            duracao_minutos: p.duracao_minutos,
            preco: p.preco,
            descricao: p.descricao ?? null,
            triagem: p.triagem ?? null,
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
