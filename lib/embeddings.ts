import OpenAI from "openai";
import { query } from "@/lib/db";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function chunkText(text: string, chunkSize: number = 800): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current: string[] = [];

  for (const word of words) {
    current.push(word);
    if (current.join(" ").length >= chunkSize) {
      chunks.push(current.join(" "));
      current = [];
    }
  }
  if (current.length > 0) chunks.push(current.join(" "));
  return chunks.filter((c) => c.trim().length > 0);
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return res.data[0].embedding;
}

export interface InsertResult {
  blocos_gerados: number;
  inseridos: number;
  duplicatas: number;
  erros: number;
}

export async function insertChunks(
  chunks: string[],
  categoria: string
): Promise<InsertResult> {
  let inseridos = 0;
  let duplicatas = 0;
  let erros = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    try {
      const dup = await query(
        `SELECT id FROM rag_embeddings WHERE category = $1 AND content = $2 LIMIT 1`,
        [categoria, chunk]
      );
      if (dup.rows.length > 0) {
        duplicatas++;
        continue;
      }

      const embedding = await generateEmbedding(chunk);
      await query(
        `INSERT INTO rag_embeddings (content, category, embedding)
         VALUES ($1, $2, $3::vector)`,
        [chunk, categoria, JSON.stringify(embedding)]
      );
      inseridos++;
    } catch (e) {
      console.error(`Erro ao inserir chunk ${i + 1}:`, e);
      erros++;
    }
  }

  return { blocos_gerados: chunks.length, inseridos, duplicatas, erros };
}