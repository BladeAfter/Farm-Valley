import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { occupancyIssue, placementRect } from "../src/data/land.ts";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    hasTouch: process.env.FARM_TOUCH === "1",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:5173");
  const canvas = page.locator('canvas[data-scene="farm"]');
  await canvas.waitFor();
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.penPositions,
  );
  const read = async () =>
    (await (await page.request.get("http://localhost:5173/api/farm")).json())
      .farm;
  let farm = await read();
  const before = structuredClone(farm);
  let panX = 0,
    panY = 0;
  const point = (x, y) => ({
    x: 640 + (44 * (x - y) - 12) + panX,
    y: 400 + (22 * (x + y) - 310) + panY,
  });
  const reveal = async (x, y) => {
    const p = point(x, y);
    const dx = 640 - p.x,
      dy = 400 - p.y;
    await page.mouse.move(1000, 620);
    await page.mouse.down();
    await page.mouse.move(1000 + dx, 620 + dy, { steps: 12 });
    await page.mouse.up();
    panX += dx;
    panY += dy;
  };
  const clickCell = async (x, y) => {
    const p = point(x, y);
    if (process.env.FARM_TOUCH === "1") await page.touchscreen.tap(p.x, p.y);
    else await page.mouse.click(p.x, p.y);
  };
  const placement = { kind: "pen", animalKind: "cow" };
  let target;
  for (let x = 0; x < 21 && !target; x++)
    for (let y = 0; y < 20 && !target; y++)
      if (
        !occupancyIssue(
          farm,
          placementRect(placement, x, y),
          undefined,
          placement,
        )
      )
        target = { x, y };
  assert.ok(target, "the seeded map must contain a free compact pen footprint");
  const source = point(farm.penPositions.cow.x + 1.8, farm.penPositions.cow.y + 1.85);
  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.waitForTimeout(1350);
  await page.mouse.up();
  await page.locator('.placement-bar').waitFor();
  await reveal(target.x, target.y);
  await clickCell(target.x, target.y);
  await page.waitForFunction(async ({ x, y }) => {
    const f = (await (await fetch("/api/farm")).json()).farm;
    return f.penPositions.cow.x === x && f.penPositions.cow.y === y;
  }, target);
  await page.waitForTimeout(350);
  farm = await read();
  assert.deepEqual(farm.animals, before.animals);
  assert.equal(farm.coins, before.coins);
  await mkdir("docs/screenshots", { recursive: true });
  await page.screenshot({ path: "docs/screenshots/movement-pen.png" });
  await clickCell(target.x + 1.8, target.y + 1.85);
  await page.getByRole('dialog', { name: 'Estábulo', exact: true }).waitFor();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page
    .getByRole("button", { name: "Explorar mapa", exact: true })
    .click();
  await reveal(7, 7);
  await clickCell(7, 7);
  await page.getByRole("button", { name: "Mover", exact: true }).click();
  let fieldTarget;
  for (let x = 1; x < 22 && !fieldTarget; x++)
    for (let y = 0; y < 21 && !fieldTarget; y++)
      if (
        !occupancyIssue(
          farm,
          placementRect({ kind: "moveField", from: { x: 7, y: 7 } }, x, y),
          undefined,
          { kind: "moveField", from: { x: 7, y: 7 } },
        )
      )
        fieldTarget = { x, y };
  assert.ok(fieldTarget);
  await reveal(fieldTarget.x, fieldTarget.y);
  await clickCell(fieldTarget.x, fieldTarget.y);
  await page.waitForFunction(
    async ({ x, y }) =>
      (await (await fetch("/api/farm")).json()).farm.plots.some(
        (p) => p.x === x && p.y === y,
      ),
    fieldTarget,
  );
  farm = await read();
  assert.deepEqual(
    farm.plots.find((p) => p.x === fieldTarget.x && p.y === fieldTarget.y),
    { ...before.plots[0], ...fieldTarget },
  );
  await page.reload();
  await canvas.waitFor();
  await page.waitForFunction(
    ({ x, y }) =>
      JSON.parse(document.querySelector("canvas")?.dataset.penPositions || "{}")
        .cow?.x === x &&
      JSON.parse(document.querySelector("canvas")?.dataset.penPositions || "{}")
        .cow?.y === y,
    target,
  );
  assert.deepEqual((await read()).penPositions.cow, target);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: select pen, move with animals, select planted field, preserve growth, reload saved positions; no browser errors.",
  );
} finally {
  await browser.close();
}
