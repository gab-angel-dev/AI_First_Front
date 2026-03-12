/**
 * Script para criar o primeiro usuário admin.
 * 
 * Uso:
 *   npx tsx scripts/create-admin.ts --name "Seu Nome" --email "seu@email.com" --password "senha123"
 * 
 * ou simplesmente edite as constantes abaixo e rode:
 *   npx tsx scripts/create-admin.ts
 */

import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

// ── Edite aqui se não quiser passar args ──────────────────────────────────────
const DEFAULT_NAME = "Admin";
const DEFAULT_EMAIL = "admin@clinica.com";
const DEFAULT_PASSWORD = "troque-esta-senha-123";
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const get = (flag: string, fallback: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
  };

  const name = get("--name", DEFAULT_NAME);
  const email = get("--email", DEFAULT_EMAIL);
  const password = get("--password", DEFAULT_PASSWORD);

  if (password === DEFAULT_PASSWORD) {
    console.warn("⚠️  Usando senha padrão. Troque após o primeiro login!");
  }

  const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT || "5432"),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  });

  const hash = await bcrypt.hash(password, 12);

  try {
    const result = await pool.query(
      `INSERT INTO admin_users (name, email, password)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         password = EXCLUDED.password,
         updated_at = NOW()
       RETURNING id, name, email, active`,
      [name, email, hash]
    );

    const user = result.rows[0];
    console.log("✅ Admin criado/atualizado com sucesso:");
    console.log(`   ID:    ${user.id}`);
    console.log(`   Nome:  ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Ativo: ${user.active}`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("❌ Erro:", e.message);
  process.exit(1);
});