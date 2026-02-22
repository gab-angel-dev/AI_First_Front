"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Send } from "lucide-react";
import type { Chat } from "@/lib/types";

interface ChatPanelProps {
  phoneNumber: string;
  onUserUpdate?: (data: { phone_number: string; require_human: boolean }) => void;
}

export function ChatPanel({ phoneNumber, onUserUpdate }: ChatPanelProps) {
  const [messages, setMessages] = useState<Chat[]>([]);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [requireHuman, setRequireHuman] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Controla EXPLICITAMENTE quando deve rolar — nunca rola sozinho pelo polling
  const shouldScrollRef = useRef(false);

  function scrollToBottom() {
    shouldScrollRef.current = true;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  // ── Status do usuário ─────────────────────────────────────────────────────
  const fetchUserStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(phoneNumber)}`);
      if (!res.ok) return;
      const data = await res.json();
      setDisplayName(data.complete_name ?? null);
      setRequireHuman(data.require_human);
      onUserUpdate?.({ phone_number: data.phone_number, require_human: data.require_human });
    } catch { /* silencia */ }
  }, [phoneNumber, onUserUpdate]);

  // ── Histórico do chat — NÃO dispara scroll ────────────────────────────────
  const fetchChat = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(phoneNumber)}/chat`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        // NÃO chama scrollToBottom aqui — polling nunca rola
      }
    } catch {
      setMessages([]);
    }
  }, [phoneNumber]);

  // ── Fetch inicial + polling ───────────────────────────────────────────────
  useEffect(() => {
    setMessages([]);
    setDisplayName(null);
    setError(null);

    // Abertura do chat: busca e rola para o fundo UMA vez
    async function init() {
      await fetchUserStatus();
      try {
        const res = await fetch(`/api/admin/users/${encodeURIComponent(phoneNumber)}/chat`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
          // Único scroll automático: ao abrir o chat
          requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
          });
        }
      } catch {
        setMessages([]);
      }
    }

    init();

    const statusId = setInterval(fetchUserStatus, 8_000);
    // Polling atualiza mensagens silenciosamente, sem mover o scroll
    const chatId = setInterval(fetchChat, 10_000);

    return () => {
      clearInterval(statusId);
      clearInterval(chatId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneNumber]);

  // ── Toggle otimista ───────────────────────────────────────────────────────
  async function handleToggle() {
    const next = !requireHuman;
    setRequireHuman(next);
    onUserUpdate?.({ phone_number: phoneNumber, require_human: next });
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(phoneNumber)}/toggle`,
        { method: "PUT" }
      );
      if (!res.ok) {
        const d = await res.json();
        setRequireHuman(!next);
        onUserUpdate?.({ phone_number: phoneNumber, require_human: !next });
        setError(d.error || "Erro ao alternar");
      }
    } catch {
      setRequireHuman(!next);
      onUserUpdate?.({ phone_number: phoneNumber, require_human: !next });
      setError("Erro de conexão");
    }
  }

  // ── Envio de mensagem ─────────────────────────────────────────────────────
  async function handleSend() {
    const text = replyText.trim();
    if (!text || !requireHuman || sending) return;
    try {
      setSending(true);
      setError(null);
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(phoneNumber)}/reply`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar");
      setReplyText("");

      // Após enviar: atualiza mensagens e rola para o fundo
      const chatRes = await fetch(`/api/admin/users/${encodeURIComponent(phoneNumber)}/chat`);
      if (chatRes.ok) {
        setMessages(await chatRes.json());
        requestAnimationFrame(() => scrollToBottom());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar");
    } finally {
      setSending(false);
    }
  }

  // ── Extrai texto da mensagem ──────────────────────────────────────────────
  function getMessageContent(m: Chat): string {
    const msg = m.message;
    if (!msg || typeof msg !== "object") return "";
    const o = msg as Record<string, unknown>;
    if (typeof o.content === "string") return o.content;
    if (typeof o.text === "string") return o.text;
    if (Array.isArray(o.parts)) {
      const part = o.parts.find(
        (p: unknown) => p && typeof p === "object" && "text" in (p as object)
      );
      return part ? String((part as Record<string, unknown>).text ?? "") : "[mensagem]";
    }
    if (o.tool_calls) return "[ação executada]";
    return "[mensagem]";
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <CardHeader className="border-b p-4 flex flex-row items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-semibold leading-tight">
            {displayName ?? phoneNumber}
          </h2>
          {displayName && (
            <p className="text-sm text-muted-foreground">{phoneNumber}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm select-none">Atendimento Humano</span>
          <Switch checked={requireHuman} onCheckedChange={handleToggle} />
        </div>
      </CardHeader>

      {/* ── Mensagens ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma mensagem ainda
          </p>
        )}
        {messages.map((m) => {
          const isUser =
            m.sender === "user" || String(m.sender).toLowerCase() === "user";
          const content = getMessageContent(m);
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  isUser ? "bg-muted" : "bg-primary text-primary-foreground"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{content}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs opacity-75">
                    {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {!isUser && m.agent_name && (
                    <span className="text-xs opacity-75">• {m.agent_name}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ──────────────────────────────────────────────────────────── */}
      <CardContent className="border-t p-4 shrink-0">
        {error && <p className="text-sm text-destructive mb-2">{error}</p>}
        <div className="flex gap-2">
          <Textarea
            placeholder={
              requireHuman
                ? "Digite sua mensagem..."
                : "IA está no controle. Ative Atendimento Humano para responder."
            }
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={!requireHuman}
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={!requireHuman || !replyText.trim() || sending}
            size="icon"
            className="shrink-0 h-[60px] w-12"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </CardContent>
    </div>
  );
}