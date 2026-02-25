"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, ChevronDown, ChevronUp, Upload, FileText } from "lucide-react";

interface EmbeddingItem {
  id: string;
  content: string;
  category: string;
  created_at: string;
}

interface CategoryItem {
  category: string;
  total: number;
}

interface InsertResult {
  blocos_gerados: number;
  inseridos: number;
  duplicatas: number;
  erros: number;
}

type Tab = "inserir" | "visualizar" | "gerenciar";
type InsertMethod = "texto" | "pdf";

const CATEGORY_COLORS: Record<string, string> = {
  sobre: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  servicos: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  regulamento: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
};

function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
}

async function extractPdfText(file: File, onProgress: (msg: string) => void): Promise<string> {
  const PDFJS_VERSION = "3.11.174";
  const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`;

  if (!(window as unknown as Record<string, unknown>)["pdfjs-dist/build/pdf"]) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${PDFJS_CDN}/pdf.min.js`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Falha ao carregar pdf.js"));
      document.head.appendChild(script);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib = (window as any)["pdfjs-dist/build/pdf"];
  pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let texto = "";
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    onProgress(`Extraindo página ${i} de ${pdfDoc.numPages}...`);
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    texto += content.items.map((item: { str?: string }) => item.str ?? "").join(" ") + "\n";
  }
  return texto.trim();
}

function ConfirmModal({ open, message, onConfirm, onCancel }: {
  open: boolean; message: string; onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative z-50 bg-background rounded-lg border p-6 shadow-lg max-w-sm w-full mx-4">
        <p className="text-sm mb-6">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>Confirmar</Button>
        </div>
      </div>
    </div>
  );
}

function TabInserir({ onSuccess }: { onSuccess: () => void }) {
  const [method, setMethod] = useState<InsertMethod>("texto");
  const [categoria, setCategoria] = useState("");
  const [tamanho, setTamanho] = useState(800);
  const [texto, setTexto] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsertResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfStatus, setPdfStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setPdfStatus(null);

    try {
      let textoFinal = texto;

      if (method === "pdf") {
        if (!pdfFile) throw new Error("Selecione um arquivo PDF");
        setPdfStatus("Carregando pdf.js...");
        textoFinal = await extractPdfText(pdfFile, setPdfStatus);
        if (!textoFinal) throw new Error("Nenhum texto extraído. O PDF pode ser escaneado (imagem).");
        setPdfStatus(`Texto extraído (${textoFinal.length} caracteres). Gerando embeddings...`);
      }

      const res = await fetch("/api/admin/embeddings/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: textoFinal, categoria, tamanho_bloco: tamanho }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao inserir");

      setResult(data);
      setTexto("");
      setPdfFile(null);
      setPdfStatus(null);
      if (fileRef.current) fileRef.current.value = "";
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
      setPdfStatus(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      {/* Método */}
      <div>
        <label className="text-sm font-medium mb-2 block">Método</label>
        <div className="flex gap-2">
          {(["texto", "pdf"] as InsertMethod[]).map((m) => (
            <Button key={m} type="button" variant={method === m ? "default" : "outline"}
              size="sm" onClick={() => setMethod(m)}>
              {m === "texto" ? <FileText className="h-4 w-4 mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
              {m === "texto" ? "Texto Manual" : "Upload de PDF"}
            </Button>
          ))}
        </div>
      </div>

      {/* Categoria */}
      <div>
        <label className="text-sm font-medium mb-1 block">Categoria *</label>
        <Input value={categoria} onChange={(e) => setCategoria(e.target.value.toLowerCase())}
          placeholder="sobre, servicos, regulamento..." required />
        <p className="text-xs text-muted-foreground mt-1">
          Deve coincidir com as categorias usadas pelos agentes RAG
        </p>
      </div>

      {/* Tamanho */}
      <div>
        <label className="text-sm font-medium mb-1 block">
          Tamanho do bloco: <span className="font-bold">{tamanho} caracteres</span>
        </label>
        <input type="range" min={400} max={1500} step={50} value={tamanho}
          onChange={(e) => setTamanho(Number(e.target.value))}
          className="w-full accent-primary" title="Tamanho do bloco" aria-label="Tamanho do bloco em caracteres" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>400</span><span>1500</span>
        </div>
      </div>

      {/* Conteúdo */}
      {method === "texto" ? (
        <div>
          <label className="text-sm font-medium mb-1 block">Texto *</label>
          <Textarea value={texto} onChange={(e) => setTexto(e.target.value)}
            placeholder="Cole ou digite o texto aqui..." rows={8} required />
          <p className="text-xs text-muted-foreground mt-1">
            {texto.length} caracteres · ~{Math.ceil(texto.length / tamanho)} blocos estimados
          </p>
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium mb-1 block">Arquivo PDF *</label>

          {/* FIX: botão customizado em vez do input nativo — sem problemas de tema */}
          <div
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-3 w-full rounded-md border border-input bg-background px-4 py-2.5 text-sm cursor-pointer hover:bg-accent transition-colors"
          >
            <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className={pdfFile ? "text-foreground" : "text-muted-foreground"}>
              {pdfFile ? pdfFile.name : "Clique para selecionar um PDF..."}
            </span>
            {pdfFile && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPdfFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Remover arquivo"
              >
                ×
              </button>
            )}
          </div>
          {/* input real escondido */}
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            required={!pdfFile}
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            className="sr-only"
            aria-label="Selecionar arquivo PDF"
          />
          <p className="text-xs text-muted-foreground mt-1">
            PDFs escaneados (imagem) não têm texto extraível
          </p>
        </div>
      )}

      {pdfStatus && <p className="text-sm text-muted-foreground animate-pulse">{pdfStatus}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-1">
          <p className="font-medium">Processamento concluído</p>
          <p>Blocos gerados: {result.blocos_gerados}</p>
          <p className="text-green-700 dark:text-green-400">Inseridos: {result.inseridos}</p>
          {result.duplicatas > 0 && (
            <p className="text-yellow-700 dark:text-yellow-400">Duplicatas ignoradas: {result.duplicatas}</p>
          )}
          {result.erros > 0 && (
            <p className="text-destructive">Erros: {result.erros}</p>
          )}
        </div>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Processando..." : method === "texto" ? "Gerar Embeddings" : "Processar PDF"}
      </Button>
    </form>
  );
}

function EmbeddingList({ items, selectable, selected, onToggle }: {
  items: EmbeddingItem[]; selectable: boolean;
  selected: Set<string>; onToggle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nenhum embedding encontrado</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const isExpanded = expanded.has(item.id);
        const isSelected = selected.has(item.id);
        const preview = item.content.slice(0, 200);
        const hasMore = item.content.length > 200;

        return (
          <div key={item.id}
            className={`rounded-lg border p-4 transition-colors ${isSelected ? "border-primary bg-primary/5" : ""}`}>
            <div className="flex items-start gap-3">
              {selectable && (
                <input type="checkbox" checked={isSelected} onChange={() => onToggle(item.id)}
                  className="mt-1 h-4 w-4 shrink-0 accent-primary" aria-label="Selecionar embedding" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryColor(item.category)}`}>
                    {item.category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  <span className="text-xs text-muted-foreground">{item.content.length} chars</span>
                </div>
                <p className="text-sm text-muted-foreground break-words">
                  {isExpanded ? item.content : preview}
                  {!isExpanded && hasMore && "..."}
                </p>
                {hasMore && (
                  <button type="button" onClick={() => toggleExpand(item.id)}
                    className="mt-1 text-xs text-primary flex items-center gap-1 hover:underline">
                    {isExpanded ? <><ChevronUp className="h-3 w-3" /> Recolher</>
                      : <><ChevronDown className="h-3 w-3" /> Ver completo</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TabListBase({ mode }: { mode: "visualizar" | "gerenciar" }) {
  const [items, setItems] = useState<EmbeddingItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [filterCat, setFilterCat] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<{ open: boolean; message: string; action: () => void }>
    ({ open: false, message: "", action: () => {} });
  const [error, setError] = useState<string | null>(null);
  const LIMIT = 20;

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/embeddings/categories");
      if (res.ok) setCategories(await res.json());
    } catch {}
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (filterCat) params.set("categoria", filterCat);
      const res = await fetch(`/api/admin/embeddings?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setTotal(data.total);
      }
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [page, filterCat]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchItems(); setSelected(new Set()); }, [fetchItems]);

  function toggleSelect(id: string) {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  function toggleAll() {
    setSelected(selected.size === items.length ? new Set() : new Set(items.map((i) => i.id)));
  }

  async function deleteSelected() {
    try {
      setError(null);
      const res = await fetch("/api/admin/embeddings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelected(new Set());
      await fetchItems();
      await fetchCategories();
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao deletar"); }
  }

  async function deleteCategory(cat: string) {
    try {
      setError(null);
      const res = await fetch(`/api/admin/embeddings/category/${encodeURIComponent(cat)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFilterCat(""); setPage(1);
      await fetchItems(); await fetchCategories();
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao deletar categoria"); }
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-4">
      <ConfirmModal open={confirm.open} message={confirm.message}
        onConfirm={() => { confirm.action(); setConfirm((c) => ({ ...c, open: false })); }}
        onCancel={() => setConfirm((c) => ({ ...c, open: false }))} />

      <div className="flex items-center gap-3 flex-wrap">
        <select value={filterCat} onChange={(e) => { setFilterCat(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-input bg-background text-foreground px-3 text-sm"
          aria-label="Filtrar por categoria">
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.category} value={c.category}>{c.category} ({c.total})</option>
          ))}
        </select>

        {mode === "gerenciar" && filterCat && (
          <Button variant="destructive" size="sm"
            onClick={() => setConfirm({
              open: true,
              message: `Deletar TODOS os embeddings da categoria "${filterCat}"? Esta ação é irreversível.`,
              action: () => deleteCategory(filterCat),
            })}>
            <Trash2 className="h-4 w-4 mr-1" />Deletar categoria
          </Button>
        )}

        <span className="text-sm text-muted-foreground ml-auto">
          {total} embedding{total !== 1 ? "s" : ""}
        </span>
      </div>

      {mode === "gerenciar" && items.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={selected.size === items.length && items.length > 0}
              onChange={toggleAll} className="h-4 w-4 accent-primary" aria-label="Selecionar todos" />
            Selecionar todos da página
          </label>
          {selected.size > 0 && (
            <Button variant="destructive" size="sm"
              onClick={() => setConfirm({
                open: true,
                message: `Deletar ${selected.size} embedding(s) selecionado(s)? Esta ação é irreversível.`,
                action: deleteSelected,
              })}>
              <Trash2 className="h-4 w-4 mr-1" />Deletar selecionados ({selected.size})
            </Button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground py-4">Carregando...</p>
      ) : (
        <EmbeddingList items={items} selectable={mode === "gerenciar"}
          selected={selected} onToggle={toggleSelect} />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
        </div>
      )}
    </div>
  );
}

export default function EmbeddingsPage() {
  const [tab, setTab] = useState<Tab>("inserir");
  const [refreshKey, setRefreshKey] = useState(0);

  const tabs: { id: Tab; label: string }[] = [
    { id: "inserir", label: "Inserir" },
    { id: "visualizar", label: "Visualizar" },
    { id: "gerenciar", label: "Gerenciar" },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Embeddings</h1>

      <div className="flex border-b">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {tab === "inserir" && <TabInserir onSuccess={() => setRefreshKey((k) => k + 1)} />}
          {tab === "visualizar" && <TabListBase key={`vis-${refreshKey}`} mode="visualizar" />}
          {tab === "gerenciar" && <TabListBase key={`ger-${refreshKey}`} mode="gerenciar" />}
        </CardContent>
      </Card>
    </div>
  );
}