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
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().includes("/assets/") && r.status() >= 400) errors.push(r.url());
  });
  const read = async () => (await page.request.get(base + "/api/farm")).json();
  await page.goto(base);
  await page.locator('canvas[data-obstacles-version="1"]').waitFor();
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  await page.waitForTimeout(400);
  const before = (await read()).farm;
  assert.equal(before.version, 6);
  assert.ok(before.obstacles.length >= 40);
  await mkdir("docs/screenshots", { recursive: true });
  await page.screenshot({ path: "docs/screenshots/obstacles-v1-farm.png" });
  async function focus(x, y) {
    await page
      .getByRole("button", { name: "Centralizar fazenda", exact: true })
      .click();
    let dx = 12 - (x - y) * 44,
      dy = 310 - (x + y) * 22;
    while (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      const mx = Math.max(-220, Math.min(220, dx)),
        my = Math.max(-160, Math.min(160, dy));
      await page.mouse.move(640, 400);
      await page.mouse.down();
      await page.mouse.move(640 + mx, 400 + my, { steps: 10 });
      await page.mouse.up();
      dx -= mx;
      dy -= my;
    }
    await page.waitForTimeout(180);
  }
  const stone = before.obstacles.find(
    (o) => o.kind === "rockSmall" && o.areaId === "valley",
  );
  await focus(stone.x, stone.y);
  await page.mouse.click(640, 386);
  const dialog = page.getByRole("dialog", {
    name: "Pedra pequena",
    exact: true,
  });
  await dialog.waitFor();
  await dialog.getByText("Disponível no inventário: 2").waitFor();
  await page.screenshot({ path: "docs/screenshots/obstacles-v1-selected.png" });
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/farm/command") &&
      r.request().postDataJSON()?.type === "remove-obstacle",
  );
  await dialog
    .getByRole("button", { name: "Remover pedra pequena", exact: true })
    .click();
  assert.equal((await response).status(), 200);
  await page.getByText("Terreno limpo! O espaço já está disponível.").waitFor();
  await page.waitForTimeout(850);
  let farm = (await read()).farm;
  assert.equal(farm.inventory.pickaxe, 1);
  assert.notEqual(
    farm.obstacles.find((o) => o.id === stone.id).removedAt,
    null,
  );
  await page.screenshot({ path: "docs/screenshots/obstacles-v1-cleared.png" });
  await page.getByRole("button", { name: "Construções", exact: true }).click();
  await page
    .getByRole("button", { name: "Novo canteiro · 5 moedas", exact: true })
    .click();
  await page.mouse.click(640, 400);
  await page.getByText("Novo canteiro pronto para plantar.").waitFor();
  farm = (await read()).farm;
  assert.equal(farm.plots.length, before.plots.length + 1);
  assert.equal(farm.coins, before.coins - 5);
  await page
    .getByRole("button", { name: "Plantar Trigo", exact: true })
    .click();
  await page.mouse.click(640, 400);
  await page.getByText("Campo cuidado! Continue cultivando.").waitFor();
  farm = (await read()).farm;
  assert.equal(
    farm.plots.find((p) => p.x === stone.x && p.y === stone.y).crop,
    "wheat",
  );
  await page
    .getByRole("button", { name: "Explorar mapa", exact: true })
    .click();
  await page.screenshot({
    path: "docs/screenshots/obstacles-v1-new-field.png",
  });
  const saved = (await read()).farm;
  await page.reload();
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  assert.deepEqual((await read()).farm, saved);
  // Real server concurrency: two tabs/requests may remove one remaining stone only once.
  const second = saved.obstacles.find(
    (o) =>
      o.removedAt === null && o.kind === "rockSmall" && o.areaId === "valley",
  );
  assert.ok(second);
  const concurrent = await Promise.all(
    [1, 2].map(() =>
      page.request.post(base + "/api/farm/command", {
        data: { type: "remove-obstacle", obstacleId: second.id },
      }),
    ),
  );
  assert.deepEqual(concurrent.map((r) => r.status()).sort(), [200, 400]);
  await page.reload();
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  farm = (await read()).farm;
  assert.equal(farm.inventory.pickaxe, 0);
  const third = farm.obstacles.find(
    (o) =>
      o.removedAt === null && o.kind === "rockSmall" && o.areaId === "valley",
  );
  assert.ok(third);
  await focus(third.x, third.y);
  await page.mouse.click(640, 386);
  await page
    .getByRole("dialog", { name: "Pedra pequena", exact: true })
    .waitFor();
  await page.getByText("Você precisa de mais ferramentas.").waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Remover pedra pequena", exact: true })
      .isDisabled(),
    true,
  );
  await page.screenshot({ path: "docs/screenshots/obstacles-v1-no-tools.png" });
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.getByRole("button", { name: "Inventário", exact: true }).click();
  await page
    .getByRole("heading", { name: "Ferramentas", exact: true })
    .waitFor();
  await page.screenshot({
    path: "docs/screenshots/obstacles-v1-inventory.png",
  });
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.setViewportSize({ width: 844, height: 390 });
  await page
    .getByRole("button", { name: "Centralizar fazenda", exact: true })
    .click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "docs/screenshots/obstacles-v1-mobile.png" });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: selection, tool consumption, clearing, real new field and planting, reload, simultaneous removal, missing tools, inventory and mobile; no JS/asset errors.",
  );
} finally {
  await browser.close();
}
