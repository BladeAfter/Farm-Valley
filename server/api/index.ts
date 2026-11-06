import "dotenv/config";
import express from "express";
import {
  initialize,
  createSession,
  access,
  pool,
} from "../database/repository.js";
import { newToken, hashToken } from "../auth/session.js";
import { commandSchema } from "../validators/command.js";
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "4kb" }));
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
    res.status(401).json({ error: "Sem sessão" });
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
    res.status(401).json({ error: "Sessão expirada" });
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
      .json({ error: e instanceof Error ? e.message : "Operação inválida" });
  }
});
app.use(
  (
    error: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error.message);
    res.status(500).json({ error: "Servidor indisponível" });
  },
);
await initialize();
app.listen(Number(process.env.PORT) || 3001, "0.0.0.0", () =>
  console.log(
    `Farm API :${Number(process.env.PORT) || 3001} | ${pool ? "PostgreSQL" : "Arquivo local persistente"}`,
  ),
);
