"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (opts: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<ToastVariant, {
  icon: React.ElementType;
  bar: string;
  iconClass: string;
  bg: string;
}> = {
  success: {
    icon: CheckCircle2,
    bar: "bg-[hsl(152,84%,28%)]",
    iconClass: "text-[hsl(152,84%,28%)]",
    bg: "bg-card",
  },
  error: {
    icon: AlertCircle,
    bar: "bg-destructive",
    iconClass: "text-destructive",
    bg: "bg-card",
  },
  warning: {
    icon: AlertTriangle,
    bar: "bg-[hsl(38,92%,48%)]",
    iconClass: "text-[hsl(38,72%,42%)]",
    bg: "bg-card",
  },
  info: {
    icon: Info,
    bar: "bg-primary",
    iconClass: "text-primary",
    bg: "bg-card",
  },
};

// ─── Toast Item ───────────────────────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const cfg = VARIANT_CONFIG[toast.variant];
  const Icon = cfg.icon;
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    // Enter animation
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => handleDismiss(), duration);
    return () => clearTimeout(t);
  }, [duration]);

  function handleDismiss() {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  }

  return (
    <div
      className={cn(
        "relative flex items-start gap-3 rounded-xl border shadow-elevation-lg overflow-hidden",
        "w-[360px] max-w-[calc(100vw-2rem)] p-4",
        cfg.bg,
        "transition-all duration-300 ease-out",
        visible && !exiting
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-4"
      )}
      role="alert"
    >
      {/* Accent bar */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-xl", cfg.bar)} />

      {/* Icon */}
      <div className="shrink-0 mt-0.5">
        <Icon className={cn("h-4 w-4", cfg.iconClass)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{toast.description}</p>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="shrink-0 h-5 w-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Fechar notificação"
      >
        <X className="h-3 w-3" />
      </button>

      {/* Progress bar */}
      <div
        className={cn("absolute bottom-0 left-0 h-0.5 rounded-full", cfg.bar, "opacity-30")}
        style={{
          animation: `toast-progress ${duration}ms linear forwards`,
        }}
      />
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-4), { ...opts, id }]); // max 5
  }, []);

  const success = useCallback(
    (title: string, description?: string) => toast({ title, description, variant: "success" }),
    [toast]
  );
  const error = useCallback(
    (title: string, description?: string) => toast({ title, description, variant: "error" }),
    [toast]
  );
  const warning = useCallback(
    (title: string, description?: string) => toast({ title, description, variant: "warning" }),
    [toast]
  );
  const info = useCallback(
    (title: string, description?: string) => toast({ title, description, variant: "info" }),
    [toast]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, success, error, warning, info, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Viewport ─────────────────────────────────────────────────────────────────

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end pointer-events-none"
      aria-label="Notificações"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}