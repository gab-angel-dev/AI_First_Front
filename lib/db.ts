import { Pool, types } from "pg";

// ─── Type parsers ─────────────────────────────────────────────────────────────
// Por padrão o driver pg converte DATE para objeto Date do JS, o que causa
// problemas de timezone e serialização. Forçamos retorno como string "YYYY-MM-DD".
types.setTypeParser(types.builtins.DATE, (val: string) => val); // ex: "2025-01-15"

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const host = process.env.POSTGRES_HOST;
    const port = parseInt(process.env.POSTGRES_PORT || "5432", 10);
    const user = process.env.POSTGRES_USER;
    const password = process.env.POSTGRES_PASSWORD;
    const database = process.env.POSTGRES_DB;
    if (!host || !user || !database) {
      throw new Error(
        "Variáveis PostgreSQL não configuradas. Verifique POSTGRES_HOST, POSTGRES_USER, POSTGRES_DB no .env"
      );
    }
    pool = new Pool({
      host,
      port,
      user,
      password: password || undefined,
      database,
    });
  }
  return pool;
}

export async function getDbConnection() {
  return await getPool().connect();
}

export async function query(text: string, params?: unknown[]) {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

export default getPool;