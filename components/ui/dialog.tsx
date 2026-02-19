"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

const DialogContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
} | null>(null);

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogContent({ children, className, title }: DialogContentProps) {
  const ctx = React.useContext(DialogContext);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ctx?.open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") ctx.onOpenChange(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [ctx?.open, ctx?.onOpenChange]);

  React.useEffect(() => {
    if (ctx?.open && contentRef.current) {
      contentRef.current.focus();
    }
  }, [ctx?.open]);

  if (!ctx?.open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => ctx.onOpenChange(false)}
      />
      <div
        ref={contentRef}
        tabIndex={-1}
        className={cn(
          "relative z-50 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-background p-6 shadow-lg",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 className="text-lg font-semibold mb-4">{title}</h2>
        )}
        {children}
      </div>
    </div>
  );
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-end gap-2 mt-6 pt-4 border-t", className)}>
      {children}
    </div>
  );
}
