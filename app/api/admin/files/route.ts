import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { saveFile, getMediaType, validateFileSize, validateExtension } from "@/lib/files";

export const runtime = "nodejs";

// ─── GET /api/admin/files ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get("categoria") || "";

  try {
    const params: unknown[] = [];
    let where = "";
    if (categoria) {
      params.push(categoria.toLowerCase());
      where = `WHERE category = $1`;
    }

    const result = await query(
      `SELECT id, category, "filename", "mediatype", path, created_at
       FROM files
       ${where}
       ORDER BY created_at DESC`,
      params
    );

    return NextResponse.json(
      result.rows.map((r: Record<string, unknown>) => ({
        id: Number(r.id),
        category: String(r.category),
        filename: String(r.filename),
        mediatype: String(r.mediatype),
        path: String(r.path),
        created_at: r.created_at,
      }))
    );
  } catch (e) {
    console.error("GET /api/admin/files:", e);
    return NextResponse.json({ error: "Erro ao listar arquivos" }, { status: 500 });
  }
}

// ─── POST /api/admin/files ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const categoria = (formData.get("categoria") as string | null)
      ?.toLowerCase()
      .trim()
      .replace(/\s+/g, "_");

    if (!file) {
      return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
    }
    if (!categoria) {
      return NextResponse.json({ error: "Categoria obrigatória" }, { status: 400 });
    }

    const sizeError = validateFileSize(file.size);
    if (sizeError) return NextResponse.json({ error: sizeError }, { status: 422 });

    const extError = validateExtension(file.name);
    if (extError) return NextResponse.json({ error: extError }, { status: 422 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const mediaType = getMediaType(file.name);

    let publicUrl: string;
    try {
      publicUrl = saveFile(buffer, categoria, file.name);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("CONFLICT:")) {
        return NextResponse.json(
          { error: e.message.replace("CONFLICT:", "") },
          { status: 409 }
        );
      }
      throw e;
    }

    const result = await query(
      `INSERT INTO files (category, "filename", "mediatype", path)
       VALUES ($1, $2, $3, $4)
       RETURNING id, category, "filename", "mediatype", path, created_at`,
      [categoria, file.name, mediaType, publicUrl]
    );

    const row = result.rows[0] as Record<string, unknown>;
    return NextResponse.json(
      {
        id: Number(row.id),
        category: String(row.category),
        filename: String(row.filename),
        mediatype: String(row.mediatype),
        path: String(row.path),
        created_at: row.created_at,
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("POST /api/admin/files:", e);
    return NextResponse.json({ error: "Erro ao fazer upload" }, { status: 500 });
  }
}