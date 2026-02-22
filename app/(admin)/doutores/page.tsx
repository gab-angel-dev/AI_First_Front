"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Power, PowerOff } from "lucide-react";
import { DoctorFormModal } from "@/components/shared/doutores/DoctorFormModal";
import type { DoctorListItem } from "@/app/api/admin/doctors/route";
import type { DoctorRule } from "@/lib/types";
import type { DoctorFormValues } from "@/components/shared/doutores/DoctorFormModal";

const WEEKDAY_LABELS: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

export default function DoutoresPage() {
  const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorRule | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchDoctors = async () => {
    try {
      const res = await fetch("/api/admin/doctors");
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);
      }
    } catch {
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/doctors/${id}/toggle`, { method: "PATCH" });
      if (res.ok) {
        const data = await res.json();
        setDoctors((prev) =>
          prev.map((d) => (d.id === id ? { ...d, active: data.active } : d))
        );
      }
    } catch {
      // ignore
    }
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
        if (!res.ok) {
          setSubmitError(data.error ?? "Erro ao atualizar");
          throw new Error(data.error);
        }
        setDoctors((prev) =>
          prev.map((d) =>
            d.id === editingDoctor.id
              ? {
                  ...d,
                  name: data.name,
                  doctor_number: data.doctor_number || null,
                  calendar_id: data.calendar_id,
                  active: data.active,
                  procedures: data.procedures ?? [],
                  available_weekdays: data.available_weekdays ?? [],
                  insurances: data.insurances ?? [],
                }
              : d
          )
        );
      } else {
        const res = await fetch("/api/admin/doctors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          setSubmitError(data.error ?? "Erro ao cadastrar");
          throw new Error(data.error);
        }
        setDoctors((prev) => [...prev, { ...data, insurances: data.insurances ?? [] }]);
      }
    } catch (e) {
      if (e instanceof Error) throw e;
      setSubmitError("Erro ao salvar");
      throw e;
    }
  };

  const openNew = () => {
    setEditingDoctor(null);
    setModalOpen(true);
  };

  const openEdit = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/doctors/${id}`);
      if (res.ok) {
        const data: DoctorRule = await res.json();
        setEditingDoctor(data);
        setModalOpen(true);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Doutores</h1>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Doutor
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : doctors.length === 0 ? (
        <p className="text-muted-foreground">Nenhum doutor cadastrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((d) => (
            <Card
              key={d.id}
              className={`transition-opacity ${
                !d.active ? "opacity-60 bg-muted/30" : ""
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold truncate">{d.name}</span>
                  <Badge
                    variant={d.active ? "default" : "secondary"}
                    className="shrink-0 text-xs"
                  >
                    {d.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                {d.doctor_number && (
                  <p className="text-xs text-muted-foreground">{d.doctor_number}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Procedimentos
                  </p>
                  <p className="text-sm">
                    {d.procedures?.length
                      ? d.procedures.map((p) => p.nome).join(", ")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Dias</p>
                  <p className="text-sm">
                    {d.available_weekdays?.length
                      ? d.available_weekdays
                          .map((wd) => WEEKDAY_LABELS[wd] ?? wd)
                          .join(", ")
                      : "—"}
                  </p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(d.id)}
                    className="flex-1"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant={d.active ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleToggle(d.id)}
                    title={d.active ? "Desativar" : "Ativar"}
                  >
                    {d.active ? (
                      <PowerOff className="h-4 w-4" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
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
