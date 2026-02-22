import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("skeleton", className)} />;
}

// ── Presets ───────────────────────────────────────────────────────────────────

/** Cards de métricas (4 cards lado a lado) */
export function SkeletonMetricCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-5 rounded" />
          </div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
      ))}
    </div>
  );
}

/** Tabela genérica com N linhas */
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 px-4 py-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-20 ml-auto" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-20" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center rounded-lg border bg-card px-4 py-3">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Lista de cards (doutores, arquivos, etc.) */
export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Calendário */
export function SkeletonCalendar() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
      {/* Cabeçalho dos dias */}
      <div className="grid grid-cols-7 border-b">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="p-3 flex justify-center">
            <Skeleton className="h-4 w-8" />
          </div>
        ))}
      </div>
      {/* Grade de semanas */}
      {Array.from({ length: 5 }).map((_, row) => (
        <div key={row} className="grid grid-cols-7 border-b last:border-0">
          {Array.from({ length: 7 }).map((_, col) => (
            <div key={col} className="min-h-[80px] p-2 border-r last:border-0 space-y-1">
              <Skeleton className="h-4 w-6 ml-auto" />
              {row === 1 && col % 3 === 0 && (
                <Skeleton className="h-6 w-full rounded" />
              )}
              {row === 2 && col % 2 === 1 && (
                <Skeleton className="h-6 w-full rounded" />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Gráficos (dois lado a lado) */
export function SkeletonCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-6 space-y-4">
          <div className="space-y-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
          {/* Barras simuladas */}
          <div className="flex items-end gap-2 h-48 pt-4">
            {Array.from({ length: 12 }).map((_, j) => (
              <Skeleton
                key={j}
                className="flex-1 rounded-t"
                style={{ height: `${30 + Math.abs(Math.sin(j + i * 3)) * 120}px` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Lista de embeddings */
export function SkeletonEmbeddingList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/** Lista de arquivos */
export function SkeletonFileList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
          <Skeleton className="h-4 w-4 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}