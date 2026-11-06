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
  await page
    .locator(
      'canvas[data-buildings-version="2"][data-barn-stage="1"][data-silo-stage="1"]',
    )
    .waitFor();
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  await page.waitForTimeout(600);
  await mkdir("docs/screenshots", { recursive: true });
  await page.screenshot({ path: "docs/screenshots/storage-stage1-farm.png" });
  // Actual world interaction: select the smaller starter barn.
  await page.mouse.click(398, 260);
  await page.getByRole("dialog", { name: "Do campo ao celeiro" }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Melhorar Celeiro", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Melhorar Silo", exact: true })
      .isDisabled(),
    true,
  );
  await page.screenshot({
    path: "docs/screenshots/storage-stage1-inventory.png",
  });
  const read = async () => (await page.request.get(base + "/api/farm")).json();
  const post = async (data) => {
    const r = await page.request.post(base + "/api/farm/command", { data });
    const body = await r.json();
    assert.equal(r.status(), 200, JSON.stringify(body));
    return body;
  };
  const denied = await page.request.post(base + "/api/farm/command", {
    data: { type: "upgrade-storage", storage: "barn", expectedLevel: 1 },
  });
  assert.equal(denied.status(), 400);
  assert.equal((await read()).farm.coins, 150);
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  if (!previewOnly) {
    let state = await read();
    const ready = state.farm.plots
      .filter((p) => p.crop)
      .map(({ x, y }) => ({ x, y }));
    await post({
      type: "field-stroke",
      action: "harvest",
      crop: "wheat",
      cells: ready,
    });
    await post({ type: "deliver-order", orderId: 0 });
    state = await post({ type: "deliver-order", orderId: 1 });
    assert.equal(state.farm.xp, 30);
    const cells = state.farm.plots.slice(0, 20).map(({ x, y }) => ({ x, y }));
    state = await post({
      type: "field-stroke",
      action: "plant",
      crop: "wheat",
      cells,
    });
    console.log(
      "Real progression: 30 XP earned from starter harvest and two orders. Growing 20 wheat fields for level 2.",
    );
    const remaining = Math.max(
      0,
      state.farm.plots[0].plantedAt + 120000 - state.serverTime + 650,
    );
    for (let elapsed = 0; elapsed < remaining; elapsed += 30000)
      await page.waitForTimeout(Math.min(30000, remaining - elapsed));
    state = await post({
      type: "field-stroke",
      action: "harvest",
      crop: "wheat",
      cells,
    });
    assert.equal(state.farm.xp, 50);
    assert.deepEqual(state.farm.storage, { barn: 1, silo: 1 });
    await page.reload();
    await page.locator('canvas[data-buildings-version="2"]').waitFor();
    await page.getByRole("button", { name: "Inventário", exact: true }).click();
    await page
      .getByRole("button", { name: "Melhorar Celeiro", exact: true })
      .click();
    await page
      .getByText(
        "Armazém melhorado! Mais espaço e uma nova forma para a sua fazenda.",
      )
      .waitFor();
    await page.locator('canvas[data-barn-stage="2"]').waitFor();
    state = await read();
    assert.equal(state.farm.coins, 112);
    assert.equal(state.farm.storage.barn, 2);
    assert.equal(
      await page
        .locator(".storage-card")
        .filter({ hasText: "Celeiro" })
        .locator("progress")
        .getAttribute("max"),
      "150",
    );
    await page
      .getByRole("button", { name: "Melhorar Silo", exact: true })
      .click();
    await page.locator('canvas[data-silo-stage="2"]').waitFor();
    state = await read();
    assert.equal(state.farm.coins, 37);
    assert.deepEqual(state.farm.storage, { barn: 2, silo: 2 });
    assert.equal(
      await page
        .locator(".storage-card")
        .filter({ hasText: "Silo" })
        .locator("progress")
        .getAttribute("max"),
      "150",
    );
    const duplicate = await page.request.post(base + "/api/farm/command", {
      data: { type: "upgrade-storage", storage: "barn", expectedLevel: 1 },
    });
    assert.equal(duplicate.status(), 400);
    assert.equal((await read()).farm.coins, 37);
    await page.screenshot({
      path: "docs/screenshots/storage-stage2-inventory.png",
    });
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    await page.screenshot({ path: "docs/screenshots/storage-stage2-farm.png" });
    await page.reload();
    await page
      .locator('canvas[data-barn-stage="2"][data-silo-stage="2"]')
      .waitFor();
    assert.deepEqual((await read()).farm.storage, { barn: 2, silo: 2 });
    console.log(
      "PASS: earned level 2 through real timed crops, UI paid upgrades, both capacities 150, both world shapes changed, duplicate blocked, state survives reload.",
    );
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page
    .getByRole("button", { name: "Centralizar fazenda", exact: true })
    .click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: previewOnly
      ? "docs/screenshots/storage-stage1-mobile.png"
      : "docs/screenshots/storage-stage2-mobile.png",
  });
  await page.getByRole("button", { name: "Inventário", exact: true }).click();
  await page.screenshot({
    path: previewOnly
      ? "docs/screenshots/storage-stage1-mobile-inventory.png"
      : "docs/screenshots/storage-stage2-mobile-inventory.png",
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(missing, []);
  console.log(
    "PASS: smaller separated buildings, starter shapes, level gate, world click, responsive inventory, no JS errors or missing art.",
  );
} finally {
  await browser.close();
}
