import { toolIds } from "../src/types/land";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  initialFarm,
  applyCommand,
  migrateFarm,
} from "../server/services/farm";
import {
  barnUsed,
  storageCapacity,
  playerLevel,
  type Farm,
} from "../src/types/game";
import { commandSchema } from "../server/validators/command";
import { buildingLayout, storageImage } from "../src/data/buildings";
import { toIso } from "../src/game/map/isometric";

test("armazenamento comeca pequeno; nivel libera e moedas pagam melhoria", () => {
  const original = initialFarm();
  assert.deepEqual(original.storage, { barn: 1, silo: 1 });
  assert.equal(storageCapacity(original, "barn"), 100);
  assert.throws(
    () =>
      applyCommand(original, {
        type: "upgrade-storage",
        storage: "barn",
        expectedLevel: 1,
      }),
    /nível 2/,
  );
  original.xp = 50;
  assert.equal(playerLevel(original), 2);
  const upgraded = applyCommand(original, {
    type: "upgrade-storage",
    storage: "barn",
    expectedLevel: 1,
  });
  assert.equal(upgraded.coins, 75);
  assert.equal(storageCapacity(upgraded, "barn"), 150);
  assert.equal(storageCapacity(upgraded, "silo"), 100);
  assert.equal(original.coins, 150);
  assert.equal(original.storage.barn, 1);
  assert.deepEqual(upgraded.inventory, original.inventory);
});
test("melhoria rejeita saldo insuficiente e repeticao do mesmo comando", () => {
  const farm = initialFarm();
  farm.xp = 50;
  farm.coins = 74;
  assert.throws(
    () =>
      applyCommand(farm, {
        type: "upgrade-storage",
        storage: "silo",
        expectedLevel: 1,
      }),
    /Moedas/,
  );
  assert.equal(farm.coins, 74);
  assert.equal(farm.storage.silo, 1);
  farm.coins = 150;
  const upgraded = applyCommand(farm, {
    type: "upgrade-storage",
    storage: "silo",
    expectedLevel: 1,
  });
  assert.throws(
    () =>
      applyCommand(upgraded, {
        type: "upgrade-storage",
        storage: "silo",
        expectedLevel: 1,
      }),
    /já mudou/,
  );
});
test("etapa avancada exige nivel 4 e capacidade final e 250", () => {
  const farm = initialFarm();
  farm.xp = 50;
  farm.coins = 400;
  const second = applyCommand(farm, {
    type: "upgrade-storage",
    storage: "barn",
    expectedLevel: 1,
  });
  assert.throws(
    () =>
      applyCommand(second, {
        type: "upgrade-storage",
        storage: "barn",
        expectedLevel: 2,
      }),
    /nível 4/,
  );
  second.xp = 150;
  const third = applyCommand(second, {
    type: "upgrade-storage",
    storage: "barn",
    expectedLevel: 2,
  });
  assert.equal(storageCapacity(third, "barn"), 250);
  assert.equal(third.coins, 145);
  assert.throws(
    () =>
      applyCommand(third, {
        type: "upgrade-storage",
        storage: "barn",
        expectedLevel: 3,
      }),
    /última etapa/,
  );
});
test("limites reais usam a capacidade melhorada de cada armazem", () => {
  const farm = initialFarm({ planted: false });
  farm.xp = 50;
  farm.coins = 500;
  const up = applyCommand(farm, {
    type: "upgrade-storage",
    storage: "barn",
    expectedLevel: 1,
  });
  for (const tool of toolIds) up.inventory[tool] = 0;
  up.inventory.feed = 147;
  assert.equal(barnUsed(applyCommand(up, { type: "buy-feed" })), 150);
  up.inventory.feed = 148;
  assert.throws(() => applyCommand(up, { type: "buy-feed" }), /Celeiro cheio/);
  const planted = applyCommand(
    up,
    { type: "plant", x: 7, y: 7, crop: "wheat" },
    0,
  );
  planted.inventory.wheat = 99;
  planted.inventory.corn = 0;
  assert.throws(
    () => applyCommand(planted, { type: "harvest", x: 7, y: 7 }, 120000),
    /Silo cheio/,
  );
  const siloUp = applyCommand(
    planted,
    { type: "upgrade-storage", storage: "silo", expectedLevel: 1 },
    120000,
  );
  assert.equal(
    applyCommand(siloUp, { type: "harvest", x: 7, y: 7 }, 120000).inventory
      .wheat,
    101,
  );
});
test("migracao da fazenda anterior preserva recursos e inicia apenas os armazens", () => {
  const old = { ...initialFarm(), version: 2 } as unknown as Farm;
  delete (old as Partial<Farm>).storage;
  old.coins = 321;
  old.xp = 87;
  const migrated = migrateFarm(old);
  assert.equal(migrated.version, 7);
  assert.equal(migrated.coins, 321);
  assert.equal(migrated.xp, 87);
  assert.deepEqual(migrated.storage, { barn: 1, silo: 1 });
  assert.deepEqual(migrated.plots, old.plots);
});
test("cliente nao escolhe capacidade, custo ou salta etapas", () => {
  assert.equal(
    commandSchema.safeParse({
      type: "upgrade-storage",
      storage: "barn",
      expectedLevel: 1,
      capacity: 9999,
    }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({
      type: "upgrade-storage",
      storage: "silo",
      expectedLevel: 1,
      cost: 0,
    }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({
      type: "upgrade-storage",
      storage: "coins",
      expectedLevel: 1,
    }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({
      type: "upgrade-storage",
      storage: "barn",
      expectedLevel: 4,
    }).success,
    false,
  );
});
test("todas as formas cabem separadas no layout, incluindo a etapa avancada", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../public/assets/manifest.json", import.meta.url),
      "utf8",
    ),
  ) as { file: string; width: number; height: number }[];
  const bounds = (image: string, x: number, y: number, width: number) => {
    const asset = manifest.find((a) => "/assets/" + a.file === image);
    assert.ok(asset, image);
    const p = toIso(x, y),
      height = (width * asset.height) / asset.width;
    return {
      left: p.x - width / 2,
      right: p.x + width / 2,
      top: p.y - height * 0.94,
      bottom: p.y + height * 0.06,
    };
  };
  const house = buildingLayout.house;
  for (let stage = 1; stage <= 3; stage++) {
    const a = bounds(
      "/assets/buildings/farmhouse/house-v3.webp",
      house.x,
      house.y,
      house.width,
    );
    const b = bounds(
      storageImage("barn", stage),
      buildingLayout.barn.x,
      buildingLayout.barn.y,
      buildingLayout.barn.widths[stage - 1],
    );
    const c = bounds(
      storageImage("silo", stage),
      buildingLayout.silo.x,
      buildingLayout.silo.y,
      buildingLayout.silo.widths[stage - 1],
    );
    for (const [one, two] of [
      [a, b],
      [a, c],
      [b, c],
    ]) {
      const separated =
        one.right + 12 <= two.left ||
        two.right + 12 <= one.left ||
        one.bottom + 12 <= two.top ||
        two.bottom + 12 <= one.top;
      assert.ok(
        separated,
        "Buildings overlap or have no access gap at stage " + stage,
      );
    }
  }
});
