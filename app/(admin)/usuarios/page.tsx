"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatPanel } from "@/components/shared/usuarios/ChatPanel";
import type { UserListItem } from "@/app/api/admin/users/route";

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch("/api/admin/users");
        if (res.ok) setUsers(await res.json());
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const humanCount = users.filter((u) => u.require_human).length;

  return (
    /*
     * h-full ocupa exatamente a altura do <main> (que é flex-1 no AdminLayout).
     * overflow-hidden impede que qualquer filho vaze e crie scroll na página.
     * O scroll fica DENTRO de cada coluna, não na página inteira.
     */
    <div className="flex h-full overflow-hidden">

      {/* ── Lista de usuários ─────────────────────────────────────────────── */}
      <div className="w-96 shrink-0 border-r flex flex-col min-h-0">

        <div className="p-4 border-b flex items-center justify-between shrink-0">
          <h1 className="text-xl font-semibold">Usuários</h1>
          {humanCount > 0 && (
            <Badge variant="destructive">{humanCount} Atendimento Humano</Badge>
          )}
        </div>

        {/* Scroll só nesta coluna */}
        <div className="flex-1 overflow-y-auto min-h-0 p-2">
          {loading ? (
            <p className="text-sm text-muted-foreground p-4">Carregando...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">Nenhum usuário</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <Card
                  key={u.phone_number}
                  className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                    selected === u.phone_number ? "ring-2 ring-primary" : ""
                  } ${u.require_human ? "border-destructive/50 bg-destructive/5" : ""}`}
                  onClick={() => setSelected(u.phone_number)}
                >
                  <CardHeader className="p-4 pb-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium truncate">
                        {u.complete_name || u.phone_number}
                      </span>
                      <Badge
                        variant={u.require_human ? "destructive" : "secondary"}
                        className="shrink-0 text-xs"
                      >
                        {u.require_human ? "Humano" : "IA"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {u.phone_number}
                    </p>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {u.last_message && (
                      <p className="text-sm text-muted-foreground truncate">
                        {u.last_message}
                      </p>
                    )}
                    {u.last_activity && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(u.last_activity).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Área do chat — ocupa o restante, sem overflow próprio ────────────
           O ChatPanel internamente controla seu próprio scroll de mensagens.
      ──────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
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
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Selecione um usuário para ver o chat
          </div>
        )}
      </div>
    </div>
  );
}