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
    viewport: { width: 1280, height: 800 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().includes("/assets/") && r.status() >= 400) errors.push(r.url());
  });
  await page.goto(base);
  await page.locator('canvas[data-pens-version="1"]').waitFor();
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  const read = async () => (await page.request.get(base + "/api/farm")).json();
  const initial = await read();
  await mkdir("docs/screenshots", { recursive: true });
  await page.screenshot({ path: "docs/screenshots/pens-v1-farm.png" });
  for (const [kind, x, y, title, count] of [
    ["chicken", 0.5, -3.2, "Galinheiro", 2],
    ["goat", 10, 0, "Abrigo das cabras", 1],
    ["pig", 0.5, 1.2, "Chiqueiro", 1],
    ["cow", 13, 5.7, "Estábulo", 1],
  ]) {
    await page
      .getByRole("button", { name: "Centralizar fazenda", exact: true })
      .click();
    const wx = (x - y) * 44,
      wy = (x + y + 3) * 22;
    await page.mouse.move(1000, 480);
    await page.mouse.down();
    await page.mouse.move(1000 + 12 - wx, 480 + 310 - wy, { steps: 15 });
    await page.mouse.up();
    for (let i = 0; i < 4; i++)
      await page
        .getByRole("button", { name: "Aproximar", exact: true })
        .click();
    await page.waitForTimeout(350);
    await page.screenshot({
      path: `docs/screenshots/pen-${kind}-v1.png`,
      clip: { x: 385, y: 205, width: 510, height: 360 },
    });
    await page.mouse.click(640, 400);
    const dialog = page.getByRole("dialog", { name: title, exact: true });
    await dialog.waitFor();
    assert.equal(await dialog.locator(".animal-card").count(), count);
    await page.screenshot({ path: `docs/screenshots/pen-${kind}-panel.png` });
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
  }
  assert.deepEqual(
    (await read()).farm,
    initial.farm,
    "viewing pens must not mutate saved data",
  );
  await page.reload();
  await page.locator('canvas[data-pens-version="1"]').waitFor();
  assert.deepEqual((await read()).farm, initial.farm);
  if (process.argv.includes("--production")) {
    async function focusChicken() {
    await page
      .getByRole("button", { name: "Centralizar fazenda", exact: true })
      .click();
    await page.mouse.move(1000, 480);
    await page.mouse.down();
    await page.mouse.move(849.2, 783.4, { steps: 15 });
    await page.mouse.up();
    for (let i = 0; i < 4; i++)
      await page
        .getByRole("button", { name: "Aproximar", exact: true })
        .click();
    }
    await focusChicken();
    await page.mouse.click(640, 400);
    await page
      .getByRole("dialog", { name: "Galinheiro", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Alimentar", exact: true })
      .first()
      .click();
    await page.getByText("Barriguinha cheia! A produção começou.").waitFor();
    assert.equal(
      (await read()).farm.inventory.feed,
      initial.farm.inventory.feed - 1,
    );
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    console.log("Waiting 61 real seconds for egg production.");
    await page.waitForTimeout(30000);
    await page.waitForTimeout(31000);
    await focusChicken();
    await page.screenshot({
      path: "docs/screenshots/pen-chicken-ready.png",
      clip: { x: 385, y: 205, width: 510, height: 360 },
    });
    await page.mouse.click(640, 400);
    await page
      .getByRole("dialog", { name: "Galinheiro", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Recolher", exact: true }).click();
    await page.getByText("Produto fresquinho guardado no celeiro!").waitFor();
    const collected = (await read()).farm;
    assert.equal(collected.inventory.egg, initial.farm.inventory.egg + 1);
    assert.equal(
      collected.animals.find((a) => a.id === "chicken-1").fedAt,
      null,
    );
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    console.log("PASS: selected pen feeding and real egg collection.");
  }
  await page.setViewportSize({ width: 960, height: 540 });
  await page
    .getByRole("button", { name: "Centralizar fazenda", exact: true })
    .click();
  await page.waitForTimeout(350);
  await page.screenshot({ path: "docs/screenshots/pens-v1-mobile.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: four selectable species-specific pens, compact resident panels, camera, reload and unchanged server snapshot; no JS or asset errors.",
  );
} finally {
  await browser.close();
}
