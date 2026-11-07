import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const base = "http://localhost:5173";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const seller = await browser.newContext({
      locale: "pt-BR",
      baseURL: base,
      viewport: { width: 960, height: 540 },
    }),
    buyer = await browser.newContext({
      locale: "pt-BR",
      baseURL: base,
      viewport: { width: 640, height: 360 },
    });
  const a = await seller.newPage(),
    b = await buyer.newPage(),
    errors = [];
  for (const page of [a, b]) {
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.locator('canvas[data-scene="farm"]').waitFor();
  }
  const read = async (context) =>
    (await (await context.request.get("/api/farm")).json()).farm;
  const beforeA = await read(seller),
    beforeB = await read(buyer);
  const open = async (page) => {
    await page
      .getByRole("button", { name: "Mais opções", exact: true })
      .click();
    await page.getByRole("button", { name: "Mercado", exact: true }).click();
  };
  await open(a);
  await a.getByRole("button", { name: "Meus anúncios", exact: true }).click();
  await a.getByLabel("Quantidade", { exact: true }).fill("2");
  await a.getByLabel("Preço total em moedas", { exact: true }).fill("2");
  await a.getByRole("button", { name: "Anunciar", exact: true }).click();
  await a.locator(".market-card").waitFor();
  const id = await a.locator(".market-card").getAttribute("data-listing");
  assert.equal(
    (await read(seller)).inventory.wheat,
    beforeA.inventory.wheat - 2,
  );
  await open(b);
  await b.locator(`[data-listing="${id}"]`).waitFor();
  await b.locator(`[data-listing="${id}"] button:not(:disabled)`).waitFor();
  await b.waitForTimeout(500);
  await b.screenshot({ path: "docs/screenshots/market-small.png" });
  await b
    .locator(`[data-listing="${id}"]`)
    .getByRole("button", { name: "Comprar", exact: true })
    .click();
  await b.waitForFunction(
    async (value) =>
      (await (await fetch("/api/farm")).json()).farm.inventory.wheat === value,
    beforeB.inventory.wheat + 2,
  );
  const afterA = await read(seller),
    afterB = await read(buyer);
  assert.equal(afterA.coins, beforeA.coins + 2);
  assert.equal(afterB.coins, beforeB.coins - 2);
  assert.equal(
    (
      await buyer.request.post("/api/farm/market", {
        data: { type: "buy", id },
      })
    ).status(),
    400,
  );
  await a
    .getByRole("button", { name: "Sincronizar progresso", exact: true })
    .click();
  await a.reload();
  await a.locator('canvas[data-scene="farm"]').waitFor();
  assert.equal((await read(seller)).coins, afterA.coins);
  assert.equal(
    await b.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: two independent players, UI listing and purchase, real stock/coins, duplicate rejection, reload and 640x360 layout.",
  );
} finally {
  await browser.close();
}
