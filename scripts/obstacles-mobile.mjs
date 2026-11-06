import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const base = process.env.FARM_BASE_URL || "http://localhost:5173";
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page
    .getByText("Bem-vindo ao vale! Sua primeira colheita está pronta.")
    .waitFor();
  const cdp = await context.newCDPSession(page),
    read = async () => (await page.request.get(base + "/api/farm")).json();
  const before = (await read()).farm,
    stone = before.obstacles[0],
    zoom = 0.6;
  async function focus(x, y) {
    await page
      .getByRole("button", { name: "Centralizar fazenda", exact: true })
      .tap();
    let dx = (12 - (x - y) * 44) * zoom,
      dy = (310 - (x + y) * 22) * zoom;
    while (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
      const mx = Math.max(-180, Math.min(180, dx)),
        my = Math.max(-110, Math.min(110, dy));
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: 422, y: 195 }],
      });
      for (let i = 1; i <= 10; i++)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: 422 + (mx * i) / 10, y: 195 + (my * i) / 10 }],
        });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      dx -= mx;
      dy -= my;
    }
    await page.waitForTimeout(200);
  }
  await focus(stone.x, stone.y);
  await page.touchscreen.tap(422, 187);
  const dialog = page.getByRole("dialog", {
    name: "Pedra pequena",
    exact: true,
  });
  await dialog.waitFor();
  await page.screenshot({
    path: "docs/screenshots/obstacles-v1-touch-panel.png",
  });
  await dialog
    .getByRole("button", { name: "Remover pedra pequena", exact: true })
    .tap();
  await page.getByText("Terreno limpo! O espaço já está disponível.").waitFor();
  assert.equal(
    (await read()).farm.inventory.pickaxe,
    before.inventory.pickaxe - 1,
  );
  const locked = before.obstacles.find(
    (o) => o.areaId === "east" && o.kind === "rockLarge",
  );
  await focus(locked.x + 1, locked.y + 1);
  await page.touchscreen.tap(422, 180);
  await page
    .getByRole("dialog", { name: "Rocha grande", exact: true })
    .waitFor();
  await page.getByText("Esta área ainda está bloqueada.").waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Remover rocha grande", exact: true })
      .isDisabled(),
    true,
  );
  await page.screenshot({ path: "docs/screenshots/obstacles-v1-locked.png" });
  await page.getByRole("button", { name: "Fechar", exact: true }).tap();
  await page
    .getByRole("button", { name: "Centralizar fazenda", exact: true })
    .tap();
  const samples = [];
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(1000);
    samples.push(
      Number(await page.locator("canvas").getAttribute("data-actual-fps")),
    );
  }
  const report = {
    environment:
      "Headless Chrome, mobile touch emulation 844x390; not a physical Android benchmark",
    obstacles: before.obstacles.length,
    targetFps: 30,
    samples,
    averageFps:
      Math.round((samples.reduce((a, b) => a + b, 0) / samples.length) * 10) /
      10,
  };
  await writeFile(
    "docs/obstacle-performance.json",
    JSON.stringify(report, null, 2),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: actual touch pan, selection/removal, locked-area UI and five seconds with " +
      report.obstacles +
      " obstacles; " +
      report.averageFps +
      " FPS average in this emulated environment.",
  );
} finally {
  await browser.close();
}
