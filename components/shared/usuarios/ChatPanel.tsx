"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  const [requireHuman, setRequireHuman] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchChat = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(phoneNumber)}/chat`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {
      setMessages([]);
    }
  }, [phoneNumber]);

  const fetchUserStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const users = await res.json();
        const u = users.find((x: { phone_number: string }) => x.phone_number === phoneNumber);
        if (u) {
          setRequireHuman(u.require_human);
          onUserUpdate?.(u);
        }
      }
    } catch {
      // ignore
    }
  }, [phoneNumber, onUserUpdate]);

  useEffect(() => {
    fetchChat();
    fetchUserStatus();
    const id = setInterval(() => {
      fetchChat();
      fetchUserStatus();
    }, 5000);
    return () => clearInterval(id);
  }, [fetchChat, fetchUserStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleToggle() {
    try {
      setError(null);
      const res = await fetch(`/api/admin/users/${encodeURIComponent(phoneNumber)}/toggle`, {
        method: "PUT",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Erro ao alternar");
      }
      const data = await res.json();
      setRequireHuman(data.require_human);
      onUserUpdate?.({ phone_number: phoneNumber, require_human: data.require_human });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    }
  }

  async function handleSend() {
    const text = replyText.trim();
    if (!text || !requireHuman || sending) return;
    try {
      setSending(true);
      setError(null);
      const res = await fetch(`/api/admin/users/${encodeURIComponent(phoneNumber)}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao enviar");
      setReplyText("");
      await fetchChat();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar");
    } finally {
      setSending(false);
    }
  }

  function getMessageContent(m: Chat): string {
    const msg = m.message;
    if (!msg || typeof msg !== "object") return "";
    const o = msg as Record<string, unknown>;
    if (typeof o.content === "string") return o.content;
    if (typeof o.text === "string") return o.text;
    if (Array.isArray(o.parts)) {
      const text = o.parts.find((p: unknown) => p && typeof p === "object" && "text" in (p as object));
      return text && typeof (text as Record<string, unknown>).text === "string"
        ? ((text as Record<string, unknown>).text as string)
        : "[mensagem]";
    }
    if (o.tool_calls) return "[ação executada]";
    return typeof o === "string" ? o : "[mensagem]";
  }

  const displayName = messages[0]?.session_id || phoneNumber;

  return (
    <div className="flex flex-col h-full">
      <CardHeader className="border-b p-4 flex flex-row items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{displayName}</h2>
          <p className="text-sm text-muted-foreground">{phoneNumber}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Atendimento Humano</span>
          <Switch checked={requireHuman} onCheckedChange={handleToggle} />
        </div>
      </CardHeader>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma mensagem ainda
          </p>
        )}
        {messages.map((m) => {
          const isUser = m.sender === "user" || String(m.sender).toLowerCase() === "user";
          const content = getMessageContent(m);
          return (
            <div
              key={m.id}
              className={`flex ${isUser ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  isUser
                    ? "bg-muted"
                    : "bg-primary text-primary-foreground"
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

      <CardContent className="border-t p-4">
        {error && (
          <p className="text-sm text-destructive mb-2">{error}</p>
        )}
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
            title={
              !requireHuman
                ? "IA está no controle. Ative Atendimento Humano para responder."
                : undefined
            }
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
      </CardContent>
    </div>
  );
}
