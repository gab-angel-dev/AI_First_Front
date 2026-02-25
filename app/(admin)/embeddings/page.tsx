"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText, Plus, Trash2, Search, RefreshCw, ChevronDown, ChevronUp,
  AlertCircle, Brain, ExternalLink, Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Embedding {
  id: string;
  title: string;
  content: string;
  source?: string | null;
  category?: string | null;
  created_at: string;
  updated_at?: string;
  chunk_count?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── Embedding Card ───────────────────────────────────────────────────────────
function EmbeddingCard({
  item,
  onDelete,
}: {
  item: Embedding;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { error: toastError } = useToast();

  const preview = item.content.slice(0, 180);
  const hasMore = item.content.length > 180;

  async function handleDelete() {
    setDeleting(true);
    onDelete(item.id);
  }

  return (
    <Card className="group transition-all duration-150 hover:shadow-elevation-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
                {item.title || "Sem título"}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {item.category && (
                  <Badge variant="outline" size="sm">{item.category}</Badge>
                )}
                {item.chunk_count !== undefined && (
                  <span className="text-[10px] text-muted-foreground">
                    {item.chunk_count} chunk{item.chunk_count !== 1 ? "s" : ""}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {fmtDate(item.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {item.source && (
              <a
                href={item.source}
                target="_blank"
                rel="noopener noreferrer"
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Abrir fonte"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Remover embedding"
            >
              {deleting
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Trash2 className="h-3.5 w-3.5" />
              }
            </button>
          </div>
        </div>

        {/* Content preview */}
        <div className="ml-11">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {expanded ? item.content : preview}
            {!expanded && hasMore && "..."}
          </p>

          {hasMore && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 mt-2 text-[11px] text-primary hover:text-primary/80 transition-colors"
            >
              {expanded ? (
                <><ChevronUp className="h-3 w-3" />Mostrar menos</>
              ) : (
                <><ChevronDown className="h-3 w-3" />Mostrar mais ({item.content.length - 180} chars)</>
              )}
            </button>
          )}

          {item.source && (
            <div className="mt-2">
              <span className="text-[10px] text-muted-foreground truncate block max-w-xs" title={item.source}>
                Fonte: {item.source}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── New Embedding Form ───────────────────────────────────────────────────────
function NewEmbeddingForm({
  onCreated,
  onCancel,
}: {
  onCreated: (item: Embedding) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success, error: toastError } = useToast();

  async function handleSubmit() {
    if (!content.trim()) { setError("O conteúdo é obrigatório"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          content: content.trim(),
          source: source.trim() || undefined,
          category: category.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar");
      success("Embedding criado!", "O conteúdo foi indexado com sucesso");
      onCreated(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setError(msg);
      toastError("Erro ao criar embedding", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-primary/30 shadow-elevation-md">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <Plus className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-sm font-semibold text-foreground">Novo Embedding</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Título <span className="text-muted-foreground/60">(opcional)</span>
            </label>
            <Input placeholder="Ex: Política de cancelamentos" value={title}
              onChange={(e) => setTitle(e.target.value)} className="text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Categoria <span className="text-muted-foreground/60">(opcional)</span>
            </label>
            <Input placeholder="Ex: Políticas, FAQ, Procedimentos..." value={category}
              onChange={(e) => setCategory(e.target.value)} className="text-sm" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Conteúdo <span className="text-destructive">*</span>
          </label>
          <Textarea
            placeholder="Cole o conteúdo que deseja indexar para o assistente de IA..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] text-sm resize-none"
          />
          <p className="text-[10px] text-muted-foreground mt-1">{content.length} caracteres</p>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            Fonte / URL <span className="text-muted-foreground/60">(opcional)</span>
          </label>
          <Input placeholder="https://..." value={source}
            onChange={(e) => setSource(e.target.value)} className="text-sm font-mono text-xs" />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button onClick={handleSubmit} disabled={saving || !content.trim()} size="sm">
            {saving
              ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Indexando...</>
              : <><Brain className="h-3.5 w-3.5 mr-1.5" />Criar embedding</>
            }
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmbeddingsPage() {
  const [embeddings, setEmbeddings] = useState<Embedding[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const { success, error: toastError } = useToast();

  const fetchEmbeddings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/embeddings");
      if (res.ok) setEmbeddings(await res.json());
    } catch {
      setEmbeddings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEmbeddings(); }, [fetchEmbeddings]);

  async function handleDelete(id: string) {
    if (showDeleteConfirm !== id) {
      setShowDeleteConfirm(id);
      setTimeout(() => setShowDeleteConfirm((prev) => prev === id ? null : prev), 3000);
      return;
    }
    setDeleting(id);
    setShowDeleteConfirm(null);
    try {
      const res = await fetch(`/api/admin/embeddings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao remover");
      setEmbeddings((prev) => prev.filter((e) => e.id !== id));
      success("Embedding removido", "O conteúdo foi removido do índice");
    } catch (e) {
      toastError("Erro ao remover", e instanceof Error ? e.message : "Tente novamente");
    } finally {
      setDeleting(null);
    }
  }

  const filtered = search
    ? embeddings.filter((e) =>
        e.title?.toLowerCase().includes(search.toLowerCase()) ||
        e.content.toLowerCase().includes(search.toLowerCase()) ||
        e.category?.toLowerCase().includes(search.toLowerCase())
      )
    : embeddings;

  const categories = Array.from(new Set(embeddings.map((e) => e.category).filter(Boolean)));

  return (
    <div className="h-full overflow-y-auto p-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Embeddings</h1>
          <p className="page-subtitle">
            {embeddings.length} documento{embeddings.length !== 1 ? "s" : ""} indexado{embeddings.length !== 1 ? "s" : ""}
            {categories.length > 0 && ` · ${categories.length} categoria${categories.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchEmbeddings}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Novo embedding
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* New form */}
        {showForm && (
          <NewEmbeddingForm
            onCreated={(item) => {
              setEmbeddings((prev) => [item, ...prev]);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Search + category filter */}
        {embeddings.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar por título ou conteúdo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            {categories.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSearch(search === cat ? "" : cat!)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                      search === cat
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-5 space-y-3 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-muted rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 bg-muted rounded w-40" />
                    <div className="h-3 bg-muted rounded w-24" />
                  </div>
                </div>
                <div className="space-y-2 ml-11">
                  <div className="h-3 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-4/5" />
                  <div className="h-3 bg-muted rounded w-3/5" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Brain className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              {search ? "Nenhum resultado encontrado" : "Nenhum embedding cadastrado"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {search
                ? "Tente buscar com outros termos"
                : "Adicione documentos para que o assistente possa acessar essas informações"
              }
            </p>
            {!search && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Adicionar primeiro embedding
              </Button>
            )}
          </div>
        ) : (
          <>
            {search && (
              <p className="text-xs text-muted-foreground">
                {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} para "{search}"
              </p>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((item) => (
                <div key={item.id} className="relative">
                  {showDeleteConfirm === item.id && (
                    <div className="absolute inset-0 z-10 rounded-xl bg-destructive/95 flex flex-col items-center justify-center gap-3 p-4 text-center">
                      <AlertCircle className="h-6 w-6 text-white" />
                      <p className="text-sm font-medium text-white">Remover este embedding?</p>
                      <p className="text-xs text-white/80">Esta ação não pode ser desfeita</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline"
                          className="border-white/30 text-white hover:bg-white/10"
                          onClick={() => setShowDeleteConfirm(null)}>
                          Cancelar
                        </Button>
                        <Button size="sm"
                          className="bg-white text-destructive hover:bg-white/90"
                          onClick={() => handleDelete(item.id)}>
                          Confirmar
                        </Button>
                      </div>
                    </div>
                  )}
                  <EmbeddingCard
                    item={item}
                    onDelete={handleDelete}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}