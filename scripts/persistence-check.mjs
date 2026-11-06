import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";
import { unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const path = resolve(".data", "process-check-" + randomUUID() + ".json"),
  port = 3197,
  base = "http://127.0.0.1:" + port;
let child;
async function start() {
  child = spawn(process.execPath, ["--import", "tsx", "server/api/index.ts"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: "",
      NODE_ENV: "development",
      FARM_SAVE_PATH: path,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Server startup timed out")),
      15000,
    );
    child.stdout.on("data", (data) => {
      if (data.toString().includes("Farm API :" + port)) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code) {
        clearTimeout(timer);
        reject(new Error("Server exited " + code));
      }
    });
  });
}
async function stop() {
  if (child && child.exitCode === null) {
    const done = once(child, "exit");
    child.kill();
    await done;
  }
}
try {
  await start();
  const session = await fetch(base + "/api/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(session.status, 200);
  const cookie = session.headers.get("set-cookie").split(";")[0];
  const read = async () => {
    const r = await fetch(base + "/api/farm", { headers: { cookie } });
    assert.equal(r.status, 200);
    return r.json();
  };
  const before = await read(),
    id = before.farm.obstacles[0].id;
  const remove = () =>
    fetch(base + "/api/farm/command", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ type: "remove-obstacle", obstacleId: id }),
    });
  const results = await Promise.all([remove(), remove()]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
  const harvest = () =>
    fetch(base + "/api/farm/command", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        type: "harvest-fruit-tree",
        treeId: "orchard-0",
        expectedHarvestCount: 0,
      }),
    });
  const harvested = await Promise.all([harvest(), harvest()]);
  assert.deepEqual(harvested.map((r) => r.status).sort(), [200, 400]);
  const saved = await read();
  assert.equal(saved.farm.inventory.apple, 3);
  assert.equal(saved.farm.fruitTrees[0].harvestCount, 1);
  assert.equal(saved.farm.inventory.pickaxe, before.farm.inventory.pickaxe - 1);
  await stop();
  await start();
  const restored = await read();
  assert.deepEqual(restored.farm, saved.farm);
  assert.equal((await remove()).status, 400);
  assert.equal((await harvest()).status, 400);
  assert.equal((await fetch(base + "/api/farm")).status, 401);
  console.log(
    "PASS: real API restart preserves orchard cycle, fruit inventory, seed, obstacle removal and cookie; concurrent harvest/removal credit once; anonymous access rejected.",
  );
} finally {
  await stop();
  await unlink(path).catch(() => {});
}
