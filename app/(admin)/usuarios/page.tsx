"use client";

import { useEffect, useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { ChatPanel } from "@/components/shared/usuarios/ChatPanel";
import type { UserListItem } from "@/app/api/admin/users/route";
import { Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

function UserInitials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 border border-primary/20 flex items-center justify-center shrink-0">
      <span className="text-xs font-semibold text-primary">{initials || "?"}</span>
    </div>
  );
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/admin/users");
        if (res.ok) setUsers(await res.json());
      } catch { setUsers([]); }
      finally { setLoading(false); }
    }
    fetchUsers();
  }, []);

  const humanCount = users.filter((u) => u.require_human).length;

  const filteredUsers = search
    ? users.filter((u) =>
        (u.complete_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        u.phone_number.includes(search)
      )
    : users;

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Sidebar de usuários ─────────────────────────── */}
      <div className="w-80 shrink-0 border-r flex flex-col min-h-0 bg-card">

        {/* Header */}
        <div className="p-4 border-b shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-semibold text-foreground">Usuários</h1>
              <p className="text-xs text-muted-foreground">{users.length} conversas</p>
            </div>
            {humanCount > 0 && (
              <Badge variant="destructive" dot>
                {humanCount} humano{humanCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar usuário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-muted rounded w-28" />
                    <div className="h-3 bg-muted rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
              <Users className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">
                {search ? "Nenhum resultado encontrado" : "Nenhum usuário"}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {filteredUsers.map((u) => {
                const isSelected = selected === u.phone_number;
                const displayName = u.complete_name || u.phone_number;
                return (
                  <button
                    key={u.phone_number}
                    onClick={() => setSelected(u.phone_number)}
                    className={[
                      "w-full text-left flex items-center gap-3 p-3 rounded-xl transition-all duration-100",
                      isSelected
                        ? "bg-primary/10 border border-primary/20"
                        : u.require_human
                        ? "bg-destructive/5 border border-destructive/15 hover:bg-destructive/8"
                        : "hover:bg-muted/60 border border-transparent",
                    ].join(" ")}
                  >
                    <div className="relative">
                      <UserInitials name={displayName} />
                      {u.require_human && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-destructive rounded-full border-2 border-card" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-semibold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {displayName}
                        </span>
                        {u.last_activity && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(u.last_activity).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                          </span>
                        )}
                      </div>
                      {u.complete_name && (
                        <p className="text-[10.5px] text-muted-foreground truncate">{u.phone_number}</p>
                      )}
                      {u.last_message && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {u.last_message}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Chat area ──────────────────────────────────── */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-background">
        {selected ? (
          <ChatPanel
            phoneNumber={selected}
            onUserUpdate={(updated) => {
              setUsers((prev) =>
                prev.map((u) =>
                  u.phone_number === updated.phone_number
                    ? { ...u, require_human: updated.require_human }
                    : u
                )
              );
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Selecione uma conversa</p>
            <p className="text-xs text-muted-foreground">
              Escolha um usuário na lista para visualizar o histórico de mensagens
            </p>
          </div>
        )}
      </div>
    </div>
  );
}