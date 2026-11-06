import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
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
  await page.goto(process.env.FARM_BASE_URL || "http://localhost:5173");
  await page
    .locator('canvas[data-scene="farm"][data-cow-version="4"]')
    .waitFor();
  await page.waitForTimeout(700);
  await mkdir("docs/screenshots", { recursive: true });
  await page.screenshot({ path: "docs/screenshots/cow-v4-farm.png" });
  await page.mouse.move(980, 610);
  await page.mouse.down();
  await page.mouse.move(750, 370, { steps: 15 });
  await page.mouse.up();
  for (let i = 0; i < 6; i++)
    await page.getByRole("button", { name: "Aproximar", exact: true }).click();
  await page.waitForTimeout(500);
  const clip = { x: 220, y: 100, width: 850, height: 560 };
  await page.screenshot({
    path: "docs/screenshots/cow-v4-idle.png",
    clip,
  });
  await page.screenshot({
    path: "docs/screenshots/cow-v4-detail.png",
    clip: { x: 560, y: 175, width: 270, height: 220 },
  });
  await page.waitForTimeout(4300);
  await page.screenshot({
    path: "docs/screenshots/cow-v4-walk.png",
    clip,
  });
  await page.getByRole("button", { name: "Animais", exact: true }).click();
  await page
    .getByRole("button", { name: "Alimentar", exact: true })
    .first()
    .click();
  await page.getByText("Barriguinha cheia! A produção começou.").waitFor();
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "docs/screenshots/cow-v4-eating.png", clip });
  await page.waitForTimeout(11500);
  await page.screenshot({
    path: "docs/screenshots/cow-v4-fed.png",
    clip,
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(missing, []);
  console.log(
    "PASS: anatomy closeups across animation, feeding interaction, no missing assets, no JS errors.",
  );
} finally {
  await browser.close();
}
