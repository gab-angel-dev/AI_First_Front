import { NextRequest, NextResponse } from "next/server";
import { chunkText, insertChunks } from "@/lib/embeddings";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const texto: string = typeof body?.texto === "string" ? body.texto.trim() : "";
    const categoria: string =
      typeof body?.categoria === "string" ? body.categoria.toLowerCase().trim() : "";
    const tamanho_bloco: number =
      typeof body?.tamanho_bloco === "number"
        ? Math.min(1500, Math.max(400, body.tamanho_bloco))
        : 800;

    if (!texto) {
      return NextResponse.json({ error: "Campo 'texto' obrigatório" }, { status: 400 });
    }
    if (!categoria) {
      return NextResponse.json({ error: "Campo 'categoria' obrigatório" }, { status: 400 });
    }

    const chunks = chunkText(texto, tamanho_bloco);
    if (chunks.length === 0) {
      return NextResponse.json({ error: "Nenhum bloco gerado a partir do texto" }, { status: 400 });
    }

    const result = await insertChunks(chunks, categoria);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/embeddings/text:", e);
    return NextResponse.json({ error: "Erro ao processar texto" }, { status: 500 });
  }
}