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
    missing = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().includes("/assets/") && r.status() >= 400)
      missing.push(r.url());
  });
  await page.goto(base);
  await page.locator('canvas[data-pasture-version="1"]').waitFor();
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  await page.waitForTimeout(600);
  await mkdir("docs/screenshots", { recursive: true });
  await page.screenshot({ path: "docs/screenshots/pasture-v1-farm.png" });
  const read = async () => (await page.request.get(base + "/api/farm")).json();
  assert.equal((await read()).farm.version, 6);
  assert.equal((await read()).farm.animals.length, 5);
  const close = () =>
    page.getByRole("button", { name: "Fechar", exact: true }).click();
  async function focus(kind, path) {
    await page
      .getByRole("button", { name: "Centralizar fazenda", exact: true })
      .click();
    const [x, y] = kind === "goat" ? [407, 76] : [-30.8, 129.8];
    await page.mouse.move(1000, 480);
    await page.mouse.down();
    await page.mouse.move(1000 + 12 - x, 480 + 310 - y, { steps: 15 });
    await page.mouse.up();
    for (let i = 0; i < 5; i++)
      await page
        .getByRole("button", { name: "Aproximar", exact: true })
        .click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path,
      clip: { x: 420, y: 220, width: 490, height: 330 },
    });
  }
  await focus("goat", "docs/screenshots/goat-v1-idle.png");
  await focus("pig", "docs/screenshots/pig-v1-idle.png");
  await page
    .getByRole("button", { name: "Centralizar fazenda", exact: true })
    .click();
  // Select the new goat in the real world rather than via a test-only control.
  await page.mouse.click(1023, 166);
  await page.getByRole("dialog", { name: "Abrigo das cabras" }).waitFor();
  await page.getByText("Amora", { exact: true }).waitFor();
  assert.equal(await page.locator(".animal-card").count(), 1);
  await page.screenshot({ path: "docs/screenshots/pasture-v1-animals.png" });
  await close();
  async function action(type, trigger) {
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/farm/command") &&
        r.request().method() === "POST" &&
        r.request().postDataJSON().type === type,
    );
    await trigger();
    const r = await response;
    const body = await r.json();
    assert.equal(r.status(), 200, JSON.stringify(body));
    return body;
  }
  await page.getByRole("button", { name: "Loja", exact: true }).click();
  await action("make-feed", () =>
    page.getByRole("button", { name: "Preparar ração", exact: true }).click(),
  );
  await close();
  await page.getByRole("button", { name: "Animais", exact: true }).click();
  let state;
  for (let i = 0; i < 5; i++) {
    state = await action("feed-animal", () =>
      page
        .getByRole("button", { name: "Alimentar", exact: true })
        .first()
        .click(),
    );
    assert.equal(state.farm.inventory.feed, 6 - i);
  }
  assert.ok(state.farm.animals.every((a) => a.fedAt !== null));
  await close();
  await focus("goat", "docs/screenshots/goat-v1-eating.png");
  await focus("pig", "docs/screenshots/pig-v1-foraging.png");
  console.log(
    "PASS: 5 animals, new goat/pig art and enclosures, real world selection, real feed recipe and feeding, no artificial resources.",
  );
  if (!previewOnly) {
    const durations = { cow: 120000, chicken: 60000, goat: 120000, pig: 90000 };
    const deadline = Math.max(
      ...state.farm.animals.map((a) => a.fedAt + durations[a.kind]),
    );
    const remaining = Math.max(0, deadline - state.serverTime + 700);
    console.log(
      "Waiting for real animal production: pig 90 seconds; goat/cow 120 seconds.",
    );
    for (let elapsed = 0; elapsed < remaining; elapsed += 30000)
      await page.waitForTimeout(Math.min(30000, remaining - elapsed));
    await page.getByRole("button", { name: "Animais", exact: true }).click();
    for (let i = 0; i < 5; i++)
      state = await action("collect-animal", () =>
        page
          .getByRole("button", { name: "Recolher", exact: true })
          .first()
          .click(),
      );
    assert.equal(state.farm.inventory.milk, 1);
    assert.equal(state.farm.inventory.egg, 2);
    assert.equal(state.farm.inventory.goatMilk, 1);
    assert.equal(state.farm.inventory.truffle, 1);
    assert.ok(state.farm.animals.every((a) => a.fedAt === null));
    for (const animalId of ["goat-1", "pig-1"]) {
      const duplicate = await page.request.post(base + "/api/farm/command", {
        data: { type: "collect-animal", animalId },
      });
      assert.equal(duplicate.status(), 400);
    }
    await close();
    await page.getByRole("button", { name: "Inventário", exact: true }).click();
    await page.getByText("Leite de cabra", { exact: true }).waitFor();
    await page.getByText("Trufas", { exact: true }).waitFor();
    await page.screenshot({
      path: "docs/screenshots/pasture-v1-inventory.png",
    });
    await close();
    await page.getByRole("button", { name: "Pedidos", exact: true }).click();
    for (let i = 0; i < 6; i++)
      state = await action("deliver-order", () =>
        page
          .getByRole("button", { name: "Entregar pedido", exact: true })
          .click(),
      );
    assert.equal(state.farm.coins, 291);
    assert.equal(state.farm.xp, 60);
    assert.equal(state.farm.inventory.goatMilk, 0);
    assert.equal(state.farm.inventory.truffle, 0);
    await close();
    await page.reload();
    await page.locator('canvas[data-pasture-version="1"]').waitFor();
    state = await read();
    assert.equal(state.farm.animals.length, 5);
    assert.equal(state.farm.coins, 291);
    console.log(
      "PASS: all production collected on real server time, goat milk and truffle saved in barn, duplicate rejected, 6 real orders delivered, reload preserved state.",
    );
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page
    .getByRole("button", { name: "Centralizar fazenda", exact: true })
    .click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "docs/screenshots/pasture-v1-mobile.png" });
  await page.getByRole("button", { name: "Animais", exact: true }).click();
  await page.getByText("Amora", { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "docs/screenshots/pasture-v1-mobile-animals.png",
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(missing, []);
  console.log("PASS: mobile landscape, no JS errors or missing assets.");
} finally {
  await browser.close();
}
