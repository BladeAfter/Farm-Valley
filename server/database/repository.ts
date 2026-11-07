import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { initialFarm, applyCommand, migrateFarm } from "../services/farm.js";
import type { Command, Farm } from "../../src/types/game.js";
import { resolve } from "node:path";
import { FileFarmRepository } from "./file-repository.js";
import { databaseConfig } from "./config.js";
const config = databaseConfig();
export const pool = config ? new Pool(config) : null;
const local = new FileFarmRepository(
  resolve(process.env.FARM_SAVE_PATH || ".data/farm-sessions.json"),
);
export async function initialize() {
  if (pool)
    await pool.query(
      await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
    );
  else if (process.env.NODE_ENV === "production")
    throw new Error("DATABASE_URL obrigatório em produção");
}
export async function createSession(hash: string) {
  const farm = initialFarm();
  if (pool)
    await pool.query(
      "INSERT INTO sessions(token_hash,farm,expires_at) VALUES($1,$2,now()+interval '30 days')",
      [hash, JSON.stringify(farm)],
    );
  else await local.create(hash);
}
export async function access(hash: string, command?: Command): Promise<Farm> {
  if (!pool) return local.access(hash, command);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "SELECT farm FROM sessions WHERE token_hash=$1 AND expires_at>now() FOR UPDATE",
      [hash],
    );
    if (!result.rowCount) throw new Error("Sessão expirada");
    const previous = result.rows[0].farm as Farm;
    let farm = migrateFarm(previous);
    if (command) {
      farm = applyCommand(farm, command);
    }
    if (command || previous !== farm) {
      await client.query("UPDATE sessions SET farm=$2 WHERE token_hash=$1", [
        hash,
        JSON.stringify(farm),
      ]);
    }
    await client.query("COMMIT");
    return farm;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
