import { test } from "node:test";
import assert from "node:assert/strict";
import { databaseConfig } from "../server/database/config.js";
test("PostgreSQL obrigatório nunca recorre ao arquivo local",()=>{
 assert.equal(databaseConfig({}),null);
 assert.throws(()=>databaseConfig({DATABASE_REQUIRED:"true"}));
 assert.throws(()=>databaseConfig({NODE_ENV:"production"}));
 assert.throws(()=>databaseConfig({DATABASE_URL:"postgresql://postgres:[YOUR-PASSWORD]@db.example.com/postgres"}));
 assert.throws(()=>databaseConfig({DATABASE_URL:"https://user:password@example.com"}));
});
test("Supabase exige TLS verificado sem permitir flags inseguras na URL",()=>{
 const config=databaseConfig({DATABASE_URL:"postgresql://postgres:test-password@db.lawtneoasbcujjyfutal.supabase.co:5432/postgres?sslmode=disable"})!;
 assert.equal((config.ssl as {rejectUnauthorized:boolean}).rejectUnauthorized,true);
 assert.ok(!config.connectionString!.includes("sslmode"));
 assert.equal(config.max,5);
 assert.equal(config.connectionTimeoutMillis,10000);
 assert.equal(new URL(config.connectionString!).hostname,"db.lawtneoasbcujjyfutal.supabase.co");
});
