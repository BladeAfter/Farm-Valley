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
  const page = await browser.newPage({ locale: "pt-BR",
    viewport: { width: 1280, height: 800 },
  });
  const errors = [],
    failedAssets = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().includes("/assets/") && r.status() >= 400)
      failedAssets.push(r.url());
  });
  await page.goto(base);
  await page.locator('canvas[data-scene="farm"]').waitFor();
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  await page.waitForTimeout(700);
  await mkdir("docs/screenshots", { recursive: true });
  await page.screenshot({ path: "docs/screenshots/premium-desktop.png" });
  const read = async () => (await page.request.get(base + "/api/farm")).json();
  const before = (await read()).farm;
  assert.equal(before.version, 7);
  const point = (x, y) => ({
    x: 640 + ((x - y) * 44 - 12) * 1,
    y: 400 + ((x + y) * 22 - 310) * 1,
  });
  const a = point(7, 7),
    b = point(8, 7);
  await page
    .getByRole("button", { name: "Colher", exact: true })
    .click();
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 14 });
  await page.mouse.up();
  await page.getByText("Campo cuidado! Continue cultivando.").waitFor();
  const harvested = (await read()).farm;
  assert.equal(harvested.inventory.wheat, before.inventory.wheat + 4);
  assert.equal(harvested.xp, before.xp + 2);
  await page.getByRole("button", { name: "Plantar", exact: true }).click();
  const seed = await page
    .getByRole("button", { name: "Plantar Trigo", exact: true })
    .boundingBox();
  await page.mouse.move(seed.x + seed.width / 2, seed.y + seed.height / 2);
  await page.mouse.down();
  await page.mouse.move(400, 360, { steps: 12 });
  await page.mouse.move(a.x, a.y, { steps: 12 });
  await page.mouse.move(b.x, b.y, { steps: 14 });
  await page.mouse.up();
  await page.waitForFunction(async (base) => {
    const s = await (await fetch(base + "/api/farm")).json();
    return s.farm.revision >= 2;
  }, base);
  const planted = (await read()).farm;
  assert.equal(planted.inventory.wheat, before.inventory.wheat + 2);
  assert.equal(planted.coins, before.coins);
  assert.equal(planted.plots.find((p) => p.x === 7 && p.y === 7).crop, "wheat");
  const early = await page.request.post(base + "/api/farm/command", {
    data: { type: "harvest", x: 7, y: 7 },
  });
  assert.equal(early.status(), 400);
  await page
    .getByRole("button", { name: "Explorar mapa", exact: true })
    .click();
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 70, a.y + 30, { steps: 12 });
  await page.mouse.up();
  assert.equal((await read()).farm.revision, 2);
  await page.getByRole("button", { name: "Inventário", exact: true }).click();
  await page.getByRole("dialog", { name: "Silo & celeiro" }).waitFor();
  await page.screenshot({ path: "docs/screenshots/premium-inventory.png" });
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page
    .getByRole("button", { name: "Mais op\u00e7\u00f5es", exact: true })
    .click();
  await page.getByRole("button", { name: "Animais", exact: true }).click();
  await page
    .getByRole("button", { name: "Alimentar", exact: true })
    .first()
    .click();
  await page.getByText("Barriguinha cheia! A produção começou.").waitFor();
  assert.equal((await read()).farm.inventory.feed, before.inventory.feed - 1);
  await page.screenshot({ path: "docs/screenshots/premium-animals.png" });
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Pedidos", exact: true }).click();
  await page
    .getByRole("button", { name: "Entregar pedido 1", exact: true })
    .click();
  await page
    .getByText("Entrega concluída! A vila agradece.")
    .waitFor();
  assert.equal((await read()).farm.coins, before.coins + 16);
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.reload();
  await page.locator('canvas[data-scene="farm"]').waitFor();
  assert.equal((await read()).farm.ordersCompleted, 1);
  await page.getByRole("button", { name: "Loja", exact: true }).click();
  await page.getByRole("button", { name: "Fábricas", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Comprar Fábrica de ração", exact: true })
      .isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page
    .getByRole("button", { name: "Centralizar fazenda", exact: true })
    .click();
  const emptyPlot = point(7, 10);
  await page.mouse.click(emptyPlot.x, emptyPlot.y);
  await page
    .getByRole("region", { name: "Canteiro", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Escolher Trigo", exact: true })
    .click();
  await page.locator(".plot-context").getByRole("button", { name: "Plantar", exact: true }).click();
  await page.waitForFunction(
    async () =>
      (await (await fetch("/api/farm")).json()).farm.plots.find(
        (p) => p.x === 7 && p.y === 10,
      ).crop === "wheat",
  );
  await page
    .getByRole("button", { name: "Fechar", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Explorar mapa", exact: true })
    .click();
  const barnPoint = point(
    before.buildingPositions.barn.x,
    before.buildingPositions.barn.y,
  );
  await page.mouse.click(barnPoint.x, barnPoint.y - 30);
  await page
    .getByRole("dialog", { name: "Silo & celeiro", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Celeiro", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(500);
  await page
    .getByRole("button", { name: "Centralizar fazenda", exact: true })
    .click();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: "docs/screenshots/premium-mobile-landscape.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByText("Vire o celular na horizontal para jogar.")
    .waitFor({ state: "visible" });
  assert.deepEqual(errors, []);
  assert.deepEqual(failedAssets, []);
  console.log(
    "PASS: assets, arrasto com foice, plantio em lote com sementes, tempo autoritativo, camera isolada, inventario, alimentar animal, pedido real, reload e mobile. Sem erros JS nem assets ausentes.",
  );
} finally {
  await browser.close();
}
