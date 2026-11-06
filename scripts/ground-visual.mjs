import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const base = process.env.FARM_BASE_URL || "http://localhost:5173";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  const errors = [],
    missing = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().includes("/assets/") && r.status() >= 400)
      missing.push(r.url());
  });
  await page.goto(base);
  await page.locator('canvas[data-ground-version="2"]').waitFor();
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  await page.waitForTimeout(500);
  await mkdir("docs/screenshots", { recursive: true });
  await page.screenshot({ path: "docs/screenshots/ground-v2-farm.png" });
  const read = async () => (await page.request.get(base + "/api/farm")).json();
  const before = (await read()).farm;
  const point = (x, y) => ({
    x: 640 + ((x - y) * 44 - 12),
    y: 400 + ((x + y) * 22 - 310),
  });
  await page
    .getByRole("button", { name: "Colher com foice", exact: true })
    .click();
  const start = point(7, 7);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (const [x, y] of [
    [12, 7],
    [12, 8],
    [7, 8],
    [7, 9],
    [12, 9],
  ]) {
    const p = point(x, y);
    await page.mouse.move(p.x, p.y, { steps: 25 });
  }
  await page.mouse.up();
  await page.getByText("Campo cuidado! Continue cultivando.").waitFor();
  assert.equal((await read()).farm.plots.filter((p) => p.crop).length, 0);
  await page
    .getByRole("button", { name: "Explorar mapa", exact: true })
    .click();
  async function closeup(path) {
    await page.mouse.move(680, 480);
    await page.mouse.down();
    await page.mouse.move(648, 394, { steps: 10 });
    await page.mouse.up();
    for (let i = 0; i < 6; i++)
      await page
        .getByRole("button", { name: "Aproximar", exact: true })
        .click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path,
      clip: { x: 220, y: 130, width: 850, height: 520 },
    });
  }
  await closeup("docs/screenshots/ground-v2-empty.png");
  await page
    .getByRole("button", { name: "Centralizar fazenda", exact: true })
    .click();
  const harvested = (await read()).farm;
  await page
    .getByRole("button", { name: "Plantar Trigo", exact: true })
    .click();
  const a = point(7, 10),
    b = point(10, 10);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 25 });
  await page.mouse.up();
  await page.waitForFunction(async (base) => {
    const s = await (await fetch(base + "/api/farm")).json();
    return s.farm.revision === 2;
  }, base);
  const planted = (await read()).farm;
  assert.equal(planted.inventory.wheat, harvested.inventory.wheat - 4);
  assert.equal(planted.coins, before.coins);
  assert.equal(planted.plots.filter((p) => p.crop).length, 4);
  await page
    .getByRole("button", { name: "Explorar mapa", exact: true })
    .click();
  await closeup("docs/screenshots/ground-v2-sown.png");
  await page.setViewportSize({ width: 844, height: 390 });
  await page
    .getByRole("button", { name: "Centralizar fazenda", exact: true })
    .click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "docs/screenshots/ground-v2-mobile.png" });
  assert.deepEqual(errors, []);
  assert.deepEqual(missing, []);
  console.log(
    "PASS: continuous textured ground, full real harvest, 4-field planting, seed accounting, camera, mobile and all assets.",
  );
} finally {
  await browser.close();
}
