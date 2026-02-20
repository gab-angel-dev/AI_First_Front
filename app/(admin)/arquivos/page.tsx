"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Upload,
  FileText,
  Image,
  Video,
  Music,
  ExternalLink,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FileItem {
  id: number;
  category: string;
  fileName: string;
  mediaType: string;
  path: string;
  created_at: string;
}

interface CategoryItem {
  category: string;
  total: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACCEPTED_EXTENSIONS = ".pdf,.docx,.jpg,.jpeg,.png,.mp4,.mp3";

const MEDIA_TYPE_LABELS: Record<string, string> = {
  document: "Documento",
  image: "Imagem",
  video: "Vídeo",
  audio: "Áudio",
};

const MEDIA_TYPE_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  document: "default",
  image: "secondary",
  video: "destructive",
  audio: "outline",
};

function MediaIcon({ type }: { type: string }) {
  const cls = "h-4 w-4 shrink-0";
  switch (type) {
    case "image":
      return <Image className={cls} />;
    case "video":
      return <Video className={cls} />;
    case "audio":
      return <Music className={cls} />;
    default:
      return <FileText className={cls} />;
  }
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  open,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-50 bg-background rounded-lg border p-6 shadow-lg max-w-sm w-full mx-4">
        <p className="text-sm mb-6">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Upload Form ──────────────────────────────────────────────────────────────

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
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div>
        <label className="text-sm font-medium mb-1 block">Categoria *</label>
        <Input
          value={categoria}
          onChange={(e) =>
            setCategoria(e.target.value.toLowerCase().replace(/\s+/g, "_"))
          }
          placeholder="cardapio, localizacao, convenios..."
          required
        />
        <p className="text-xs text-muted-foreground mt-1">
          Lowercase sem espaços — usado como diretório na VPS
        </p>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Arquivo *</label>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-input file:text-sm file:font-medium file:bg-background hover:file:bg-accent cursor-pointer"
          title="Selecionar arquivo"
          aria-label="Selecionar arquivo"
        />
        {file && (
          <p className="text-xs text-muted-foreground mt-1">
            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Aceito: pdf, docx, jpg, jpeg, png, mp4, mp3 — máx. 16MB
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={loading}>
        <Upload className="h-4 w-4 mr-2" />
        {loading ? "Enviando..." : "Enviar Arquivo"}
      </Button>
    </form>
  );
}

// ─── File List ────────────────────────────────────────────────────────────────

function FileList({
  files,
  onDelete,
}: {
  files: FileItem[];
  onDelete: (id: number, fileName: string) => void;
}) {
  if (files.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        Nenhum arquivo cadastrado
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((f) => (
        <div
          key={f.id}
          className="flex items-center gap-3 rounded-lg border p-4"
        >
          <MediaIcon type={f.mediaType} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-medium truncate">{f.fileName}</span>
              <Badge variant={MEDIA_TYPE_VARIANTS[f.mediaType] ?? "outline"} className="text-xs shrink-0">
                {MEDIA_TYPE_LABELS[f.mediaType] ?? f.mediaType}
              </Badge>
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground shrink-0">
                {f.category}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(f.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={f.path}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir arquivo"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(f.id, f.fileName)}
              title="Deletar arquivo"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ArquivosPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [filterCat, setFilterCat] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    message: string;
    action: () => void;
  }>({ open: false, message: "", action: () => {} });
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
    } catch {
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [filterCat]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  async function handleDelete(id: number, fileName: string) {
    setConfirm({
      open: true,
      message: `Deletar "${fileName}"? O arquivo será removido do servidor e do banco de dados. Esta ação é irreversível.`,
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
    { id: "lista" as const, label: "Arquivos" },
    { id: "upload" as const, label: "Upload" },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Arquivos</h1>

      <ConfirmModal
        open={confirm.open}
        message={confirm.message}
        onConfirm={() => {
          confirm.action();
          setConfirm((c) => ({ ...c, open: false }));
        }}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))}
      />

      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {tab === "upload" ? (
            <UploadForm
              onSuccess={() => {
                fetchFiles();
                fetchCategories();
                setTab("lista");
              }}
            />
          ) : (
            <div className="space-y-4">
              {/* Filtro */}
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={filterCat}
                  onChange={(e) => setFilterCat(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  aria-label="Filtrar por categoria"
                  title="Filtrar por categoria"
                >
                  <option value="">Todas as categorias</option>
                  {categories.map((c) => (
                    <option key={c.category} value={c.category}>
                      {c.category} ({c.total})
                    </option>
                  ))}
                </select>
                <span className="text-sm text-muted-foreground ml-auto">
                  {files.length} arquivo{files.length !== 1 ? "s" : ""}
                </span>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              {loading ? (
                <p className="text-sm text-muted-foreground py-4">Carregando...</p>
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
