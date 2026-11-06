import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { occupancyIssue } from "../src/data/land.ts";
import { fruitRect, fruitSpecies } from "../src/types/orchard.ts";
const base = process.env.FARM_BASE_URL || "http://localhost:5173";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
let context, page;
try {
  context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  page = await context.newPage();
  const errors = [];
  const observe = () => {
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().includes("/assets/") && r.status() >= 400)
        errors.push(r.url());
    });
  };
  observe();
  await mkdir("docs/screenshots", { recursive: true });
  await page.goto(base + "/scripts/orchard-preview.html");
  await page.locator('canvas[data-orchard-preview="ready"]').waitFor();
  await page.setViewportSize({ width: 1280, height: 1840 });
  await page.screenshot({ path: "docs/screenshots/orchard-v1-stages.png" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(base);
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  const read = async () => (await page.request.get(base + "/api/farm")).json();
  const frames = async () =>
    JSON.parse(
      (await page.locator("canvas").getAttribute("data-orchard-frames")) ||
        "{}",
    );
  async function waitFrame(id, frame) {
    await page.waitForFunction(
      ({ id, frame }) =>
        JSON.parse(
          document.querySelector("canvas").dataset.orchardFrames || "{}",
        )[id] === frame,
      { id, frame },
    );
  }
  async function focus(x, y) {
    await page
      .getByRole("button", { name: "Centralizar fazenda", exact: true })
      .click();
    let dx = 12 - (x - y) * 44,
      dy = 310 - (x + y) * 22;
    while (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      const mx = Math.max(-220, Math.min(220, dx)),
        my = Math.max(-160, Math.min(160, dy));
      await page.mouse.move(640, 400);
      await page.mouse.down();
      await page.mouse.move(640 + mx, 400 + my, { steps: 10 });
      await page.mouse.up();
      dx -= mx;
      dy -= my;
    }
    await page.waitForTimeout(150);
  }
  const before = (await read()).farm;
  assert.equal(before.version, 6);
  assert.equal(before.fruitTrees.length, 6);
  await waitFrame("orchard-0", 5);
  await page.screenshot({ path: "docs/screenshots/orchard-v1-farm.png" });
  const original = before.fruitTrees[0];
  await focus(original.x, original.y);
  await page.screenshot({
    path: "docs/screenshots/orchard-v1-ready.png",
    clip: { x: 440, y: 240, width: 400, height: 260 },
  });
  await page.mouse.click(640, 350);
  await page.getByRole("dialog", { name: "Macieira", exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Colher 3 maçãs", exact: true })
    .click();
  await page.getByText("Frutas fresquinhas guardadas no celeiro!").waitFor();
  await waitFrame(original.id, 2);
  let farm = (await read()).farm;
  assert.equal(farm.inventory.apple, 3);
  assert.equal(farm.fruitTrees[0].harvestCount, 1);
  assert.equal(
    farm.fruitTrees[0].readyAt - farm.fruitTrees[0].lastHarvestAt,
    fruitSpecies.apple.duration,
  );
  assert.equal((await frames())["orchard-1"], 5);
  await page.getByText("Produzindo novas maçãs...").waitFor();
  await page.screenshot({ path: "docs/screenshots/orchard-v1-timer.png" });
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: "docs/screenshots/orchard-v1-empty.png",
    clip: { x: 440, y: 240, width: 400, height: 260 },
  });
  const duplicate = await page.request.post(base + "/api/farm/command", {
    data: {
      type: "harvest-fruit-tree",
      treeId: original.id,
      expectedHarvestCount: 0,
    },
  });
  assert.equal(duplicate.status(), 400);
  await page.evaluate(() => {
    window.__realDateNow = Date.now;
    Date.now = () => window.__realDateNow() + 24 * 3600000;
  });
  await page.waitForTimeout(500);
  assert.equal((await frames())[original.id], 2);
  await page.evaluate(() => {
    Date.now = window.__realDateNow;
  });
  const saved = farm,
    storageState = await context.storageState();
  await context.close();
  context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    storageState,
  });
  page = await context.newPage();
  observe();
  await page.goto(base);
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  assert.deepEqual((await read()).farm, saved);
  await waitFrame(original.id, 2);
  let cell;
  outer: for (let x = 0; x < 24; x++)
    for (let y = 0; y < 22; y++)
      if (!occupancyIssue(saved, fruitRect({ x, y }))) {
        cell = { x, y };
        break outer;
      }
  assert.ok(cell);
  await focus(cell.x, cell.y);
  await page.getByRole("button", { name: "Loja", exact: true }).click();
  await page
    .getByRole("button", { name: "Árvores Frutíferas", exact: true })
    .click();
  assert.equal(await page.locator(".orchard-shop-grid article").count(), 8);
  await page.screenshot({ path: "docs/screenshots/orchard-v1-shop.png" });
  await page
    .getByRole("button", { name: "Comprar Macieira", exact: true })
    .click();
  await page.mouse.click(640, 400);
  await page.getByText("Muda plantada! Seu pomar está crescendo.").waitFor();
  farm = (await read()).farm;
  const planted = farm.fruitTrees.at(-1);
  assert.equal(farm.coins, saved.coins - fruitSpecies.apple.price);
  assert.equal(planted.growsAt - planted.plantedAt, fruitSpecies.apple.growth);
  await waitFrame(planted.id, 0);
  await page.screenshot({
    path: "docs/screenshots/orchard-v1-sapling.png",
    clip: { x: 440, y: 240, width: 400, height: 260 },
  });
  console.log(
    "PASS: original orchard harvest, fruit disappears, fresh 2-hour timestamp, device-clock change ignored, reopen persists, all eight shop entries, real sapling purchase.",
  );
  if (!process.argv.includes("--preview-only")) {
    console.log("Waiting for real 60-second initial growth.");
    await page.waitForTimeout(25000);
    await waitFrame(planted.id, 1);
    await focus(planted.x, planted.y);
    await page.screenshot({
      path: "docs/screenshots/orchard-v1-growing.png",
      clip: { x: 440, y: 240, width: 400, height: 260 },
    });
    await page.waitForTimeout(37000);
    await waitFrame(planted.id, 2);
    await focus(planted.x, planted.y);
    await page.screenshot({
      path: "docs/screenshots/orchard-v1-adult.png",
      clip: { x: 440, y: 240, width: 400, height: 260 },
    });
    console.log(
      "PASS: real sapling grows to young and adult empty stages; production remains time-locked.",
    );
  }
  const final = (await read()).farm;
  await page.reload();
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  assert.deepEqual((await read()).farm, final);
  await page.setViewportSize({ width: 844, height: 390 });
  await page
    .getByRole("button", { name: "Centralizar fazenda", exact: true })
    .click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "docs/screenshots/orchard-v1-mobile.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: reload and mobile landscape, no JS or missing-asset errors.",
  );
} finally {
  await browser.close();
}
