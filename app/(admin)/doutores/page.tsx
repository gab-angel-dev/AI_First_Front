"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Power, PowerOff, Stethoscope, Clock, Calendar } from "lucide-react";
import { DoctorFormModal } from "@/components/shared/doutores/DoctorFormModal";
import type { DoctorListItem } from "@/app/api/admin/doctors/route";
import type { DoctorRule } from "@/lib/types";
import type { DoctorFormValues } from "@/components/shared/doutores/DoctorFormModal";

const WEEKDAY_LABELS: Record<number, string> = {
  0: "Dom", 1: "Seg", 2: "Ter", 3: "Qua", 4: "Qui", 5: "Sex", 6: "Sáb",
};

function DoctorAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const colors = [
    "from-blue-500 to-blue-600",
    "from-emerald-500 to-emerald-600",
    "from-violet-500 to-violet-600",
    "from-amber-500 to-amber-600",
    "from-rose-500 to-rose-600",
    "from-cyan-500 to-cyan-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const color = colors[Math.abs(hash) % colors.length];

  return (
    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
      <span className="text-white text-sm font-bold">{initials || "Dr"}</span>
    </div>
  );
}

export default function DoutoresPage() {
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorRule | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchDoctors = async () => {
    try {
      const res = await fetch("/api/admin/doctors");
      if (res.ok) setDoctors(await res.json());
    } catch { setDoctors([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDoctors(); }, []);

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/doctors/${id}/toggle`, { method: "PATCH" });
      if (res.ok) {
        const data = await res.json();
        setDoctors((prev) => prev.map((d) => d.id === id ? { ...d, active: data.active } : d));
      }
    } catch {}
  };

  const handleSubmit = async (values: DoctorFormValues) => {
    setSubmitError(null);
    const payload = {
      ...values,
      insurances: values.insurances.map((s) => s.toLowerCase().trim()).filter(Boolean),
    };
    try {
      if (editingDoctor) {
        const res = await fetch(`/api/admin/doctors/${editingDoctor.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setSubmitError(data.error ?? "Erro ao atualizar"); throw new Error(data.error); }
        setDoctors((prev) => prev.map((d) => d.id === editingDoctor.id
          ? { ...d, name: data.name, doctor_number: data.doctor_number || null, calendar_id: data.calendar_id, active: data.active, procedures: data.procedures ?? [], available_weekdays: data.available_weekdays ?? [], insurances: data.insurances ?? [] }
          : d));
      } else {
        const res = await fetch("/api/admin/doctors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) { setSubmitError(data.error ?? "Erro ao cadastrar"); throw new Error(data.error); }
        setDoctors((prev) => [...prev, { ...data, insurances: data.insurances ?? [] }]);
      }
    } catch (e) {
      if (e instanceof Error) throw e;
      setSubmitError("Erro ao salvar");
      throw e;
    }
  };

  const openNew = () => { setEditingDoctor(null); setModalOpen(true); };
  const openEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/doctors/${id}`);
      if (res.ok) { setEditingDoctor(await res.json()); setModalOpen(true); }
    } catch {}
  };

  const activeCount = doctors.filter((d) => d.active).length;

  return (
    <div className="h-full overflow-y-auto p-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Doutores</h1>
          <p className="page-subtitle">
            {activeCount} ativo{activeCount !== 1 ? "s" : ""} · {doctors.length} total
          </p>
        </div>
        <Button onClick={openNew} size="sm">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Novo doutor
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-muted rounded w-32" />
                  <div className="h-3 bg-muted rounded w-20" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Stethoscope className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Nenhum doutor cadastrado</p>
          <p className="text-xs text-muted-foreground mb-4">Adicione o primeiro doutor para começar</p>
          <Button onClick={openNew} size="sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Adicionar doutor
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {doctors.map((d) => (
            <Card
              key={d.id}
              className={`card-hover ${!d.active ? "opacity-60" : ""}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <DoctorAvatar name={d.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">{d.name}</span>
                      <Badge variant={d.active ? "success" : "secondary"} dot>
                        {d.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    {d.doctor_number && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{d.doctor_number}</p>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                {/* Procedures */}
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Stethoscope className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10.5px] font-medium text-muted-foreground uppercase tracking-wider">
                      Procedimentos
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {d.procedures?.length
                      ? d.procedures.slice(0, 3).map((p) => (
                          <span key={p.nome} className="tag-pill">{p.nome}</span>
                        ))
                      : <span className="text-xs text-muted-foreground">—</span>}
                    {(d.procedures?.length ?? 0) > 3 && (
                      <span className="tag-pill">+{d.procedures.length - 3}</span>
                    )}
                  </div>
                </div>

                {/* Days */}
                <div>
                  <div className="flex items-center gap-1 mb-1.5">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10.5px] font-medium text-muted-foreground uppercase tracking-wider">
                      Dias
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[0,1,2,3,4,5,6].map((day) => (
                      <span
                        key={day}
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          d.available_weekdays?.includes(day)
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground/40"
                        }`}
                      >
                        {WEEKDAY_LABELS[day]}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Insurances */}
                {d.insurances && d.insurances.length > 0 && (
                  <div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {d.insurances.slice(0, 3).map((ins) => (
                        <Badge key={ins} variant="outline" size="sm">{ins}</Badge>
                      ))}
                      {d.insurances.length > 3 && (
                        <Badge variant="outline" size="sm">+{d.insurances.length - 3}</Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-border/60 mt-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(d.id)} className="flex-1 text-xs">
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />
                    Editar
                  </Button>
                  <Button
                    variant={d.active ? "outline" : "default"}
                    size="icon-sm"
                    onClick={() => handleToggle(d.id)}
                    title={d.active ? "Desativar" : "Ativar"}
                  >
                    {d.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DoctorFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        doctor={editingDoctor}
        onSubmit={handleSubmit}
        submitError={submitError}
      />
    </div>
  );
}