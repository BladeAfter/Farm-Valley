import { readFileSync } from "node:fs";
import type { PoolConfig } from "pg";

export function databaseConfig(env: NodeJS.ProcessEnv = process.env): PoolConfig | null {
  const connectionString = env.DATABASE_URL?.trim();
  if (!connectionString) {
    if (env.DATABASE_REQUIRED === "true" || env.NODE_ENV === "production")
      throw new Error("Configure DATABASE_URL para salvar no PostgreSQL.");
    return null;
  }
  let url: URL;
  try { url = new URL(connectionString); } catch { throw new Error("DATABASE_URL inválida."); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.password || decodeURIComponent(url.password).includes("YOUR-PASSWORD"))
    throw new Error("Configure uma URL PostgreSQL com a senha real no ambiente do servidor.");
  const supabase = url.hostname.endsWith(".supabase.co") || url.hostname.endsWith(".supabase.com");
  if (supabase) {
    // URL SSL flags override node-postgres ssl options; keep verification explicit.
    for (const key of ["sslmode", "sslcert", "sslkey", "sslrootcert", "ssl"]) url.searchParams.delete(key);
  }
  return {
    connectionString: url.toString(),
    max: 5,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    ...(supabase ? { ssl: { rejectUnauthorized: true, ...(env.DATABASE_CA_PATH ? { ca: readFileSync(env.DATABASE_CA_PATH, "utf8") } : {}) } } : {}),
  };
}
