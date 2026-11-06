import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { occupancyIssue, placementRect } from "../src/data/land.ts";
import { obstacleKinds } from "../src/types/land.ts";
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
  await page.goto(base);
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  const read = async () => (await page.request.get(base + "/api/farm")).json();
  let farm = (await read()).farm;
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
    await page.waitForTimeout(250);
  }
  async function select(o) {
    const def = obstacleKinds[o.kind];
    await focus(o.x + (def.w - 1) / 2, o.y + (def.h - 1) / 2);
    for (const offset of [14, 30, 55, 75]) {
      await page.mouse.click(640, 400 - offset);
      if (
        await page
          .getByRole("dialog", { name: def.name, exact: true })
          .isVisible()
      )
        return;
    }
    throw new Error("Could not select " + def.name);
  }
  const large = farm.obstacles.find(
    (o) =>
      o.areaId === "valley" &&
      obstacleKinds[o.kind].w === 3 &&
      !occupancyIssue(
        { ...farm, obstacles: farm.obstacles.filter((x) => x.id !== o.id) },
        placementRect(
          { kind: "building", buildingId: "barn" },
          o.x + 1,
          o.y + 1,
        ),
        "barn",
      ),
  );
  assert.ok(large);
  await select(large);
  await page
    .getByRole("button", {
      name:
        "Remover " + obstacleKinds[large.kind].name.toLocaleLowerCase("pt-BR"),
      exact: true,
    })
    .click();
  await page.getByText("Terreno limpo! O espaço já está disponível.").waitFor();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Construções", exact: true }).click();
  await page
    .getByRole("button", { name: "Mover celeiro", exact: true })
    .click();
  await page.mouse.click(640, 400);
  await page.getByText("Construção reposicionada.").waitFor();
  farm = (await read()).farm;
  assert.deepEqual(farm.buildingPositions.barn, {
    x: large.x + 1,
    y: large.y + 1,
  });
  await page.waitForTimeout(200);
  await page.screenshot({
    path: "docs/screenshots/obstacles-v1-moved-barn.png",
  });
  const denied = await page.request.post(base + "/api/farm/command", {
    data: { type: "place-field", ...farm.buildingPositions.barn },
  });
  assert.equal(denied.status(), 400);
  const stone = farm.obstacles[0];
  await select(stone);
  await page
    .getByRole("button", { name: "Remover pedra pequena", exact: true })
    .click();
  await page.getByText("Terreno limpo! O espaço já está disponível.").waitFor();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Construções", exact: true }).click();
  await page
    .getByRole("button", { name: "Floreira · 8 moedas", exact: true })
    .click();
  await page.mouse.click(640, 400);
  await page.getByText("Um novo detalhe para o seu vale.").waitFor();
  farm = (await read()).farm;
  assert.equal(farm.decorations.length, 1);
  assert.equal(farm.coins, 142);
  await page.screenshot({
    path: "docs/screenshots/obstacles-v1-decoration.png",
  });
  const saved = farm;
  await page.reload();
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  assert.deepEqual((await read()).farm, saved);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: cleared 3x3 land accepts the real barn, rejects overlapping construction, cleared small stone accepts a paid decoration; both survive reload.",
  );
} finally {
  await browser.close();
}
