import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const context = await browser.newContext({
      baseURL: "http://localhost:5173",
      locale: "pt-BR",
      viewport: { width: 1280, height: 800 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (response) => {
    if (response.url().includes("delivery-truck") && response.status() >= 400)
      errors.push(response.url());
  });
  await page.goto("http://localhost:5173");
  await page.locator('canvas[data-scene="farm"]').waitFor();
  const read = async () =>
    (await (await context.request.get("/api/farm")).json()).farm;
  const before = await read(),
    order = before.orderBoard.slots[0].order;
  await page.waitForFunction(
    () => !!document.querySelector("canvas")?.dataset.deliveryTruck,
  );
  await page.waitForTimeout(500);
  await page.screenshot({ path: "docs/screenshots/truck-idle.png" });
  await page.getByRole("button", { name: "Pedidos", exact: true }).click();
  await page.locator(`[data-order-id="${order.id}"] .deliver-order`).click();
  await page.waitForFunction(
    () =>
      JSON.parse(document.querySelector("canvas").dataset.deliveryTruck)
        .phase === "loading",
  );
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.waitForFunction(
    () =>
      JSON.parse(document.querySelector("canvas").dataset.deliveryTruck)
        .phase === "departing",
  );
  await page.screenshot({ path: "docs/screenshots/truck-departing.png" });
  const sent = await read(),
    trip = sent.orderBoard.truck;
  assert.equal(sent.coins, before.coins + order.coins);
  for (const product of order.products)
    assert.equal(
      sent.inventory[product.item],
      before.inventory[product.item] - product.amount,
    );
  const next = sent.orderBoard.slots.find((slot) => slot.order).order;
  assert.equal(
    (
      await context.request.post("/api/farm/command", {
        data: { type: "deliver-board-order", orderId: next.id },
      })
    ).status(),
    400,
  );
  await page.waitForFunction(
    () =>
      JSON.parse(document.querySelector("canvas").dataset.deliveryTruck)
        .phase === "away",
    {},
    { timeout: 10000 },
  );
  await page.reload();
  await page.locator('canvas[data-scene="farm"]').waitFor();
  assert.deepEqual((await read()).orderBoard.truck, trip);
  assert.equal((await read()).coins, sent.coins);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForFunction(
    () =>
      JSON.parse(document.querySelector("canvas").dataset.deliveryTruck)
        .phase === "returning",
    {},
    { timeout: 50000 },
  );
  await page.waitForFunction(
    () => {
      const truck = JSON.parse(
        document.querySelector("canvas").dataset.deliveryTruck,
      );
      return truck.phase === "returning" && truck.progress < 0.12;
    },
    {},
    { timeout: 10000 },
  );
  await page.screenshot({ path: "docs/screenshots/truck-returning.png" });
  await page.waitForFunction(
    () =>
      JSON.parse(document.querySelector("canvas").dataset.deliveryTruck)
        .phase === "idle",
    {},
    { timeout: 10000 },
  );
  await page.getByRole("button", { name: "Pedidos", exact: true }).click();
  await page
    .getByText("Caminhão pronto para carregar", { exact: true })
    .waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: truck loading, road departure, server lock, reload persistence, return, single reward and mobile layout.",
  );
} finally {
  await browser.close();
}
