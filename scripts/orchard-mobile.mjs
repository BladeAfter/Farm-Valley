import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const base = process.env.FARM_BASE_URL || "http://localhost:5173";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const context = await browser.newContext({
      viewport: { width: 844, height: 390 },
      isMobile: true,
      hasTouch: true,
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  await page.waitForFunction(
    () =>
      JSON.parse(
        document.querySelector("canvas").dataset.orchardFrames || "{}",
      )["orchard-0"] === 5,
  );
  const cdp = await context.newCDPSession(page),
    dx = (12 + 264) * 0.6,
    dy = (310 - 484) * 0.6;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 422, y: 195 }],
  });
  for (let i = 1; i <= 12; i++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 422 + (dx * i) / 12, y: 195 + (dy * i) / 12 }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.touchscreen.tap(422, 165);
  await page.getByRole("dialog", { name: "Macieira", exact: true }).waitFor();
  await page.getByRole("button", { name: "Colher 3 maçãs", exact: true }).tap();
  await page.getByText("Frutas fresquinhas guardadas no celeiro!").waitFor();
  await page.getByText("Produzindo novas maçãs...").waitFor();
  await page.screenshot({ path: "docs/screenshots/orchard-v1-touch.png" });
  const saved = (await (await page.request.get(base + "/api/farm")).json())
    .farm;
  assert.equal(saved.inventory.apple, 3);
  assert.equal(saved.fruitTrees[0].harvestCount, 1);
  await page.reload();
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  assert.deepEqual(
    (await (await page.request.get(base + "/api/farm")).json()).farm,
    saved,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: mobile touch pan, tree selection and harvest, production countdown and reload.",
  );
} finally {
  await browser.close();
}
