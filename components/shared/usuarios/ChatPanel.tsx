"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Headphones, RefreshCw, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import type { Chat } from "@/lib/types";

interface ChatPanelProps {
  phoneNumber: string;
  onUserUpdate?: (data: { phone_number: string; require_human: boolean }) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  if (o.tool_calls) return "[ação executada pelo agente]";
  return "[mensagem]";
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateGroup(date: Date): string {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Hoje";
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

type SenderType = "user" | "ai" | "human";

function getSenderConfig(sender: string, agentName?: string | null): {
  label: string;
  type: SenderType;
  isRight: boolean;
  bubbleClass: string;
  metaClass: string;
} {
  const s = String(sender).toLowerCase() as SenderType;
  if (s === "user") {
    return {
      label: "Usuário",
      type: "user",
      isRight: false,
      bubbleClass: "bg-muted text-foreground border border-border/50",
      metaClass: "text-muted-foreground",
    };
  }
  if (s === "human") {
    return {
      label: agentName ?? "Atendente",
      type: "human",
      isRight: true,
      bubbleClass: "bg-[hsl(152,60%,20%)] text-white",
      metaClass: "text-white/70",
    };
  }
  return {
    label: agentName ?? "IA",
    type: "ai",
    isRight: true,
    bubbleClass: "bg-primary text-primary-foreground",
    metaClass: "text-primary-foreground/70",
  };
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Chat }) {
  const content = getMessageContent(message);
  if (!content) return null;

  const cfg = getSenderConfig(message.sender, message.agent_name);

  return (
    <div className={`flex ${cfg.isRight ? "justify-end" : "justify-start"} group`}>
      <div className={`flex flex-col max-w-[75%] ${cfg.isRight ? "items-end" : "items-start"}`}>
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap shadow-sm ${cfg.bubbleClass} ${
            cfg.isRight ? "rounded-tr-sm" : "rounded-tl-sm"
          }`}
        >
          {content}
        </div>
        <div className={`flex items-center gap-1.5 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${cfg.isRight ? "flex-row-reverse" : ""}`}>
          <span className={`text-[10px] ${cfg.isRight ? "text-muted-foreground" : "text-muted-foreground"}`}>
            {formatTime(message.created_at)}
          </span>
          {message.agent_name && (
            <>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground">{message.agent_name}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Date Separator ───────────────────────────────────────────────────────────

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border/50">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ─── Sender Avatar ────────────────────────────────────────────────────────────

function SenderIcon({ type }: { type: SenderType }) {
  if (type === "user") return (
    <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
      <User className="h-3 w-3 text-muted-foreground" />
    </div>
  );
  if (type === "human") return (
    <div className="w-6 h-6 rounded-full bg-[hsl(152,60%,20%)] flex items-center justify-center shrink-0">
      <Headphones className="h-3 w-3 text-white" />
    </div>
  );
  return (
    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
      <Bot className="h-3 w-3 text-primary-foreground" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ChatPanel({ phoneNumber, onUserUpdate }: ChatPanelProps) {
  const [messages, setMessages] = useState<Chat[]>([]);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [requireHuman, setRequireHuman] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { success, error: toastError } = useToast();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function scrollToBottom(instant = false) {
    messagesEndRef.current?.scrollIntoView({
      behavior: instant ? "instant" : "smooth",
    });
  }

  const fetchUserStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(phoneNumber)}`);
      if (!res.ok) return;
      const data = await res.json();
      setDisplayName(data.complete_name ?? null);
      setRequireHuman(data.require_human);
      onUserUpdate?.({ phone_number: data.phone_number, require_human: data.require_human });
    } catch {}
  }, [phoneNumber, onUserUpdate]);

  const fetchChat = useCallback(async (scrollAfter = false) => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(phoneNumber)}/chat`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        if (scrollAfter) requestAnimationFrame(() => scrollToBottom(true));
      }
    } catch {
      setMessages([]);
    }
  }, [phoneNumber]);

  useEffect(() => {
    setMessages([]);
    setDisplayName(null);
    setError(null);
    setLoadingChat(true);

    async function init() {
      await fetchUserStatus();
      await fetchChat(true);
      setLoadingChat(false);
    }

    init();

    const statusId = setInterval(fetchUserStatus, 8_000);
    const chatId = setInterval(() => fetchChat(false), 10_000);

    return () => {
      clearInterval(statusId);
      clearInterval(chatId);
    };
  }, [phoneNumber]);

  async function handleToggle() {
    const next = !requireHuman;
    setRequireHuman(next);
    onUserUpdate?.({ phone_number: phoneNumber, require_human: next });

    try {
      const res = await fetch(
        `/api/admin/users/${encodeURIComponent(phoneNumber)}/toggle`,
        { method: "PUT" }
      );
      if (!res.ok) {
        const d = await res.json();
        setRequireHuman(!next);
        onUserUpdate?.({ phone_number: phoneNumber, require_human: !next });
        toastError("Erro ao alternar", d.error || "Tente novamente");
      } else {
        success(
          next ? "Atendimento humano ativado" : "IA reativada",
          next ? "Você pode responder agora" : "O agente voltará a responder"
        );
      }
    } catch {
      setRequireHuman(!next);
      onUserUpdate?.({ phone_number: phoneNumber, require_human: !next });
      toastError("Erro de conexão", "Verifique sua rede e tente novamente");
    }
  }

  async function handleSend() {
    const text = replyText.trim();
    if (!text || !requireHuman || sending) return;

    setSending(true);
    setError(null);

    try {
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
      await fetchChat(false);
      requestAnimationFrame(() => scrollToBottom(false));
      textareaRef.current?.focus();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao enviar";
      setError(msg);
      toastError("Falha ao enviar", msg);
    } finally {
      setSending(false);
    }
  }

  // Group messages by date
  const groupedMessages = (() => {
    const groups: { date: string; messages: Chat[] }[] = [];
    for (const msg of messages) {
      const label = formatDateGroup(new Date(msg.created_at));
      const last = groups[groups.length - 1];
      if (last && last.date === label) {
        last.messages.push(msg);
      } else {
        groups.push({ date: label, messages: [msg] });
      }
    }
    return groups;
  })();

  const msgCount = messages.length;

  return (
    <div className="flex flex-col h-full bg-background">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b bg-card px-5 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-primary">
              {(displayName ?? phoneNumber).slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground leading-tight truncate">
              {displayName ?? phoneNumber}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              {displayName && (
                <span className="text-xs text-muted-foreground truncate">{phoneNumber}</span>
              )}
              <span className="text-[10px] text-muted-foreground">
                {msgCount} mensage{msgCount !== 1 ? "ns" : "m"}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => fetchChat(false)}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Atualizar mensagens"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-center gap-2 pl-3 border-l border-border">
            <div className="text-right">
              <p className="text-xs font-medium text-foreground leading-none">
                {requireHuman ? "Atendimento humano" : "IA ativa"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {requireHuman ? "Responda manualmente" : "Agente respondendo"}
              </p>
            </div>
            <Switch checked={requireHuman} onCheckedChange={handleToggle} />
          </div>
        </div>
      </div>

      {/* ── Status banner ─────────────────────────────────────────────────── */}
      {requireHuman && (
        <div className="bg-[hsl(152,60%,20%)/0.08] border-b border-[hsl(152,60%,20%)/0.2] px-5 py-2 flex items-center gap-2 shrink-0">
          <Headphones className="h-3.5 w-3.5 text-[hsl(152,70%,35%)]" />
          <span className="text-xs text-[hsl(152,70%,35%)] font-medium">
            Atendimento humano ativo — o agente de IA está pausado
          </span>
        </div>
      )}

      {/* ── Messages ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
        {loadingChat ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-xs">Carregando conversa...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <Bot className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Nenhuma mensagem</p>
            <p className="text-xs text-muted-foreground">
              Este usuário ainda não iniciou uma conversa
            </p>
          </div>
        ) : (
          <>
            {groupedMessages.map((group) => (
              <div key={group.date}>
                <DateSeparator label={group.date} />
                <div className="space-y-2">
                  {group.messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} />
                  ))}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} className="h-2" />
          </>
        )}
      </div>

      {/* ── Input ──────────────────────────────────────────────────────────── */}
      <div className="border-t bg-card px-4 py-3 shrink-0">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2 mb-3 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder={
                requireHuman
                  ? "Digite sua mensagem... (Enter para enviar)"
                  : "Ative o atendimento humano para responder"
              }
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              disabled={!requireHuman}
              className="min-h-[52px] max-h-[120px] resize-none pr-3 text-sm disabled:bg-muted/40"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!requireHuman || !replyText.trim() || sending}
            size="icon"
            className="h-[52px] w-11 shrink-0 rounded-xl"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
          Enter para enviar · Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
}