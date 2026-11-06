// Isolated, valid high-level save. All UI actions below use the real API and transaction layer.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { initialFarm, applyCommand } from "../server/services/farm.ts";
import { items, crops, animalProducts } from "../src/types/game.ts";
import {
  machineIds,
  machineKinds,
  machineRect,
  recipes,
} from "../src/data/production.ts";
import { fruitRect, fruitSpecies } from "../src/types/orchard.ts";
import { occupancyIssue } from "../src/data/land.ts";

const path = resolve(".data/production-visual-" + Date.now() + ".json"),
  token = randomBytes(32).toString("hex");
const port = 3199,
  base = "http://localhost:" + port;
const now = Date.now();
let farm = initialFarm({ planted: false });
farm.xp = 1500;
farm.coins = 10000;
farm.obstacles = [];
for (const id of Object.keys(items)) farm.inventory[id] = 0;
Object.assign(farm.inventory, {
  wheat: 20,
  corn: 16,
  carrot: 10,
  soybean: 10,
  sugarcane: 10,
  strawberry: 8,
  potato: 8,
  milk: 8,
  egg: 8,
  goatMilk: 6,
  bacon: 4,
  butter: 2,
  cream: 2,
  apple: 6,
  cocoa: 3,
  orange: 4,
  mango: 2,
  whiteSugar: 1,
  chickenFeed: 2,
});
const free = (rect) => {
  for (let x = 0; x < 22; x++)
    for (let y = 0; y < 21; y++)
      if (!occupancyIssue(farm, rect({ x, y }))) return { x, y };
  throw new Error("No free space");
};
const preferred = {
  bakery: { x: 9, y: 1 },
  dairy: { x: 9, y: 3 },
  cakery: { x: 7, y: -1 },
  sugarMill: { x: 1, y: 16 },
  popcorn: { x: 3, y: 16 },
  grill: { x: 17, y: 9 },
  juicer: { x: 19, y: 9 },
  iceCream: { x: 19, y: 14 },
};
for (const kind of machineIds.filter((kind) => kind !== "feedMill")) {
  const p = preferred[kind];
  const cell = occupancyIssue(farm, machineRect(p)) ? free(machineRect) : p;
  farm = applyCommand(
    farm,
    { type: "buy-machine", kind, ...cell },
    now - 3600000,
  );
  const machine = farm.machines.at(-1);
  const recipeId = Object.keys(recipes).find(
    (id) => recipes[id].machine === kind,
  );
  const start =
    kind === "bakery"
      ? now - recipes[recipeId].minutes * 60000 + 15000
      : now - recipes[recipeId].minutes * 30000;
  farm = applyCommand(
    farm,
    {
      type: "enqueue-production",
      machineId: machine.id,
      recipeId,
      expectedRevision: farm.revision,
    },
    start,
  );
}
farm = applyCommand(
  farm,
  {
    type: "animal-batch",
    action: "feed",
    animalIds: ["chicken-1", "chicken-2"],
  },
  now - animalProducts.chicken.duration + 5000,
);
for (const [crop, x] of [
  ["strawberry", 7],
  ["potato", 8],
]) {
  farm = applyCommand(
    farm,
    { type: "plant", crop, x, y: 7 },
    now - crops[crop].duration - 1000,
  );
}
farm = applyCommand(
  farm,
  { type: "buy-sheep", ...free(({ x, y }) => ({ x, y, w: 3, h: 3 })) },
  now - 3600000,
);
farm = applyCommand(
  farm,
  { type: "plant-fruit-tree", species: "cocoa", ...free(fruitRect) },
  now - fruitSpecies.cocoa.duration - fruitSpecies.cocoa.growth - 1000,
);
await mkdir(".data", { recursive: true });
await mkdir("docs/screenshots", { recursive: true });
await writeFile(
  path,
  JSON.stringify({
    [createHash("sha256").update(token).digest("hex")]: {
      farm,
      expires: now + 3600000,
    },
  }),
);
let api, browser;
const startAPI = async () => {
  api = spawn(process.execPath, ["--import", "tsx", "server/api/index.ts"], {
    env: {
      ...process.env,
      PORT: String(port),
      FARM_SAVE_PATH: path,
      DATABASE_URL: "",
      NODE_ENV: "development",
    },
    windowsHide: true,
    stdio: "pipe",
  });
  await new Promise((done, fail) => {
    api.stdout.on("data", (d) => {
      if (String(d).includes(String(port))) done();
    });
    api.on("error", fail);
    api.on("exit", (code) => fail(new Error("API exited " + code)));
  });
};
const stopAPI = async () => {
  if (!api || api.exitCode !== null) return;
  api.kill();
  await new Promise((done) => api.once("exit", done));
};
try {
  await startAPI();
  browser = await chromium.launch({
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const context = await browser.newContext({
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
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().includes("/assets/") && r.status() >= 400)
      missing.push(r.url());
  });
  await page.route("**/api/**", async (route) => {
    const response = await route.fetch({
      url: route.request().url().replace("http://localhost:5173", base),
    });
    await route.fulfill({ response });
  });
  const read = async () =>
    (await (await context.request.get(base + "/api/farm")).json()).farm;
  const post = async (data) =>
    context.request.post(base + "/api/farm/command", { data });
  const point = (x, y) => ({
    x: 640 + 44 * (x - y) - 12,
    y: 400 + 22 * (x + y) - 310,
  });
  const close = async () =>
    page.getByRole("button", { name: "Fechar", exact: true }).click();
  const openShop = async () => {
    await page.getByRole("button", { name: "Loja", exact: true }).click();
    await page.getByRole("button", { name: "Fábricas", exact: true }).click();
  };
  await page.goto("http://localhost:5173");
  await page.locator('canvas[data-scene="farm"]').waitFor();
  await page.waitForFunction(
    () => Number(document.querySelector("canvas")?.dataset.machineCount) === 8,
  );
  await openShop();
  await page.screenshot({ path: "docs/screenshots/production-v1-shop.png" });
  await page
    .getByRole("button", { name: "Comprar Fábrica de ração", exact: true })
    .click();
  const cell = { x: 1, y: 10 };
  assert.equal(occupancyIssue(await read(), machineRect(cell)), null);
  const p = point(cell.x, cell.y);
  await page.mouse.move(p.x, p.y);
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.purchasePreview === "ready",
  );
  await page.screenshot({
    path: "docs/screenshots/production-v1-placement.png",
  });
  await page.mouse.click(p.x, p.y);
  await page.getByRole("button", { name: "Construir", exact: true }).click();
  await page.waitForFunction(
    async () =>
      (await (await fetch("/api/farm")).json()).farm.machines.length === 9,
  );
  await page.waitForFunction(
    () => Number(document.querySelector("canvas")?.dataset.machineCount) === 9,
  );
  farm = await read();
  const mill = farm.machines.find((m) => m.kind === "feedMill");
  const before = structuredClone(farm);
  await page.mouse.click(p.x, p.y - 30);
  await page
    .getByRole("dialog", { name: "Fábrica de ração", exact: true })
    .waitFor();
  const craft = page.getByRole("button", {
    name: "Fabricar Ração de galinha",
    exact: true,
  });
  await craft.click();
  await page.waitForFunction(
    async () =>
      (await (await fetch("/api/farm")).json()).farm.machines.find(
        (m) => m.kind === "feedMill",
      ).jobs.length === 1,
  );
  await craft.click();
  await page.waitForFunction(
    async () =>
      (await (await fetch("/api/farm")).json()).farm.machines.find(
        (m) => m.kind === "feedMill",
      ).jobs.length === 2,
  );
  await page.waitForTimeout(150);
  assert.ok(await craft.isDisabled());
  const queued = await read(),
    jobs = queued.machines.find((m) => m.id === mill.id).jobs;
  assert.equal(jobs[1].startedAt, jobs[0].readyAt);
  assert.equal(queued.inventory.corn, before.inventory.corn - 4);
  assert.equal(queued.inventory.wheat, before.inventory.wheat - 2);
  const duplicate = await post({
    type: "enqueue-production",
    machineId: mill.id,
    recipeId: "chickenFeed",
    expectedRevision: before.revision,
  });
  assert.equal(duplicate.status(), 400);
  await page
    .getByRole("button", { name: "+ Espaço · 30 moedas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Receita Ração de vaca", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Fabricar Ração de vaca", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cancelar Ração de vaca", exact: true })
    .click();
  await page.waitForFunction(
    async () =>
      (await (await fetch("/api/farm")).json()).farm.machines.find(
        (m) => m.kind === "feedMill",
      ).jobs.length === 2,
  );
  assert.equal((await read()).inventory.soybean, queued.inventory.soybean);
  await page.screenshot({
    path: "docs/screenshots/production-v1-feed-queue.png",
  });
  await close();
  await openShop();
  await page
    .getByRole("button", { name: "Detalhes de Padaria", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Abrir Padaria", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Coletar Pão", exact: true })
    .waitFor({ timeout: 25000 });
  const breadBefore = await read(),
    bakery = breadBefore.machines.find((m) => m.kind === "bakery"),
    oldJob = bakery.jobs[0];
  await page.screenshot({ path: "docs/screenshots/production-v1-ready.png" });
  await page.getByRole("button", { name: "Coletar Pão", exact: true }).click();
  await page.waitForFunction(
    async () =>
      (await (await fetch("/api/farm")).json()).farm.inventory.bread === 1,
  );
  assert.equal(
    (
      await post({
        type: "collect-production",
        machineId: bakery.id,
        jobId: oldJob.id,
      })
    ).status(),
    400,
  );
  // Simulate a response lost after the real server committed a recipe. The UI refreshes without reposting.
  await page.route(
    "**/api/farm/command",
    async (route) => {
      await route.fetch({ url: base + "/api/farm/command" });
      await route.abort("failed");
    },
    { times: 1 },
  );
  const wheatBefore = (await read()).inventory.wheat;
  await page.getByRole("button", { name: "Fabricar Pão", exact: true }).click();
  await page.waitForFunction(
    async () =>
      (await (await fetch("/api/farm")).json()).farm.machines.find(
        (m) => m.kind === "bakery",
      ).jobs.length === 1,
  );
  await page.waitForTimeout(500);
  assert.equal((await read()).inventory.wheat, wheatBefore - 3);
  assert.equal(await page.locator(".production-queue article").count(), 1);
  await close();
  await page.getByRole("button", { name: "Inventário", exact: true }).click();
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() =>
      document.activeElement?.getAttribute("aria-label"),
    ),
    "Fechar",
  );
  await page.keyboard.press("Shift+Tab");
  assert.ok(
    await page.evaluate(
      () => document.activeElement?.closest('[role="dialog"]') !== null,
    ),
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  await page.getByRole("button", { name: "Inventário", exact: true }).click();
  await page.getByRole("button", { name: "Celeiro", exact: true }).click();
  await page.locator(".game-item-card").filter({ hasText: "Pão" }).click();
  const coins = (await read()).coins;
  await page.getByRole("button", { name: "Vender Pão", exact: true }).click();
  await page.waitForFunction(
    async () =>
      (await (await fetch("/api/farm")).json()).farm.inventory.bread === 0,
  );
  assert.equal((await read()).coins, coins + items.bread.sellPrice);
  await page.screenshot({
    path: "docs/screenshots/production-v1-inventory.png",
  });
  await page.getByRole("button", { name: "Melhorar", exact: true }).click();
  assert.equal(await page.locator(".storage-card").count(), 1);
  assert.equal(await page.locator(".storage-evolution").isVisible(), false);
  await page
    .getByRole("button", { name: "Voltar aos produtos", exact: true })
    .click();
  await page.getByRole("button", { name: "Silo", exact: true }).click();
  assert.equal(await page.locator(".storage-product-detail").count(), 0);
  await page.setViewportSize({ width: 960, height: 540 });
  await page.waitForTimeout(200);
  const inventoryBox = await page.locator(".modal-inventory").boundingBox();
  assert.ok(inventoryBox.x >= 0 && inventoryBox.y >= 0);
  assert.ok(inventoryBox.x + inventoryBox.width <= 961);
  assert.ok(inventoryBox.y + inventoryBox.height <= 541);
  assert.ok((await page.locator(".game-item-card").count()) >= 5);
  await page.screenshot({ path: "docs/screenshots/ui-storage-landscape.png" });
  await page.setViewportSize({ width: 1280, height: 800 });
  await close();
  await page.getByRole("button", { name: "Mais opções", exact: true }).click();
  await page.getByRole("button", { name: "Animais", exact: true }).click();
  assert.equal(await page.locator(".animal-card").count(), 2);
  await page.getByRole("button", { name: "Chiqueiro", exact: true }).click();
  assert.equal(await page.locator(".animal-card").count(), 1);
  await page.getByRole("button", { name: "Galinheiro", exact: true }).click();
  const eggs = (await read()).inventory.egg;
  await page
    .getByRole("button", { name: "Coletar 2 produtos", exact: true })
    .click();
  await page.waitForFunction(
    async ({ eggs }) =>
      (await (await fetch("/api/farm")).json()).farm.inventory.egg === eggs + 2,
    { eggs },
  );
  await close();
  await page.getByRole("button", { name: "Loja", exact: true }).click();
  await page.getByRole("button", { name: "Suprimentos", exact: true }).click();
  await page
    .getByRole("button", { name: "Detalhes de Ração de galinha", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Comprar Ração de galinha", exact: true })
    .click();
  await close();
  await page.getByRole("button", { name: "Mais opções", exact: true }).click();
  await page.getByRole("button", { name: "Animais", exact: true }).click();
  await page
    .getByRole("button", { name: "Alimentar 2 animais", exact: true })
    .click();
  await page.waitForFunction(
    async () =>
      (await (await fetch("/api/farm")).json()).farm.inventory.chickenFeed ===
      1,
  );
  farm = await read();
  for (const hen of farm.animals.filter((a) => a.kind === "chicken"))
    assert.equal(hen.production.readyAt - hen.fedAt, 1200000);
  await page.screenshot({ path: "docs/screenshots/production-v1-animals.png" });
  await close();
  // Move a live machine by the established hold gesture; the queue/timestamps must survive.
  const millJobs = structuredClone(
    farm.machines.find((m) => m.id === mill.id).jobs,
  );
  const fromCell = {
    x: Math.round((p.x - 640 + 12) / 88 + (p.y - 30 - 400 + 310) / 44),
    y: Math.round((p.y - 30 - 400 + 310) / 44 - (p.x - 640 + 12) / 88),
  };
  let destination;
  for (let x = 0; x < 22 && !destination; x++)
    for (let y = 0; y < 21 && !destination; y++) {
      const drop = point(x + fromCell.x - cell.x, y + fromCell.y - cell.y);
      if (
        Math.abs(x - cell.x) + Math.abs(y - cell.y) >= 3 &&
        drop.x > 280 &&
        drop.x < 1150 &&
        drop.y > 180 &&
        drop.y < 660 &&
        !occupancyIssue(farm, machineRect({ x, y }), undefined, {
          kind: "moveMachine",
          machineId: mill.id,
        })
      )
        destination = { x, y };
    }
  assert.ok(destination, "visible free machine destination");
  await page.mouse.move(p.x, p.y - 30);
  await page.mouse.down();
  await page.waitForTimeout(1350);
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.holdMove === "active",
  );
  const drop = point(
    destination.x + fromCell.x - cell.x,
    destination.y + fromCell.y - cell.y,
  );
  await page.mouse.move(drop.x, drop.y, { steps: 14 });
  await page.mouse.up();
  await page.waitForFunction(
    async ({ id, x, y }) => {
      const m = (await (await fetch("/api/farm")).json()).farm.machines.find(
        (m) => m.id === id,
      );
      return m.x === x && m.y === y;
    },
    { id: mill.id, ...destination },
  );
  farm = await read();
  assert.deepEqual(farm.machines.find((m) => m.id === mill.id).jobs, millJobs);
  // A completely fresh API process must restore all production and cookie ownership.
  await page.goto("about:blank");
  await stopAPI();
  await startAPI();
  await page.goto("http://localhost:5173");
  await page.locator('canvas[data-scene="farm"]').waitFor();
  await page.waitForFunction(
    () => Number(document.querySelector("canvas")?.dataset.machineCount) === 9,
  );
  assert.deepEqual((await read()).machines, farm.machines);
  assert.deepEqual((await read()).inventory, farm.inventory);
  await page.evaluate(() => {
    Date.now = () => 9999999999999;
  });
  assert.equal(
    (
      await post({
        type: "collect-production",
        machineId: mill.id,
        jobId: millJobs[0].id,
      })
    ).status(),
    400,
  );
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Afastar", exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "docs/screenshots/production-v1-farm.png" });
  await page.setViewportSize({ width: 960, height: 540 });
  await page.reload();
  await page.locator('canvas[data-scene="farm"]').waitFor();
  await page.waitForTimeout(500);
  await openShop();
  await page
    .getByRole("button", { name: "Abrir Fábrica de ração", exact: true })
    .click();
  await page.screenshot({ path: "docs/screenshots/production-v1-mobile.png" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  const images = await page.locator("img").evaluateAll(async (images) =>
    Promise.all(
      images
        .filter((i) => i.getBoundingClientRect().width > 0)
        .map(async (image) => {
          await image.decode();
          return image.naturalWidth > 0;
        }),
    ),
  );
  assert.ok(images.every(Boolean));
  await close();
  const checkPanel = async () => {
    const box = await page.getByRole("dialog").boundingBox();
    const viewport = page.viewportSize();
    assert.ok(
      box &&
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= viewport.width + 1 &&
        box.y + box.height <= viewport.height + 1,
      "dialog fits viewport",
    );
    assert.equal(
      await page
        .getByRole("dialog")
        .evaluate((el) => el.scrollWidth > el.clientWidth + 1),
      false,
      "no horizontal modal overflow",
    );
    const closeBox = await page
      .getByRole("button", { name: "Fechar", exact: true })
      .boundingBox();
    assert.ok(
      closeBox.y >= box.y && closeBox.y + closeBox.height <= box.y + box.height,
      "close stays inside panel",
    );
  };
  for (const [width, height] of [
    [1280, 800],
    [960, 540],
    [844, 390],
    [640, 360],
    [1024, 768],
  ]) {
    await page.setViewportSize({ width, height });
    await page.getByRole("button", { name: "Loja", exact: true }).click();
    for (const category of [
      "Agricultura",
      "Animais",
      "Fábricas",
      "Árvores",
      "Decorações",
      "Armazenamento",
      "Suprimentos",
    ]) {
      await page.getByRole("button", { name: category, exact: true }).click();
      await checkPanel();
      const action = page.locator(".catalog-action button");
      const actionBox = await action.boundingBox();
      assert.ok(
        actionBox.y >= 0 && actionBox.y + actionBox.height <= height,
        "purchase action visible",
      );
      assert.equal(
        await page.locator(".building-card-art img").evaluateAll((images) =>
          images.every((img) => {
            const box = img.getBoundingClientRect(),
              parent = img.parentElement.getBoundingClientRect();
            return (
              box.height <= parent.height + 1 && box.width <= parent.width + 1
            );
          }),
        ),
        true,
        "building illustrations stay inside cards",
      );
      if (width === 1280)
        await page.screenshot({
          path: `docs/screenshots/ui-${category
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()}-desktop.png`,
        });
    }
    await page.getByRole("button", { name: "Fábricas", exact: true }).click();
    await page
      .getByRole("button", {
        name: "Detalhes de Fábrica de ração",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Abrir Fábrica de ração", exact: true })
      .click();
    await checkPanel();
    const manufactureBox = await page
      .getByRole("button", { name: "Fabricar Ração de galinha", exact: true })
      .boundingBox();
    assert.ok(
      manufactureBox.y >= 0 &&
        manufactureBox.y + manufactureBox.height <= height,
      "manufacture visible on small screens",
    );
    const upgradeBox = await page
      .locator(".machine-footer button")
      .boundingBox();
    assert.ok(
      upgradeBox.y >= 0 && upgradeBox.y + upgradeBox.height <= height,
      "queue upgrade remains visible",
    );
    await page.getByRole("button", { name: "Maestria", exact: true }).click();
    await page.getByRole("heading", { name: "Maestria · Aprendiz" }).waitFor();
    await checkPanel();
    await page.getByRole("button", { name: "Produção", exact: true }).click();
    if (width === 640)
      await page.screenshot({
        path: "docs/screenshots/ui-factory-small-landscape.png",
      });
    await close();
    await page
      .getByRole("button", { name: "Mais opções", exact: true })
      .click();
    await page.getByRole("button", { name: "Animais", exact: true }).click();
    await checkPanel();
    if (width === 1280)
      await page.screenshot({
        path: "docs/screenshots/ui-animals-desktop.png",
      });
    await close();
    await page.getByRole("button", { name: "Pedidos", exact: true }).click();
    await checkPanel();
    await page
      .getByRole("button", { name: "Ver detalhes do pedido", exact: true })
      .click();
    await page
      .getByRole("progressbar", { name: "Produtos separados" })
      .waitFor();
    if (width === 1280)
      await page.screenshot({ path: "docs/screenshots/ui-orders-desktop.png" });
    await close();
    await page.getByRole("button", { name: "Inventário", exact: true }).click();
    for (const storage of ["Silo", "Celeiro"]) {
      await page.getByRole("button", { name: storage, exact: true }).click();
      await page.locator(".game-item-card").first().click();
      await checkPanel();
      const sale = page.locator(".storage-product-detail .primary");
      if (await sale.count()) {
        const saleBox = await sale.boundingBox();
        assert.ok(
          saleBox.y >= 0 && saleBox.y + saleBox.height <= height,
          "sale visible inside viewport",
        );
      }
      await page.getByRole("button", { name: "Melhorar", exact: true }).click();
      await checkPanel();
      assert.equal(await page.locator(".storage-card").count(), 1);
      await page
        .getByRole("button", { name: "Voltar aos produtos", exact: true })
        .click();
    }
    await close();
  }
  const beforeOrder = await read();
  await page.getByRole("button", { name: "Pedidos", exact: true }).click();
  await page
    .getByRole("button", { name: "Entregar pedido", exact: true })
    .click();
  await page.waitForFunction(
    async (expected) =>
      (await (await fetch("/api/farm")).json()).farm.ordersCompleted ===
      expected,
    beforeOrder.ordersCompleted + 1,
  );
  assert.equal((await read()).inventory.wheat, beforeOrder.inventory.wheat - 4);
  assert.equal((await read()).coins, beforeOrder.coins + 16);
  await close();
  assert.deepEqual(errors, []);
  assert.deepEqual(missing, []);
  console.log(
    "PASS: real purchase, queue, cancellation, slot upgrade, collection, sale, animal batches, real order, lost response recovery, hold-move, API restart and device-clock rejection; seven catalog categories, mastery and panels at five viewport sizes including 640x360. Isolated test save.",
  );
} catch (error) {
  const lastPage = browser?.contexts()[0]?.pages().at(-1);
  await lastPage
    ?.screenshot({ path: "docs/screenshots/ui-regression-failure.png" })
    .catch(() => {});
  throw error;
} finally {
  if (browser) await browser.close();
  await stopAPI();
  await unlink(path).catch(() => {});
}
