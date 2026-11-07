import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { initialFarm, applyCommand, migrateFarm } from "../services/farm.js";
import type { Command, Farm } from "../../src/types/game.js";
import { resolve } from "node:path";
import { FileFarmRepository } from "./file-repository.js";
import { databaseConfig } from "./config.js";
import { trade, publicListings } from "../services/market.js";
import type { MarketAction, MarketListing } from "../../src/types/market.js";
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
export async function market(hash: string, action?: MarketAction) {
  if (!pool) return local.market(hash, action);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Market operations share one short lock; farm rows are locked in stable order.
    if (action) await client.query("SELECT pg_advisory_xact_lock(70241831)");
    const rows = await client.query(
      "SELECT m.payload FROM market_listings m JOIN sessions s ON s.token_hash=m.seller_hash WHERE s.expires_at>now() AND (m.payload->>'status'='active' OR m.id=$1::uuid)",
      [action?.id ?? null],
    );
    const listings = rows.rows.map((r) => r.payload as MarketListing);
    // Include historical IDs to reject replays of listing creation.
    if (action?.type === "list" && !listings.some((l) => l.id === action.id)) {
      const prior = await client.query(
        "SELECT payload FROM market_listings WHERE id=$1",
        [action.id],
      );
      if (prior.rowCount) throw new Error("Operação inválida");
    }
    const seller = action && listings.find((l) => l.id === action.id)?.seller;
    const actors = [...new Set([hash, ...(seller ? [seller] : [])])].sort();
    const sessions = await client.query(
      "SELECT token_hash,farm FROM sessions WHERE token_hash=ANY($1::text[]) AND expires_at>now() ORDER BY token_hash FOR UPDATE",
      [actors],
    );
    const farms = Object.fromEntries(
      sessions.rows.map((r) => [r.token_hash, migrateFarm(r.farm)]),
    );
    if (!farms[hash]) throw new Error("Sessão expirada");
    if (action) {
      trade(farms, listings, hash, action);
      for (const [id, farm] of Object.entries(farms))
        await client.query("UPDATE sessions SET farm=$2 WHERE token_hash=$1", [
          id,
          JSON.stringify(farm),
        ]);
      const changed = listings.find((l) => l.id === action.id)!;
      await client.query(
        "INSERT INTO market_listings(id,seller_hash,payload) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload",
        [changed.id, changed.seller, JSON.stringify(changed)],
      );
    }
    await client.query("COMMIT");
    return { listings: publicListings(listings, hash), farm: farms[hash] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
