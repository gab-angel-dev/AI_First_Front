"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users,
  Stethoscope,
  FileText,
  File,
  Calendar,
  BarChart3,
  DollarSign,
} from "lucide-react";

const menuItems = [
  {
    title: "Usuários",
    href: "/usuarios",
    icon: Users,
  },
  {
    title: "Doutores",
    href: "/doutores",
    icon: Stethoscope,
  },
  {
    title: "Embeddings",
    href: "/embeddings",
    icon: FileText,
  },
  {
    title: "Arquivos",
    href: "/arquivos",
    icon: File,
  },
  {
    title: "Agenda",
    href: "/agenda",
    icon: Calendar,
  },
  {
    title: "Métricas",
    href: "/metricas",
    icon: BarChart3,
  },
  {
    title: "Custos",
    href: "/custos",
    icon: DollarSign,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">AI First Painel</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
