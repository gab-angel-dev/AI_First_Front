"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Pencil, Trash2, Power, PowerOff,
  KeyRound, X, ShieldCheck, Loader2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  name: string;
  email: string;
  active: boolean;
  created_at: string;
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  open, message, onConfirm, onCancel, loading,
}: {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="fixed inset-0 modal-backdrop" onClick={onCancel} />
      <div className="relative z-[61] bg-card rounded-2xl border p-6 shadow-elevation-xl max-w-sm w-full mx-4 animate-scale-in">
        <p className="text-sm leading-relaxed text-foreground mb-6">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirmar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── User Form Modal ──────────────────────────────────────────────────────────

type ModalMode = "create" | "edit" | "password";

function UserModal({
  open,
  mode,
  user,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: ModalMode;
  user: AdminUser | null;
  onClose: () => void;
  onSuccess: (updated: AdminUser) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(user?.name ?? "");
      setEmail(user?.email ?? "");
      setPassword("");
      setConfirmPassword("");
      setError(null);
    }
  }, [open, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if ((mode === "create" || mode === "password") && password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      let res: Response;

      if (mode === "create") {
        res = await fetch("/api/admin/admin-users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
      } else if (mode === "edit") {
        res = await fetch(`/api/admin/admin-users/${user!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email }),
        });
      } else {
        // password
        res = await fetch(`/api/admin/admin-users/${user!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "change-password", password }),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro desconhecido");

      onSuccess(mode === "password" ? { ...user!, ...data } : data);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const titles: Record<ModalMode, string> = {
    create: "Novo usuário",
    edit: "Editar usuário",
    password: "Trocar senha",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 modal-backdrop" onClick={onClose} />
      <div className="relative z-50 bg-card rounded-2xl border shadow-elevation-xl max-w-md w-full mx-4 overflow-hidden animate-scale-in">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{titles[mode]}</h2>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode !== "password" && (
            <>
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Nome *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome completo"
                  required
                  minLength={2}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Email *</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@clinica.com"
                  required
                />
              </div>
            </>
          )}

          {(mode === "create" || mode === "password") && (
            <>
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">
                  {mode === "password" ? "Nova senha *" : "Senha *"}
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">
                  Confirmar senha *
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  required
                />
              </div>
            </>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Salvando...</>
              ) : mode === "create" ? "Criar usuário" : mode === "edit" ? "Salvar" : "Trocar senha"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── User Initials Avatar ─────────────────────────────────────────────────────

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter((w) => w.length > 1)
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
      <span className="text-white text-sm font-bold">{initials || "?"}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Confirm modal
  const [confirm, setConfirm] = useState<{
    open: boolean;
    message: string;
    action: () => Promise<void>;
  }>({ open: false, message: "", action: async () => {} });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/admin-users");
      if (res.ok) setUsers(await res.json());
    } catch {
      setError("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function openCreate() {
    setSelectedUser(null);
    setModalMode("create");
    setModalOpen(true);
  }

  function openEdit(user: AdminUser) {
    setSelectedUser(user);
    setModalMode("edit");
    setModalOpen(true);
  }

  function openPassword(user: AdminUser) {
    setSelectedUser(user);
    setModalMode("password");
    setModalOpen(true);
  }

  function handleModalSuccess(updated: AdminUser) {
    setUsers((prev) => {
      const exists = prev.find((u) => u.id === updated.id);
      return exists
        ? prev.map((u) => (u.id === updated.id ? updated : u))
        : [...prev, updated];
    });
  }

  async function handleToggle(user: AdminUser) {
    const next = !user.active;
    const label = next ? "ativar" : "desativar";
    setConfirm({
      open: true,
      message: `Deseja ${label} o usuário "${user.name}"?`,
      action: async () => {
        const res = await fetch(`/api/admin/admin-users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "toggle" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, active: data.active } : u))
        );
      },
    });
  }

  async function handleDelete(user: AdminUser) {
    setConfirm({
      open: true,
      message: `Deletar permanentemente "${user.name}"? Esta ação não pode ser desfeita.`,
      action: async () => {
        const res = await fetch(`/api/admin/admin-users/${user.id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
      },
    });
  }

  async function runConfirm() {
    setConfirmLoading(true);
    try {
      await confirm.action();
      setConfirm((c) => ({ ...c, open: false }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao executar operação");
      setConfirm((c) => ({ ...c, open: false }));
    } finally {
      setConfirmLoading(false);
    }
  }

  const activeCount = users.filter((u) => u.active).length;

  return (
    <div className="h-full overflow-y-auto p-5">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Usuários do Painel
          </h1>
          <p className="page-subtitle">
            {activeCount} ativo{activeCount !== 1 ? "s" : ""} · {users.length} total
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Novo usuário
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-5">
          {error}
          <button className="ml-3 underline" onClick={() => setError(null)}>Fechar</button>
        </div>
      )}

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 bg-muted rounded w-40" />
                    <div className="h-3 bg-muted rounded w-56" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShieldCheck className="h-10 w-10 text-muted-foreground mb-3 opacity-40" />
              <p className="text-sm font-medium text-foreground mb-1">Nenhum usuário cadastrado</p>
              <p className="text-xs text-muted-foreground mb-4">Crie o primeiro usuário do painel</p>
              <Button onClick={openCreate} size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Criar usuário
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/30 ${
                    !user.active ? "opacity-50" : ""
                  }`}
                >
                  <UserAvatar name={user.name} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {user.name}
                      </span>
                      <Badge variant={user.active ? "success" : "secondary"} dot>
                        {user.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                      Criado em{" "}
                      {new Date(user.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => openEdit(user)}
                      title="Editar nome/email"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => openPassword(user)}
                      title="Trocar senha"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => handleToggle(user)}
                      title={user.active ? "Desativar" : "Ativar"}
                    >
                      {user.active
                        ? <PowerOff className="h-3.5 w-3.5" />
                        : <Power className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => handleDelete(user)}
                      title="Deletar"
                      className="hover:border-destructive/40 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <UserModal
        open={modalOpen}
        mode={modalMode}
        user={selectedUser}
        onClose={() => setModalOpen(false)}
        onSuccess={handleModalSuccess}
      />

      <ConfirmModal
        open={confirm.open}
        message={confirm.message}
        onConfirm={runConfirm}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
        loading={confirmLoading}
      />
    </div>
  );
}