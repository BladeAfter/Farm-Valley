import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { initialFarm, applyCommand } from "../server/services/farm.ts";
import { animalProducts } from "../src/types/game.ts";
import { feedingVisuals } from "../src/data/feeding.ts";
import { penLocal, pens } from "../src/data/pens.ts";
import { occupancyIssue } from "../src/data/land.ts";

const port = 3203,
  base = `http://localhost:${port}`,
  path = resolve(`.data/feeding-visual-${Date.now()}.json`),
  token = randomBytes(32).toString("hex"),
  hash = createHash("sha256").update(token).digest("hex");
let farm = initialFarm();
farm.xp = 850;
farm.coins = 1000;
farm.obstacles = [];
let sheepCell;
for (let x = 0; x < 22 && !sheepCell; x++)
  for (let y = 0; y < 21 && !sheepCell; y++)
    if (!occupancyIssue(farm, { x, y, w: 3, h: 3 })) sheepCell = { x, y };
farm = applyCommand(farm, { type: "buy-sheep", ...sheepCell });
for (const kind of Object.keys(animalProducts))
  farm.inventory[animalProducts[kind].feed] = kind === "chicken" ? 2 : 1;
await mkdir(".data", { recursive: true });
await mkdir("docs/screenshots", { recursive: true });
await writeFile(
  path,
  JSON.stringify({ [hash]: { farm, expires: Date.now() + 3600000 } }),
);
let api, browser;
try {
  api = spawn(process.execPath, ["--import", "tsx", "server/api/index.ts"], {
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: "",
      FARM_SAVE_PATH: path,
      NODE_ENV: "development",
    },
    windowsHide: true,
    stdio: "pipe",
  });
  await new Promise((done, fail) => {
    api.stdout.on("data", (d) => String(d).includes(String(port)) && done());
    api.on("error", fail);
    api.on("exit", (code) => fail(new Error("API exited " + code)));
  });
  browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({ locale: "pt-BR",
    viewport: { width: 1280, height: 800 },
  });
  await context.addCookies([
    {
      name: "fv_session",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/**", async (route) => {
    const response = await route.fetch({
      url: route.request().url().replace("http://localhost:5173", base),
    });
    await route.fulfill({ response });
  });
  const read = async () =>
    (await (await context.request.get(base + "/api/farm")).json()).farm;
  await page.goto("http://localhost:5173");
  await page.locator('canvas[data-scene="farm"]').waitFor();
  await page.waitForFunction(
    () =>
      JSON.parse(document.querySelector("canvas").dataset.feeding || "[]")
        .length === 6,
  );
  const before = await read();
  const response = await context.request.post(base + "/api/farm/command", {
    data: {
      type: "animal-batch",
      action: "feed",
      animalIds: before.animals.map((a) => a.id),
    },
  });
  assert.equal(response.status(), 200);
  const fed = (await response.json()).farm;
  await page.reload();
  await page.locator('canvas[data-scene="farm"]').waitFor();
  await page.waitForFunction(() => {
    const a = JSON.parse(
      document.querySelector("canvas").dataset.feeding || "[]",
    );
    return a.length === 6 && a.every((a) => a.foodStage > 0);
  });
  const states = () =>
    page.locator("canvas").evaluate((el) => JSON.parse(el.dataset.feeding));
  const walk = await states();
  assert.ok(walk.some((a) => a.phase === "walk"));
  await page.waitForFunction(() =>
    JSON.parse(document.querySelector("canvas").dataset.feeding)
      .filter((a) => a.id !== "sheep-1")
      .every((a) => a.phase === "eat"),
  );
  const eating = await states();
  for (const a of eating) {
    const kind = a.id.split("-")[0],
      local = penLocal(kind, a.x, a.y, fed.penPositions);
    assert.ok(
      local.x >= 0.35 &&
        local.x <= pens[kind].size - 0.35 &&
        local.y >= 0.35 &&
        local.y <= pens[kind].size - 0.35,
    );
  }
  const hens = eating.filter((a) => a.id.startsWith("chicken"));
  assert.ok(Math.hypot(hens[0].x - hens[1].x, hens[0].y - hens[1].y) > 30);
  await page.evaluate(
    (position) =>
      window.dispatchEvent(new CustomEvent("farm-focus", { detail: position })),
    { x: fed.penPositions.goat.x + 1.5, y: fed.penPositions.goat.y + 1.8 },
  );
  await page.waitForTimeout(300);
  await page.screenshot({
    path: "docs/screenshots/feeding-goat-visible.png",
    clip: { x: 400, y: 230, width: 480, height: 330 },
  });
  const reject = await context.request.post(base + "/api/farm/command", {
    data: { type: "feed-animal", animalId: "goat-1" },
  });
  assert.equal(reject.status(), 400);
  for (const animal of fed.animals) {
    const config = animalProducts[animal.kind];
    assert.equal(animal.production.readyAt - animal.fedAt, config.duration);
  }
  await page.waitForFunction(
    () =>
      JSON.parse(document.querySelector("canvas").dataset.feeding).find(
        (a) => a.id === "goat-1",
      ).foodStage === 0,
    {},
    { timeout: 20000 },
  );
  await page
    .getByRole("button", { name: "Centralizar fazenda", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      JSON.parse(document.querySelector("canvas").dataset.feeding).every(
        (a) => a.foodStage === 0,
      ),
    {},
    { timeout: 20000 },
  );
  const after = await read();
  assert.deepEqual(after.inventory, fed.inventory);
  assert.deepEqual(after.animals, fed.animals);
  assert.equal(
    await page.locator("canvas").getAttribute("data-feeding-food-objects"),
    "6",
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: six animals/five species; visible food, approach then eat, gradual consumption, no overlapping hens, boundaries, server timers, reload, duplicate feeding rejection and bounded reusable food objects.",
  );
} finally {
  if (browser) await browser.close();
  if (api && api.exitCode === null) {
    api.kill();
    await new Promise((done) => api.once("exit", done));
  }
  await unlink(path).catch(() => {});
}
