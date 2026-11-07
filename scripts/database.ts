import "dotenv/config";
import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { databaseConfig } from "../server/database/config.js";
import { resolve } from "node:path";
import type { Farm } from "../src/types/game.js";

async function run() {
  const config=databaseConfig({...process.env,DATABASE_REQUIRED:"true"});
  const pool=new Pool(config!);
  try {
    if(process.argv[2]!=="import") {
      const result=await pool.query("SELECT current_database() AS database, ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()");
      console.log("PostgreSQL conectado:",result.rows[0]);
      return;
    }
    // Stop the API first. Read and validate the entire source before touching the database.
    const source=JSON.parse(await readFile(resolve(process.env.FARM_SAVE_PATH||".data/farm-sessions.json"),"utf8")) as Record<string,{farm:Farm;expires:number}>;
    const entries=Object.entries(source);
    for(const [hash,entry]of entries)if(!/^[a-f0-9]{64}$/.test(hash)||!entry?.farm||typeof entry.farm.version!=="number"||!Number.isFinite(entry.expires)||!Number.isFinite(new Date(entry.expires).getTime()))throw new Error("Arquivo de progresso inválido; importação cancelada.");
    const client=await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(await readFile(new URL("../server/database/schema.sql",import.meta.url),"utf8"));
      let imported=0;
      for(const [hash,entry]of entries) {
        const result=await client.query("INSERT INTO sessions(token_hash,farm,expires_at) VALUES($1,$2,$3) ON CONFLICT(token_hash) DO NOTHING",[hash,JSON.stringify(entry.farm),new Date(entry.expires)]);
        imported+=result.rowCount??0;
      }
      await client.query("COMMIT");
      console.log(`Importadas ${imported} sessões; ${entries.length-imported} já existentes preservadas. Arquivo original mantido.`);
    }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
  }finally{await pool.end();}
}
run().catch(error=>{
  // Do not print a connection string or driver details that may contain credentials.
  console.error("Não foi possível concluir a operação PostgreSQL. Verifique URL, senha, certificado e conectividade.",error?.code||"");
  process.exitCode=1;
});
