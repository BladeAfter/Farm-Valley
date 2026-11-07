// Real API/UI with an isolated, high-level QA save; never edits a player's save.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { initialFarm, applyCommand } from "../server/services/farm.ts";
import { synchronizeOrders } from "../server/services/orders.ts";
import { occupancyIssue } from "../src/data/land.ts";
import { machineIds, machineRect, recipes } from "../src/data/production.ts";
import { items } from "../src/types/game.ts";
import { orderRules, customers, customerImage } from "../src/types/orders.ts";

const port = 3202,
  base = `http://localhost:${port}`,
  frontend = "http://localhost:5173";
const path = resolve(`.data/orders-visual-${Date.now()}.json`),
  token = randomBytes(32).toString("hex"),
  hash = createHash("sha256").update(token).digest("hex");
let farm = initialFarm({ planted: false });
farm.xp = 1500;
farm.coins = 50000;
farm.obstacles = [];
farm.storage = { barn: 3, silo: 3 };
for (const item of Object.keys(items)) farm.inventory[item] = 2;
for (const item of [
  "wheat",
  "corn",
  "carrot",
  "soybean",
  "sugarcane",
  "strawberry",
  "potato",
])
  farm.inventory[item] = 12;
for (const kind of machineIds) {
  let cell;
  for (let x = 0; x < 22 && !cell; x++)
    for (let y = 0; y < 21 && !cell; y++)
      if (!occupancyIssue(farm, machineRect({ x, y }))) cell = { x, y };
  assert.ok(cell);
  farm = applyCommand(farm, { type: "buy-machine", kind, ...cell });
}
// Pick a real generator seed displaying all six original customer portraits for visual coverage.
for (let seed = 1; seed < 3000; seed++) {
  farm.landSeed = seed;
  delete farm.orderBoard;
  farm = synchronizeOrders(farm);
  if (
    new Set(farm.orderBoard.slots.map((slot) => slot.order.customer)).size === 6
  )
    break;
}
const missingOrder = farm.orderBoard.slots[1].order;
farm.inventory[missingOrder.products[0].item] = 0;
farm.inventory.wheat = 20;
await mkdir(".data", { recursive: true });
await mkdir("docs/screenshots", { recursive: true });
await writeFile(
  path,
  JSON.stringify({ [hash]: { farm, expires: Date.now() + 3600000 } }),
);
let api, browser;
async function start() {
  api = spawn(process.execPath, ["--import", "tsx", "server/api/index.ts"], {
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: "",
      FARM_SAVE_PATH: path,
      NODE_ENV: "development",
    },
    windowsHide: true,
    stdio: "pipe",
  });
  await new Promise((done, fail) => {
    api.stdout.on(
      "data",
      (data) => String(data).includes(String(port)) && done(),
    );
    api.on("error", fail);
    api.on("exit", (code) => fail(new Error("API exited " + code)));
  });
}
async function stop() {
  if (api && api.exitCode === null) {
    api.kill();
    await new Promise((done) => api.once("exit", done));
  }
}
try {
  await start();
  browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({ locale: "pt-BR",
    viewport: { width: 1280, height: 800 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  await context.addCookies([
    {
      name: "fv_session",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  const page = await context.newPage(),
    errors = [],
    missing = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().includes("/assets/") && response.status() >= 400)
      missing.push(response.url());
  });
  await page.route("**/api/**", async (route) => {
    const response = await route.fetch({
      url: route.request().url().replace(frontend, base),
    });
    await route.fulfill({ response });
  });
  const read = async () =>
    (await (await context.request.get(base + "/api/farm")).json()).farm;
  const post = (data) =>
    context.request.post(base + "/api/farm/command", { data });
  const close = () =>
    page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.goto(frontend);
  await page.locator('canvas[data-scene="farm"]').waitFor();
  await page
    .getByRole("button", { name: "Centralizar fazenda", exact: true })
    .click();
  await page.waitForFunction(
    () => !!document.querySelector("canvas")?.dataset.orderBoardPosition,
  );
  const position = (await read()).orderBoard.position;
  const boardPoint = {
    x: 640 + 44 * (position.x - position.y) - 12,
    y: 400 + 22 * (position.x + position.y) - 310 - 20,
  };
  await page.touchscreen.tap(boardPoint.x, boardPoint.y);
  await page
    .getByRole("dialog", { name: "Encomendas da vila", exact: true })
    .waitFor();
  assert.equal(await page.locator(".village-order-card").count(), 6);
  assert.ok((await page.locator(".order-goods .missing").count()) > 0);
  assert.equal(
    await page
      .locator(`[data-order-id="${missingOrder.id}"] .deliver-order`)
      .isDisabled(),
    true,
  );
  for (const id of Object.keys(customers)) {
    assert.equal(
      await page.evaluate(
        (src) =>
          new Promise((resolve) => {
            const image = new Image();
            image.onload = () => resolve(image.naturalWidth > 0);
            image.onerror = () => resolve(false);
            image.src = src;
          }),
        customerImage(id),
      ),
      true,
    );
  }
  await page.screenshot({ path: "docs/screenshots/orders-board-desktop.png" });
  await page.getByRole("button", { name: "Prontas", exact: true }).click();
  assert.equal(await page.locator(".order-goods .missing").count(), 0);
  await page.getByRole("button", { name: "Todas", exact: true }).click();
  const machineOrder = (await read()).orderBoard.slots.find((slot) =>
    slot.order.products.some((p) => recipes[p.item]),
  );
  assert.ok(machineOrder);
  const machineProduct = machineOrder.order.products.find(
    (p) => recipes[p.item],
  );
  await page
    .locator(`[data-order-id="${machineOrder.order.id}"] .order-goods button`)
    .filter({ hasText: items[machineProduct.item].name })
    .click();
  await page.getByRole("button", { name: "Visitar", exact: true }).click();
  await page.locator(".factory-panel").waitFor();
  await close();
  await page.getByRole("button", { name: "Pedidos", exact: true }).click();
  const before = await read(),
    first = before.orderBoard.slots[0].order;
  await page.locator(`[data-order-id="${first.id}"] .deliver-order`).click();
  await page.waitForFunction(
    async (count) =>
      (await (await fetch("/api/farm")).json()).farm.ordersCompleted === count,
    before.ordersCompleted + 1,
  );
  const after = await read();
  assert.equal(after.coins, before.coins + first.coins);
  assert.equal(after.xp, before.xp + first.xp);
  for (const p of first.products)
    assert.equal(after.inventory[p.item], before.inventory[p.item] - p.amount);
  assert.equal(
    (await post({ type: "deliver-board-order", orderId: first.id })).status(),
    400,
  );
  await page.locator(".order-thanks").waitFor();
  await page.locator(".village-order-slot").waitFor();
  const refillAt = after.orderBoard.slots[0].refillAt;
  assert.ok(
    refillAt > Date.now() &&
      refillAt <= Date.now() + orderRules.deliveryDelayMs,
  );
  await page.screenshot({
    path: "docs/screenshots/orders-board-delivered.png",
  });
  // A discarded card has a longer authoritative wait and never changes stock or rewards.
  const discardBefore = await read(),
    discardOrder = discardBefore.orderBoard.slots[1].order;
  await page
    .locator(`[data-order-id="${discardOrder.id}"] .discard-order`)
    .click();
  await page.waitForFunction(
    async (id) =>
      !(await (await fetch("/api/farm")).json()).farm.orderBoard.slots.some(
        (slot) => slot.order?.id === id,
      ),
    discardOrder.id,
  );
  const discarded = await read();
  assert.deepEqual(discarded.inventory, discardBefore.inventory);
  assert.equal(discarded.coins, discardBefore.coins);
  assert.equal(discarded.xp, discardBefore.xp);
  assert.ok(
    discarded.orderBoard.slots[1].refillAt >=
      Date.now() + orderRules.discardDelayMs - 5000,
  );
  assert.equal(
    (await post({ type: "discard-order", orderId: discardOrder.id })).status(),
    400,
  );
  await close();
  for (const [width, height] of [
    [1280, 800],
    [960, 540],
    [844, 390],
    [640, 360],
    [1024, 768],
  ]) {
    await page.setViewportSize({ width, height });
    await page.getByRole("button", { name: "Pedidos", exact: true }).click();
    const panel = page.getByRole("dialog"),
      box = await panel.boundingBox();
    assert.ok(
      box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= width + 1 &&
        box.y + box.height <= height + 1,
    );
    assert.equal(
      await panel.evaluate((el) => el.scrollWidth > el.clientWidth + 1),
      false,
    );
    assert.equal(
      await page
        .locator(".game-modal-body")
        .evaluate((el) => el.scrollHeight > el.clientHeight + 1),
      false,
      "only order list scrolls",
    );
    await page
      .locator(".village-order-card")
      .last()
      .locator(".deliver-order")
      .scrollIntoViewIfNeeded();
    const lastAction = await page
      .locator(".village-order-card")
      .last()
      .locator(".deliver-order")
      .boundingBox();
    assert.ok(
      lastAction.y >= box.y &&
        lastAction.y + lastAction.height <= box.y + box.height,
    );
    if (width === 640)
      await page.screenshot({
        path: "docs/screenshots/orders-board-small-landscape.png",
      });
    await close();
  }
  // Simulate reconnect after a real saved deadline: only the QA file is adjusted with the API stopped.
  await page.goto("about:blank");
  await stop();
  const entries = JSON.parse(await readFile(path, "utf8"));
  entries[hash].farm.orderBoard.slots[0].refillAt = Date.now() + 1600;
  await writeFile(path, JSON.stringify(entries));
  await start();
  await page.goto(frontend);
  await page.locator('canvas[data-scene="farm"]').waitFor();
  await page.getByRole("button", { name: "Pedidos", exact: true }).click();
  await page.waitForFunction(
    async () =>
      !!(await (await fetch("/api/farm")).json()).farm.orderBoard.slots[0]
        .order,
  );
  await page.waitForFunction(
    () => document.querySelectorAll(".village-order-card").length === 5,
  );
  const restored = await read();
  assert.notEqual(restored.orderBoard.slots[0].order.id, first.id);
  assert.equal(restored.coins, discarded.coins);
  assert.deepEqual(restored.inventory, discarded.inventory);
  assert.equal(restored.orderBoard.slots[1].order, null);
  assert.deepEqual(errors, []);
  assert.deepEqual(missing, []);
  console.log(
    "PASS: six real orders/customers, physical-board touch, product source, filtering, atomic delivery, duplicate rejection, discard wait, restart/refill and five viewport sizes. Isolated QA save.",
  );
} catch (error) {
  await browser
    ?.contexts()[0]
    ?.pages()
    .at(-1)
    ?.screenshot({ path: "docs/screenshots/orders-board-failure.png" })
    .catch(() => {});
  throw error;
} finally {
  if (browser) await browser.close();
  await stop();
  await unlink(path).catch(() => {});
}
