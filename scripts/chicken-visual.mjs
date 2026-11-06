import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.FARM_BASE_URL || "http://localhost:5173";
const previewOnly = process.argv.includes("--preview-only");
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
    missing = [],
    legacy = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().includes("/assets/") && r.status() >= 400)
      missing.push(r.url());
    if (/animals\/chicken\/(body|head|leg|wing|tail)-v2/.test(r.url()))
      legacy.push(r.url());
  });
  await page.goto(base);
  await page.locator('canvas[data-chicken-version="3"]').waitFor();
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  await page.waitForTimeout(500);
  await mkdir("docs/screenshots", { recursive: true });
  await page.screenshot({ path: "docs/screenshots/chicken-v3-farm.png" });
  await page.mouse.move(980, 610);
  await page.mouse.down();
  await page.mouse.move(750, 370, { steps: 15 });
  await page.mouse.up();
  for (let i = 0; i < 6; i++)
    await page.getByRole("button", { name: "Aproximar", exact: true }).click();
  await page.waitForTimeout(500);
  const clip = { x: 550, y: 165, width: 490, height: 270 };
  await page.screenshot({ path: "docs/screenshots/chicken-v3-idle.png", clip });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "docs/screenshots/chicken-v3-walk.png", clip });
  const read = async () => (await page.request.get(base + "/api/farm")).json();
  const before = (await read()).farm;
  await page.getByRole("button", { name: "Animais", exact: true }).click();
  await page
    .getByRole("button", { name: "Alimentar", exact: true })
    .nth(1)
    .click();
  await page.getByText("Barriguinha cheia! A produção começou.").waitFor();
  const fed = (await read()).farm;
  assert.equal(fed.inventory.feed, before.inventory.feed - 1);
  assert.notEqual(fed.animals.find((a) => a.id === "chicken-1").fedAt, null);
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "docs/screenshots/chicken-v3-peck.png", clip });
  console.log(
    "PASS: new complete hen sprites, no legacy cutouts, correct feed consumption.",
  );
  if (!previewOnly) {
    console.log("Waiting for real 60-second egg production.");
    await page.waitForTimeout(30000);
    await page.waitForTimeout(31000);
    await page.getByRole("button", { name: "Animais", exact: true }).click();
    await page.getByRole("button", { name: "Recolher", exact: true }).click();
    await page.getByText("Produto fresquinho guardado no celeiro!").waitFor();
    const collected = (await read()).farm;
    assert.equal(collected.inventory.egg, before.inventory.egg + 1);
    assert.equal(
      collected.animals.find((a) => a.id === "chicken-1").fedAt,
      null,
    );
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page
    .getByRole("button", { name: "Centralizar fazenda", exact: true })
    .click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "docs/screenshots/chicken-v3-mobile.png" });
  assert.deepEqual(errors, []);
  assert.deepEqual(missing, []);
  assert.deepEqual(legacy, []);
  console.log(
    previewOnly
      ? "PASS: updated preview and mobile landscape, no JS errors or missing textures."
      : "PASS: real egg collected, no JS errors or missing textures, mobile landscape verified.",
  );
} finally {
  await browser.close();
}
