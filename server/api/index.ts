import "dotenv/config";
import express from "express";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import {
  initialize,
  createSession,
  access,
  pool,
  market,
} from "../database/repository.js";
import { marketSchema } from "../services/market.js";
import { newToken, hashToken } from "../auth/session.js";
import { commandSchema } from "../validators/command.js";
import { errorInfo } from "../../src/i18n/errors.js";
const app = express();
if(process.env.TRUST_PROXY==="1")app.set("trust proxy",1);
app.disable("x-powered-by");
app.use(express.json({ limit: "4kb" }));
app.get("/healthz",async(_req,res)=>{
 try { if(pool)await pool.query("SELECT 1");res.json({ok:true}); }
 catch { res.status(503).json({ok:false}); }
});
app.use("/api", (req, res, next) => {
  if (req.method === "POST" && req.headers["sec-fetch-site"] === "cross-site") {
    res.status(403).json({ error: "Origem inválida" });
    return;
  }
  next();
});
const attempts = new Map<string, { n: number; t: number }>();
app.use("/api", (req, res, next) => {
  const key = req.ip || "local";
  const now = Date.now();
  let a = attempts.get(key);
  if (!a || now - a.t > 60000) {
    a = { n: 0, t: now };
    attempts.set(key, a);
  }
  if (++a.n > 180) {
    res.status(429).json({ error: "Aguarde um momento." });
    return;
  }
  next();
});
app.post("/api/session", async (req, res, next) => {
  try {
    const token = newToken();
    await createSession(hashToken(token));
    res.setHeader(
      "Set-Cookie",
      `fv_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
app.use("/api/farm", async (req, res, next) => {
  const token = req.headers.cookie
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("fv_session="))
    ?.slice(11);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    res.status(401).json({ error: "Sem sessão", code: "errors.session" });
    return;
  }
  res.locals.hash = hashToken(token);
  next();
});
app.get("/api/farm", async (req, res, next) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    res.json({
      farm: await access(res.locals.hash),
      persistent: true,
      storage: pool ? "postgres" : "file",
      serverTime: Date.now(),
    });
  } catch (e) {
    res.status(401).json({ error: "Sessão expirada", code: "errors.session" });
  }
});
app.post("/api/farm/command", async (req, res, next) => {
  try {
    const command = commandSchema.parse(req.body);
    res.json({
      farm: await access(res.locals.hash, command),
      persistent: true,
      storage: pool ? "postgres" : "file",
      serverTime: Date.now(),
    });
  } catch (e) {
    res
      .status(400)
      .json({ error: e instanceof Error ? e.message : "Operação inválida", ...(e instanceof Error && e.name !== "ZodError" ? errorInfo(e.message) : { code:"errors.invalid",params:{} }) });
  }
});
app.get("/api/farm/market",async(req,res)=>{
 try{res.setHeader("Cache-Control","no-store");res.json(await market(res.locals.hash));}
 catch{res.status(401).json({code:"errors.session"});}
});
app.post("/api/farm/market",async(req,res)=>{
 try{res.json(await market(res.locals.hash,marketSchema.parse(req.body)));}
 catch(error){res.status(400).json({code:"errors.actionFailed"});}
});
app.use("/api",(_req,res)=>{res.status(404).json({code:"errors.invalid"});});
if(process.env.NODE_ENV==="production"||process.env.SERVE_WEB==="true"){
 const directory=resolve("dist");
 if(!existsSync(resolve(directory,"index.html")))throw new Error("Execute npm run build antes de iniciar o servidor web.");
 app.use(express.static(directory,{dotfiles:"deny"}));
 app.get(/^\/(?!api(?:\/|$)).*/,(_req,res)=>{res.sendFile(resolve(directory,"index.html"));});
}
app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error.message);
    res.status(500).json({ error: "Servidor indisponível", code:"errors.network" });
  },
);
await initialize();
app.listen(Number(process.env.PORT) || 3001, "0.0.0.0", () =>
  console.log(
    `Farm API :${Number(process.env.PORT) || 3001} | ${pool ? "PostgreSQL" : "Arquivo local persistente"}`,
  ),
);
