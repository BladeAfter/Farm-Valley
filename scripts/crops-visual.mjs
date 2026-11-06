// Real API against an isolated high-level test save; never changes a player's farm.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { initialFarm } from "../server/services/farm.ts";
import { cropIds, crops } from "../src/types/game.ts";
const path = resolve(".data/crops-visual-" + Date.now() + ".json");
const token = randomBytes(32).toString("hex");
const farm = initialFarm({ planted: false });
farm.xp = 150;
for (const crop of cropIds) farm.inventory[crop] = 5;
farm.plots.forEach((plot, i) => {
  const crop = cropIds[Math.min(4, Math.floor(i / 5))];
  plot.crop = crop;
  plot.plantedAt = Date.now() - crops[crop].duration - 1000;
});
await mkdir(".data", { recursive: true });
await writeFile(
  path,
  JSON.stringify({
    [createHash("sha256").update(token).digest("hex")]: {
      farm,
      expires: Date.now() + 3600000,
    },
  }),
);
const api = spawn(
  process.execPath,
  ["--import", "tsx", "server/api/index.ts"],
  {
    env: {
      ...process.env,
      PORT: "3198",
      FARM_SAVE_PATH: path,
      DATABASE_URL: "",
      NODE_ENV: "development",
    },
    windowsHide: true,
    stdio: "pipe",
  },
);
let browser;
try {
  await new Promise((done, fail) => {
    api.stdout.on("data", (d) => {
      if (String(d).includes("3198")) done();
    });
    api.on("error", fail);
    api.on("exit", (code) => fail(new Error("API exited: " + code)));
  });
  browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    hasTouch: true,
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
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().includes("/assets/") && r.status() >= 400) errors.push(r.url());
  });
  await page.route("**/api/**", async (route) => {
    const response = await route.fetch({
      url: route.request().url().replace("localhost:5173", "localhost:3198"),
    });
    await route.fulfill({ response });
  });
  const read = async () =>
    (await (await context.request.get("http://localhost:3198/api/farm")).json())
      .farm;
  await page.goto("http://localhost:5173");
  await page.locator('canvas[data-scene="farm"]').waitFor();
  await page.waitForTimeout(800);
  await mkdir("docs/screenshots", { recursive: true });
  await page.screenshot({ path: "docs/screenshots/crops-v1-farm.png" });
  assert.equal(
    await page
      .getByRole("button", { name: "Plantar Trigo", exact: true })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Modo plantar", exact: true }).click();
  for (const crop of cropIds)
    await page
      .getByRole("button", { name: "Plantar " + crops[crop].name, exact: true })
      .waitFor();
  await page.screenshot({ path: "docs/screenshots/crops-v1-seeds.png" });
  await page.getByRole("button", { name: "Fechar sementes" }).click();
  await page.getByRole("button", { name: "Colher com foice" }).click();
  const point = (x, y) => ({
    x: 640 + (x - y) * 44 - 12,
    y: 400 + (x + y) * 22 - 310,
  });
  const p = point(11, 10); // ripe sugarcane in isolated test fixture
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/farm/command") && r.request().method() === "POST",
  );
  await page.touchscreen.tap(p.x, p.y);
  assert.equal((await response).status(), 200);
  let saved = await read();
  assert.equal(saved.inventory.sugarcane, 7);
  await page.getByRole("button", { name: "Modo plantar" }).click();
  await page
    .getByRole("button", { name: "Plantar Cana-de-açúcar", exact: true })
    .click();
  await page.waitForTimeout(100);
  assert.equal(await page.locator(".seed-picker").count(), 0);
  const planted = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/farm/command") && r.request().method() === "POST",
  );
  await page.touchscreen.tap(p.x, p.y);
  assert.equal((await planted).status(), 200);
  saved = await read();
  assert.equal(saved.inventory.sugarcane, 6);
  assert.equal(
    saved.plots.find((p) => p.x === 11 && p.y === 10).crop,
    "sugarcane",
  );
  const denied = await context.request.post(
    "http://localhost:3198/api/farm/command",
    { data: { type: "harvest", x: 11, y: 10 } },
  );
  assert.equal(denied.status(), 400);
  await page.setViewportSize({ width: 960, height: 540 });
  await page.reload();
  await page.locator('canvas[data-scene="farm"]').waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "docs/screenshots/crops-v1-mobile.png" });
  await page.getByRole("button", { name: "Modo plantar" }).click();
  await page.screenshot({ path: "docs/screenshots/crops-v1-mobile-seeds.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.deepEqual((await read()).inventory, saved.inventory);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: five mature crop sprites; compact desktop/mobile HUD; seed selection; touch harvest and planting; early harvest rejected; persisted reload. Isolated level-4 fixture.",
  );
} finally {
  if (browser) await browser.close();
  api.kill();
  await new Promise((done) =>
    api.exitCode !== null ? done() : api.once("exit", done),
  );
  await unlink(path).catch(() => {});
}
