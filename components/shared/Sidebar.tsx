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

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "AI First";

const menuItems = [
  { title: "Usuários",    href: "/usuarios",   icon: Users,       group: "main" },
  { title: "Doutores",    href: "/doutores",   icon: Stethoscope, group: "main" },
  { title: "Agenda",      href: "/agenda",     icon: Calendar,    group: "main" },
  { title: "Embeddings",  href: "/embeddings", icon: FileText,    group: "data" },
  { title: "Arquivos",    href: "/arquivos",   icon: File,        group: "data" },
  { title: "Métricas",    href: "/metricas",   icon: BarChart3,   group: "analytics" },
  { title: "Custos",      href: "/custos",     icon: DollarSign,  group: "analytics" },
];

const GROUP_LABELS: Record<string, string> = {
  main: "Clínica",
  data: "Conteúdo",
  analytics: "Analytics",
};

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggle } = useTheme();

  // Group items
  const groups = Array.from(new Set(menuItems.map((i) => i.group)));

  return (
    <aside
      className={cn(
        "sidebar-transition flex h-full flex-col shrink-0 overflow-hidden relative",
        collapsed ? "w-14" : "w-[230px]"
      )}
      style={{
        background: `linear-gradient(170deg, hsl(var(--sidebar-bg)) 0%, hsl(var(--sidebar-bg-end)) 100%)`,
        borderRight: "1px solid hsl(var(--sidebar-border))",
      }}
    >
      {/* Subtle top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{
          background: "linear-gradient(90deg, hsl(213, 80%, 55%), hsl(210, 80%, 70%), transparent)",
          opacity: 0.5,
        }}
      />

      {/* ── Header ─────────────────────────────────────── */}
      <div
        className={cn(
          "flex h-[58px] items-center shrink-0 border-b",
          collapsed ? "justify-center px-0" : "justify-between px-4"
        )}
        style={{ borderColor: "hsl(var(--sidebar-border))" }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Logo mark */}
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, hsl(213, 70%, 55%), hsl(210, 80%, 65%))",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 11L7 3L12 11H2Z" fill="white" fillOpacity="0.95" />
              </svg>
            </div>
            <div className="min-w-0">
              <span
                className="text-sm font-700 tracking-tight leading-none truncate block"
                style={{ color: "hsl(var(--sidebar-text))", fontWeight: 700 }}
              >
                {APP_NAME}
              </span>
              <span
                className="text-[10px] leading-none block mt-0.5"
                style={{ color: "hsl(var(--sidebar-text-muted))" }}
              >
                Painel Admin
              </span>
            </div>
          </div>
        )}

        {collapsed && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(213, 70%, 55%), hsl(210, 80%, 65%))",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M2 11L7 3L12 11H2Z" fill="white" fillOpacity="0.95" />
            </svg>
          </div>
        )}

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            aria-label="Recolher menu"
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-white/10 shrink-0"
            style={{ color: "hsl(var(--sidebar-text-muted))" }}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* ── Nav ────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-5">
        {groups.map((group, gi) => {
          const items = menuItems.filter((i) => i.group === group);
          return (
            <div key={group}>
              {!collapsed && (
                <div
                  className="px-2 mb-1.5"
                >
                  <span
                    className="text-[9.5px] font-700 tracking-widest uppercase"
                    style={{ color: "hsl(var(--sidebar-text-muted))", fontWeight: 600, letterSpacing: "0.1em" }}
                  >
                    {GROUP_LABELS[group]}
                  </span>
                </div>
              )}

              {collapsed && gi > 0 && (
                <div
                  className="mx-2 mb-3"
                  style={{ height: 1, background: "hsl(var(--sidebar-border))" }}
                />
              )}

              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.title : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150 relative group",
                        collapsed && "justify-center px-0 w-10 mx-auto"
                      )}
                      style={
                        isActive
                          ? {
                              backgroundColor: "hsl(var(--sidebar-active))",
                              color: "hsl(var(--sidebar-text))",
                              boxShadow: "inset 3px 0 0 hsl(213, 70%, 60%)",
                            }
                          : {
                              color: "hsl(var(--sidebar-text-muted))",
                            }
                      }
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "hsl(var(--sidebar-hover))";
                          (e.currentTarget as HTMLElement).style.color = "hsl(var(--sidebar-text))";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = "";
                          (e.currentTarget as HTMLElement).style.color = "hsl(var(--sidebar-text-muted))";
                        }
                      }}
                    >
                      <Icon
                        className={cn("shrink-0 transition-transform duration-150", collapsed ? "h-4 w-4" : "h-4 w-4")}
                        strokeWidth={isActive ? 2.2 : 1.8}
                      />
                      {!collapsed && (
                        <span className="truncate text-[13px]">{item.title}</span>
                      )}
                      {/* Active dot for collapsed */}
                      {collapsed && isActive && (
                        <span
                          className="absolute -right-px top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                          style={{ background: "hsl(213, 70%, 62%)" }}
                        />
                      )}
                      {/* Tooltip for collapsed */}
                      {collapsed && (
                        <span
                          className="absolute left-full ml-3 px-2.5 py-1.5 rounded-md text-xs font-medium pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50"
                          style={{
                            background: "hsl(218, 22%, 18%)",
                            color: "hsl(var(--sidebar-text))",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                          }}
                        >
                          {item.title}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── Footer ─────────────────────────────────────── */}
      <div
        className={cn(
          "shrink-0 border-t py-3",
          collapsed ? "flex flex-col items-center gap-2 px-0" : "flex items-center justify-between px-3"
        )}
        style={{ borderColor: "hsl(var(--sidebar-border))" }}
      >
        {!collapsed && (
          <span
            className="text-[11px] truncate"
            style={{ color: "hsl(var(--sidebar-text-muted))" }}
          >
            {theme === "dark" ? "Tema escuro" : "Tema claro"}
          </span>
        )}

        <div className={cn("flex items-center gap-1", collapsed && "flex-col")}>
          <button
            onClick={toggle}
            aria-label="Alternar tema"
            title={theme === "dark" ? "Tema claro" : "Tema escuro"}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-white/10 shrink-0"
            style={{ color: "hsl(var(--sidebar-text-muted))" }}
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>

          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              aria-label="Expandir menu"
              className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-white/10 shrink-0"
              style={{ color: "hsl(var(--sidebar-text-muted))" }}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}