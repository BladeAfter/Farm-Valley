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
    viewport: { width: 1280, height: 1050 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400 && r.url().includes("/assets/")) errors.push(r.url());
  });
  await mkdir("docs/screenshots", { recursive: true });
  await page.goto(base + "/scripts/wall-preview.html");
  await page.locator('canvas[data-wall-preview="ready"]').waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "docs/screenshots/walls-v2-cases.png" });
  for (let i = 0; i < 6; i++)
    await page.screenshot({
      path: `docs/screenshots/walls-v2-case-${i + 1}.png`,
      clip: {
        x: (i % 2) * 640,
        y: Math.floor(i / 2) * 350,
        width: 640,
        height: 350,
      },
    });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(base);
  await page.locator('canvas[data-walls-version="2"]').waitFor();
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "docs/screenshots/walls-v2-farm.png" });
  // Actual border close-up, camera drag and zoom through the existing controls.
  await page.mouse.move(1000, 500);
  await page.mouse.down();
  await page.mouse.move(1250, 450, { steps: 15 });
  await page.mouse.up();
  for (let i = 0; i < 5; i++)
    await page.getByRole("button", { name: "Aproximar", exact: true }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "docs/screenshots/walls-v2-detail.png" });
  await page.setViewportSize({ width: 844, height: 390 });
  await page
    .getByRole("button", { name: "Centralizar fazenda", exact: true })
    .click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "docs/screenshots/walls-v2-mobile.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: six rendered wall scenarios, real farm integration, camera and mobile viewport; no JS or missing-asset errors.",
  );
} finally {
  await browser.close();
}
