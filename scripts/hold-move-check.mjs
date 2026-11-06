import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { occupancyIssue, placementRect } from "../src/data/land.ts";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  for (const touch of [false, true]) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      hasTouch: touch,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://localhost:5173");
    await page.locator('canvas[data-scene="farm"]').waitFor();
    await page.waitForFunction(
      () => document.querySelector("canvas")?.dataset.penPositions,
    );
    const read = async () =>
      (await (await page.request.get("http://localhost:5173/api/farm")).json())
        .farm;
    const original = await read();
    const projection = (x, y) => ({
      x: 640 + (44 * (x - y) - 12),
      y: 400 + (22 * (x + y) - 310),
    });
    const source = projection(14.8, 7.55);
    // Short click keeps the normal compact production dialog.
    await page.mouse.click(source.x, source.y);
    await page.getByRole("dialog", { name: "Estábulo", exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Mover cercado", exact: true })
        .count(),
      0,
    );
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    // Moving immediately must pan, without entering relocation or changing state.
    await page.mouse.move(source.x, source.y);
    await page.mouse.down();
    await page.mouse.move(source.x + 35, source.y + 20, { steps: 6 });
    await page.waitForTimeout(1300);
    await page.mouse.up();
    assert.equal(await page.locator(".placement-bar").count(), 0);
    assert.deepEqual((await read()).penPositions, original.penPositions);
    await page
      .getByRole("button", { name: "Centralizar fazenda", exact: true })
      .click();
    // Keep a useful visible target: server occupancy validates the entire footprint.
    let target;
    for (let x = 0; x < 21 && !target; x++)
      for (let y = 0; y < 20 && !target; y++) {
        const p = projection(x + 1.8, y + 1.85);
        if (
          p.x > 300 &&
          p.x < 1100 &&
          p.y > 180 &&
          p.y < 650 &&
          !occupancyIssue(
            original,
            placementRect({ kind: "pen", animalKind: "cow" }, x, y),
            undefined,
            { kind: "pen", animalKind: "cow" },
          )
        )
          target = { x, y };
      }
    assert.ok(target, "visible free footprint");
    const client = touch ? await context.newCDPSession(page) : null;
    const down = async (p) =>
      touch
        ? client.send("Input.dispatchTouchEvent", {
            type: "touchStart",
            touchPoints: [{ x: p.x, y: p.y }],
          })
        : (await page.mouse.move(p.x, p.y), await page.mouse.down());
    const move = async (p) =>
      touch
        ? client.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: p.x, y: p.y }],
          })
        : page.mouse.move(p.x, p.y, { steps: 12 });
    const up = async () =>
      touch
        ? client.send("Input.dispatchTouchEvent", {
            type: "touchEnd",
            touchPoints: [],
          })
        : page.mouse.up();
    await down(source);
    await page.waitForTimeout(1350);
    await page.waitForFunction(
      () => document.querySelector("canvas")?.dataset.holdMove === "active",
    );
    assert.equal(await page.getByRole("dialog").count(), 0);
    // Offset preserves the point under the pointer while snapping the anchor to the grid.
    const dest = projection(target.x + 2, target.y + 2);
    await move(dest);
    await page.screenshot({
      path: `docs/screenshots/hold-move-${touch ? "touch" : "mouse"}.png`,
    });
    await up();
    await page.waitForFunction(async (target) => {
      const f = (await (await fetch("/api/farm")).json()).farm;
      return (
        f.penPositions.cow.x === target.x && f.penPositions.cow.y === target.y
      );
    }, target);
    let saved = await read();
    assert.deepEqual(saved.animals, original.animals);
    assert.equal(saved.coins, original.coins);
    await page.reload();
    await page.locator('canvas[data-scene="farm"]').waitFor();
    await page.waitForFunction(({ x, y }) => {
      const p = JSON.parse(
        document.querySelector("canvas")?.dataset.penPositions || "{}",
      ).cow;
      return p?.x === x && p?.y === y;
    }, target);
    // Cancellation of an active long hold never commits a move.
    const movedSource = projection(target.x + 1.8, target.y + 1.85);
    await down(movedSource);
    await page.waitForTimeout(1350);
    await page.waitForFunction(
      () => document.querySelector("canvas")?.dataset.holdMove === "active",
    );
    if (touch)
      await client.send("Input.dispatchTouchEvent", {
        type: "touchCancel",
        touchPoints: [],
      });
    else {
      await page.keyboard.press("Escape");
      await up();
    }
    await page.waitForTimeout(200);
    assert.equal(await page.locator(".placement-bar").count(), 0);
    assert.equal((await read()).revision, saved.revision);
    assert.deepEqual(errors, []);
    console.log(
      "PASS:",
      touch ? "real touch events" : "mouse",
      "short click, pan threshold, 1.2s hold, drag ghost, release, persistence and cancellation",
    );
    await context.close();
  }
} finally {
  await browser.close();
}
