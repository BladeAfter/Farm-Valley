import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { occupancyIssue } from "../src/data/land.ts";
import { fruitRect } from "../src/types/orchard.ts";
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
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  const read = async () => (await page.request.get(base + "/api/farm")).json();
  let farm = (await read()).farm,
    cell;
  outer: for (let x = 0; x < 24; x++)
    for (let y = 0; y < 22; y++)
      if (!occupancyIssue(farm, fruitRect({ x, y }))) {
        cell = { x, y };
        break outer;
      }
  assert.ok(cell);
  let dx = 12 - (cell.x - cell.y) * 44,
    dy = 310 - (cell.x + cell.y) * 22;
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
  await page.getByRole("button", { name: "Loja", exact: true }).click();
  await page
    .getByRole("button", { name: "Árvores Frutíferas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Comprar Pereira", exact: true })
    .click();
  await page.mouse.click(640, 400);
  await page.getByText("Muda plantada! Seu pomar está crescendo.").waitFor();
  farm = (await read()).farm;
  const tree = farm.fruitTrees.at(-1);
  assert.equal(tree.species, "pear");
  assert.equal(farm.coins, 95);
  const wait = () =>
    page.waitForFunction(
      (id) =>
        JSON.parse(
          document.querySelector("canvas").dataset.orchardFrames || "{}",
        )[id] === 0,
      tree.id,
    );
  await wait();
  const requests = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((e) => e.name),
  );
  assert.ok(requests.some((url) => url.includes("/pear/stages-v1.webp")));
  assert.ok(!requests.some((url) => url.includes("/cherry/stages-v1.webp")));
  await page.reload();
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  await wait();
  assert.deepEqual((await read()).farm, farm);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: pear purchase and sprite load on demand; unused tree atlases stay unloaded; saved pear renders after reload.",
  );
} finally {
  await browser.close();
}
