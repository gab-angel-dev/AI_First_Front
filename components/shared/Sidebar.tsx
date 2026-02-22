"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/shared/ThemeProvider";
import {
  Users,
  Stethoscope,
  FileText,
  File,
  Calendar,
  BarChart3,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
} from "lucide-react";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "AI First Painel";

const menuItems = [
  { title: "Usuários",    href: "/usuarios",   icon: Users },
  { title: "Doutores",    href: "/doutores",   icon: Stethoscope },
  { title: "Embeddings",  href: "/embeddings", icon: FileText },
  { title: "Arquivos",    href: "/arquivos",   icon: File },
  { title: "Agenda",      href: "/agenda",     icon: Calendar },
  { title: "Métricas",    href: "/metricas",   icon: BarChart3 },
  { title: "Custos",      href: "/custos",     icon: DollarSign },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggle } = useTheme();

  return (
    <aside
      className={cn(
        "sidebar-transition flex h-full flex-col shrink-0 overflow-hidden border-r",
        collapsed ? "w-14" : "w-[220px]"
      )}
      style={{ backgroundColor: "hsl(var(--sidebar-bg))" }}
    >
      {/* ── Header ─────────────────────────────────────── */}
      <div
        className={cn(
          "flex h-14 items-center shrink-0 border-b border-white/10",
          collapsed ? "justify-center px-0" : "justify-between px-4"
        )}
      >
        {!collapsed && (
          <span
            className="text-base font-semibold tracking-wide leading-tight truncate"
            style={{ color: "hsl(var(--sidebar-text))" }}
          >
            {APP_NAME}
          </span>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-white/10 shrink-0"
          style={{ color: "hsl(var(--sidebar-text-muted))" }}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* ── Nav ────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.title : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors duration-150",
                collapsed && "justify-center",
                !isActive && "hover:bg-white/10"
              )}
              style={
                isActive
                  ? {
                      backgroundColor: "hsl(var(--sidebar-active))",
                      color: "hsl(var(--sidebar-text))",
                    }
                  : { color: "hsl(var(--sidebar-text-muted))" }
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.title}</span>}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer — toggle de tema ─────────────────────── */}
      <div
        className={cn(
          "shrink-0 border-t border-white/10 py-3",
          collapsed ? "flex justify-center px-0" : "flex items-center justify-between px-4"
        )}
      >
        {!collapsed && (
          <span
            className="text-xs truncate"
            style={{ color: "hsl(var(--sidebar-text-muted))" }}
          >
            {theme === "dark" ? "Tema escuro" : "Tema claro"}
          </span>
        )}
        <button
          onClick={toggle}
          aria-label="Alternar tema"
          title={theme === "dark" ? "Mudar para claro" : "Mudar para escuro"}
          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-white/10 shrink-0"
          style={{ color: "hsl(var(--sidebar-text-muted))" }}
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}