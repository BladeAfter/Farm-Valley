import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
const directory=await mkdtemp(join(tmpdir(),"farm-hosting-"));
const api=spawn(process.execPath,["--import","tsx","server/api/index.ts"],{windowsHide:true,stdio:"pipe",env:{...process.env,PORT:"3210",NODE_ENV:"development",DATABASE_URL:"",DATABASE_REQUIRED:"false",SERVE_WEB:"true",FARM_SAVE_PATH:join(directory,"save.json")}});
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error("API startup timeout")),15000);api.stdout.on("data",data=>{if(String(data).includes("Farm API")){clearTimeout(timer);resolve();}});api.on("error",reject);api.on("exit",()=>{clearTimeout(timer);reject(new Error("API exited before startup"));});});
 const base="http://127.0.0.1:3210";
 assert.deepEqual(await(await fetch(base+"/healthz")).json(),{ok:true});
 const html=await fetch(base+"/");assert.equal(html.status,200);assert.ok((await html.text()).includes('<div id="root">'));
 const missing=await fetch(base+"/api/not-found");assert.equal(missing.status,404);assert.ok(missing.headers.get("content-type").includes("application/json"));
 const session=await fetch(base+"/api/session",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
 assert.equal(session.status,200);const cookie=session.headers.get("set-cookie").split(";")[0];
 const farm=await(await fetch(base+"/api/farm",{headers:{cookie}})).json();assert.equal(farm.persistent,true);
 console.log("PASS: single-origin web hosting, API, health check, JSON 404 and persisted session. Remote PostgreSQL not exercised.");
}finally{api.kill();await new Promise(resolve=>{if(api.exitCode!==null)resolve();else api.once("exit",resolve);});await rm(directory,{recursive:true,force:true});}
