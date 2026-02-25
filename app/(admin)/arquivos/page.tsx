"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Trash2, Upload, FileText, Image, Video, Music,
  ExternalLink, FolderOpen, Filter, X,
} from "lucide-react";

interface FileItem {
  id: number;
  category: string;
  filename: string;
  mediatype: string;
  path: string;
  created_at: string;
}

interface CategoryItem {
  category: string;
  total: number;
}

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.jpg,.jpeg,.png,.mp4,.mp3";

const MEDIA_TYPE_CONFIG: Record<string, {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  color: string;
}> = {
  document: { label: "Documento", variant: "default",     color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
  image:    { label: "Imagem",    variant: "secondary",   color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
  video:    { label: "Vídeo",     variant: "destructive", color: "text-rose-600 bg-rose-50 dark:bg-rose-900/20" },
  audio:    { label: "Áudio",     variant: "outline",     color: "text-violet-600 bg-violet-50 dark:bg-violet-900/20" },
};

function MediaIcon({ type, className = "h-5 w-5" }: { type: string; className?: string }) {
  const cfg = MEDIA_TYPE_CONFIG[type];
  const iconClass = `${className} shrink-0`;
  switch (type) {
    case "image": return <Image className={iconClass} />;
    case "video": return <Video className={iconClass} />;
    case "audio": return <Music className={iconClass} />;
    default:      return <FileText className={iconClass} />;
  }
}

function ConfirmModal({ open, message, onConfirm, onCancel }: {
  open: boolean; message: string; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 modal-backdrop" onClick={onCancel} />
      <div className="relative z-50 bg-card rounded-2xl border p-6 shadow-elevation-xl max-w-sm w-full mx-4 animate-scale-in">
        <p className="text-sm leading-relaxed mb-6">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>Excluir</Button>
        </div>
      </div>
    </div>
  );
}

function UploadForm({ onSuccess }: { onSuccess: () => void }) {
  const [categoria, setCategoria] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !categoria) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("categoria", categoria);
      const res = await fetch("/api/admin/files", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao fazer upload");
      setCategoria("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div>
        <label className="text-xs font-medium text-foreground mb-1.5 block">Categoria *</label>
        <Input
          value={categoria}
          onChange={(e) => setCategoria(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
          placeholder="cardapio, localizacao, convenios..."
          required
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          Lowercase sem espaços — usado como diretório na VPS
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-foreground mb-1.5 block">Arquivo *</label>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          className={[
            "flex items-center gap-3 w-full rounded-xl border-2 border-dashed px-4 py-5 text-sm cursor-pointer transition-all duration-150",
            file
              ? "border-primary/40 bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-accent/50",
          ].join(" ")}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${file ? "bg-primary/10" : "bg-muted"}`}>
            <Upload className={`h-4 w-4 ${file ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div className="flex-1 min-w-0">
            {file ? (
              <>
                <p className="font-medium text-foreground truncate text-xs">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </>
            ) : (
              <>
                <p className="font-medium text-foreground text-xs">Clique para selecionar</p>
                <p className="text-xs text-muted-foreground">PDF, DOCX, JPG, PNG, MP4, MP3 — máx. 16MB</p>
              </>
            )}
          </div>
          {file && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
              aria-label="Remover arquivo"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          required={!file}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="sr-only"
          aria-label="Selecionar arquivo"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading || !file || !categoria}>
        <Upload className="h-3.5 w-3.5 mr-1.5" />
        {loading ? "Enviando..." : "Enviar arquivo"}
      </Button>
    </form>
  );
}

function FileList({ files, onDelete }: {
  files: FileItem[];
  onDelete: (id: number, filename: string) => void;
}) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FolderOpen className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
        <p className="text-sm font-medium text-foreground mb-1">Nenhum arquivo</p>
        <p className="text-xs text-muted-foreground">Faça upload do primeiro arquivo</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((f) => {
        const cfg = MEDIA_TYPE_CONFIG[f.mediatype] ?? { label: f.mediatype, variant: "outline" as const, color: "" };
        return (
          <div
            key={f.id}
            className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-all hover:shadow-elevation-sm hover:border-border/80 group"
          >
            {/* Icon */}
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${cfg.color}`}>
              <MediaIcon type={f.mediatype} className="h-4 w-4" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="text-sm font-medium truncate text-foreground">{f.filename}</span>
                <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                <span className="tag-pill">{f.category}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {new Date(f.created_at).toLocaleDateString("pt-BR", {
                  day: "2-digit", month: "short", year: "numeric",
                })}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <a href={f.path} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="icon-sm" title="Abrir arquivo">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </a>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => onDelete(f.id, f.filename)}
                title="Deletar arquivo"
                className="hover:border-destructive/40 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ArquivosPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [filterCat, setFilterCat] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{ open: boolean; message: string; action: () => void }>
    ({ open: false, message: "", action: () => {} });
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"upload" | "lista">("lista");

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/files/categories");
      if (res.ok) setCategories(await res.json());
    } catch {}
  }, []);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCat) params.set("categoria", filterCat);
      const res = await fetch(`/api/admin/files?${params}`);
      if (res.ok) setFiles(await res.json());
    } catch { setFiles([]); }
    finally { setLoading(false); }
  }, [filterCat]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  async function handleDelete(id: number, filename: string) {
    setConfirm({
      open: true,
      message: `Deletar "${filename}"? O arquivo será removido permanentemente do servidor.`,
      action: async () => {
        try {
          setError(null);
          const res = await fetch(`/api/admin/files/item/${id}`, { method: "DELETE" });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          await fetchFiles();
          await fetchCategories();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Erro ao deletar");
        }
      },
    });
  }

  const tabs = [
    { id: "lista" as const, label: "Arquivos", count: files.length },
    { id: "upload" as const, label: "Upload" },
  ];

  return (
    <div className="h-full overflow-y-auto p-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Arquivos</h1>
          <p className="page-subtitle">Gerenciamento de arquivos de mídia</p>
        </div>
      </div>

      <ConfirmModal
        open={confirm.open}
        message={confirm.message}
        onConfirm={() => { confirm.action(); setConfirm((c) => ({ ...c, open: false })); }}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
      />

      {/* Tabs */}
      <div className="flex border-b border-border mb-5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                tab === t.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          {tab === "upload" ? (
            <UploadForm onSuccess={() => { fetchFiles(); fetchCategories(); setTab("lista"); }} />
          ) : (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    value={filterCat}
                    onChange={(e) => setFilterCat(e.target.value)}
                    className="h-8 rounded-lg border border-input bg-background text-foreground px-3 text-xs"
                    aria-label="Filtrar por categoria"
                  >
                    <option value="">Todas as categorias</option>
                    {categories.map((c) => (
                      <option key={c.category} value={c.category}>
                        {c.category} ({c.total})
                      </option>
                    ))}
                  </select>
                </div>
                {filterCat && (
                  <button
                    onClick={() => setFilterCat("")}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Limpar filtro
                  </button>
                )}
                <span className="text-xs text-muted-foreground ml-auto">
                  {files.length} arquivo{files.length !== 1 ? "s" : ""}
                </span>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Category chips */}
              {categories.length > 0 && !filterCat && (
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => (
                    <button
                      key={c.category}
                      onClick={() => setFilterCat(c.category)}
                      className="tag-pill hover:bg-accent hover:border-primary/30 transition-colors cursor-pointer"
                    >
                      {c.category}
                      <span className="ml-1 text-muted-foreground">{c.total}</span>
                    </button>
                  ))}
                </div>
              )}

              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border p-3 animate-pulse">
                      <div className="w-9 h-9 bg-muted rounded-lg" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 bg-muted rounded w-40" />
                        <div className="h-3 bg-muted rounded w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <FileList files={files} onDelete={handleDelete} />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}