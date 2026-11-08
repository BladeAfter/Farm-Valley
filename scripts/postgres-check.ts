import "dotenv/config";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createSession,access,market,pool,initialize } from "../server/database/repository.js";

async function run(){
 if(!pool)throw new Error("Configure PostgreSQL antes deste teste.");
 const ids=Array.from({length:3},()=>randomBytes(32).toString("hex"));
 try{
  await initialize();
  for(const id of ids)await createSession(id);
  const [seller,buyer,other]=ids;
  const initial=await access(seller),listingId=crypto.randomUUID();
  await market(seller,{type:"list",id:listingId,item:"wheat",amount:2,price:2});
  const results=await Promise.allSettled([market(buyer,{type:"buy",id:listingId}),market(other,{type:"buy",id:listingId})]);
  assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
  const sold=await access(seller);
  assert.equal(sold.coins,initial.coins+2);
  assert.equal(sold.inventory.wheat,initial.inventory.wheat-2);
  const order=sold.orderBoard!.slots[0].order!;
  const delivered=await Promise.allSettled([access(seller,{type:"deliver-board-order",orderId:order.id}),access(seller,{type:"deliver-board-order",orderId:order.id})]);
  assert.equal(delivered.filter(r=>r.status==="fulfilled").length,1);
  const saved=await access(seller);
  assert.equal(saved.coins,sold.coins+order.coins);
  assert.equal(saved.orderBoard!.truck!.orderId,order.id);
  const persisted=await pool.query("SELECT farm FROM sessions WHERE token_hash=$1",[seller]);
  assert.deepEqual(persisted.rows[0].farm,saved);
  console.log("PASS: PostgreSQL real; compra concorrente, entrega concorrente, recompensa única e persistência da viagem.");
 }finally{
  // Only the cryptographically random sessions created by this test are removed.
  try{
   await pool.query("DELETE FROM market_listings WHERE seller_hash=ANY($1::text[])",[ids]);
   await pool.query("DELETE FROM sessions WHERE token_hash=ANY($1::text[])",[ids]);
  }finally{await pool.end();}
 }
}
run().catch(error=>{console.error("Falha na verificação PostgreSQL.",error?.code??error?.name??"");process.exitCode=1;});
