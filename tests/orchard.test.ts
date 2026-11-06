import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialFarm,
  applyCommand,
  migrateFarm,
} from "../server/services/farm";
import {
  fruitIds,
  fruitSpecies,
  fruitStage,
  fruitRect,
  orchardRules,
} from "../src/types/orchard";
import { occupancyIssue } from "../src/data/land";
import { barnUsed, type Farm } from "../src/types/game";
import { commandSchema } from "../server/validators/command";
import { FileFarmRepository } from "../server/database/file-repository";
import { unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

function free(farm: Farm) {
  for (let x = -3; x < 23; x++)
    for (let y = -3; y < 22; y++)
      if (!occupancyIssue(farm, fruitRect({ x, y }))) return { x, y };
  throw new Error("No free tree location");
}
for (const species of fruitIds)
  test(
    species +
      " grows, produces once per offline cycle and rejects early/duplicate harvests",
    () => {
      let farm = initialFarm();
      farm.coins = 1000;
      farm.xp = Math.max(150, (fruitSpecies[species].level - 1) * 50);
      const cell = free(farm),
        config = fruitSpecies[species],
        now = 1000;
      const before = farm.coins;
      farm = applyCommand(
        farm,
        { type: "plant-fruit-tree", species, ...cell },
        now,
      );
      let tree = farm.fruitTrees.at(-1)!;
      assert.equal(farm.coins, before - config.price);
      assert.equal(tree.harvestLimit, null);
      assert.equal(fruitStage(tree, now), "seedling");
      assert.equal(fruitStage(tree, now + config.growth * 0.5), "growing");
      assert.equal(fruitStage(tree, tree.growsAt), "adult");
      assert.equal(
        fruitStage(tree, tree.growsAt + config.duration * 0.4),
        "small-fruit",
      );
      assert.equal(
        fruitStage(tree, tree.growsAt + config.duration * 0.8),
        "ripening",
      );
      assert.equal(fruitStage(tree, tree.readyAt), "ready");
      assert.throws(() =>
        applyCommand(
          farm,
          {
            type: "harvest-fruit-tree",
            treeId: tree.id,
            expectedHarvestCount: 0,
          },
          tree.readyAt - 1,
        ),
      );
      const at = tree.readyAt;
      farm = applyCommand(
        farm,
        {
          type: "harvest-fruit-tree",
          treeId: tree.id,
          expectedHarvestCount: 0,
        },
        at,
      );
      tree = farm.fruitTrees.at(-1)!;
      assert.equal(farm.inventory[species], config.yield);
      assert.equal(tree.harvestCount, 1);
      assert.equal(tree.lastHarvestAt, at);
      assert.equal(tree.readyAt, at + config.duration);
      assert.equal(fruitStage(tree, at), "harvested");
      assert.throws(() =>
        applyCommand(
          farm,
          {
            type: "harvest-fruit-tree",
            treeId: tree.id,
            expectedHarvestCount: 0,
          },
          at + 10 * config.duration,
        ),
      );
      assert.throws(() =>
        applyCommand(
          farm,
          {
            type: "harvest-fruit-tree",
            treeId: tree.id,
            expectedHarvestCount: 1,
          },
          tree.readyAt - 1,
        ),
      );
      const offline = at + 30 * config.duration;
      farm = applyCommand(
        farm,
        {
          type: "harvest-fruit-tree",
          treeId: tree.id,
          expectedHarvestCount: 1,
        },
        offline,
      );
      assert.equal(farm.inventory[species], 2 * config.yield);
      assert.equal(farm.fruitTrees.at(-1)!.readyAt, offline + config.duration);
    },
  );
test("fruit purchase validates funds, level and all existing occupancy", () => {
  const farm = initialFarm(),
    cell = free(farm);
  assert.throws(
    () =>
      applyCommand(farm, {
        type: "plant-fruit-tree",
        species: "avocado",
        ...cell,
      }),
    /nível/,
  );
  farm.coins = 0;
  assert.throws(
    () =>
      applyCommand(farm, {
        type: "plant-fruit-tree",
        species: "apple",
        ...cell,
      }),
    /Moedas/,
  );
  farm.coins = 150;
  for (const cell of [
    { x: 8, y: 14 },
    { x: 7, y: 7 },
    { x: 5, y: 9 },
    { x: 27, y: 4 },
  ])
    assert.throws(() =>
      applyCommand(farm, {
        type: "plant-fruit-tree",
        species: "apple",
        ...cell,
      }),
    );
  const planted = applyCommand(farm, {
    type: "plant-fruit-tree",
    species: "apple",
    ...free(farm),
  });
  const tree = planted.fruitTrees.at(-1)!;
  assert.throws(
    () => applyCommand(planted, { type: "place-field", x: tree.x, y: tree.y }),
    /pomar/,
  );
  assert.throws(
    () => applyCommand(planted, { type: "remove-fruit-tree", treeId: tree.id }),
    /secas/,
  );
});
test("full barn retains fruit and timestamps without losing the harvest", () => {
  const farm = initialFarm(),
    tree = farm.fruitTrees[0];
  farm.inventory.feed += 100 - barnUsed(farm) - 2;
  const before = structuredClone(farm);
  assert.throws(
    () =>
      applyCommand(farm, {
        type: "harvest-fruit-tree",
        treeId: tree.id,
        expectedHarvestCount: 0,
      }),
    /Celeiro cheio/,
  );
  assert.deepEqual(farm, before);
  farm.inventory.feed -= 3;
  assert.equal(
    applyCommand(farm, {
      type: "harvest-fruit-tree",
      treeId: tree.id,
      expectedHarvestCount: 0,
    }).inventory.apple,
    3,
  );
});
test("optional harvest limit affects newly planted trees; dry removal consumes one saw and clears land", () => {
  orchardRules.harvestLimitEnabled = true;
  try {
    let farm = initialFarm(),
      cell = free(farm);
    farm = applyCommand(
      farm,
      { type: "plant-fruit-tree", species: "apple", ...cell },
      1000,
    );
    orchardRules.harvestLimitEnabled = false;
    let tree = farm.fruitTrees.at(-1)!;
    assert.equal(tree.harvestLimit, 4);
    assert.equal(farm.fruitTrees[0].harvestLimit, null);
    for (let i = 0; i < 4; i++) {
      tree = farm.fruitTrees.at(-1)!;
      farm = applyCommand(
        farm,
        {
          type: "harvest-fruit-tree",
          treeId: tree.id,
          expectedHarvestCount: i,
        },
        tree.readyAt,
      );
    }
    tree = farm.fruitTrees.at(-1)!;
    assert.equal(fruitStage(tree, tree.readyAt), "dry");
    const saws = farm.inventory.saw;
    const removed = applyCommand(
      farm,
      { type: "remove-fruit-tree", treeId: tree.id },
      tree.readyAt,
    );
    assert.equal(removed.inventory.saw, saws - 1);
    assert.notEqual(removed.fruitTrees.at(-1)!.removedAt, null);
    assert.equal(occupancyIssue(removed, fruitRect(cell)), null);
    assert.throws(() =>
      applyCommand(removed, { type: "remove-fruit-tree", treeId: tree.id }),
    );
  } finally {
    orchardRules.harvestLimitEnabled = false;
  }
});
test("v5 migration preserves cleared land, positions, economy and timers and adds the existing orchard once", () => {
  const old = initialFarm();
  old.obstacles[0].removedAt = 123;
  old.coins = 137;
  old.animals[0].fedAt = 100;
  const raw = structuredClone(old) as unknown as Record<string, unknown>;
  raw.version = 5;
  delete raw.fruitTrees;
  for (const id of fruitIds)
    delete (raw.inventory as Record<string, number>)[id];
  const next = migrateFarm(raw as unknown as Farm);
  assert.equal(next.version, 7);
  assert.deepEqual(next.obstacles, old.obstacles);
  assert.equal(next.landSeed, old.landSeed);
  assert.deepEqual(next.buildingPositions, old.buildingPositions);
  assert.equal(next.coins, 137);
  assert.deepEqual(
    next.animals.map(({ production, ...animal }) => animal),
    old.animals.map(({ production, ...animal }) => animal),
  );
  assert.equal(next.animals[0].production?.readyAt, 120100);
  assert.equal(next.fruitTrees.length, 6);
  assert.equal(next.inventory.apple, 0);
  assert.equal(migrateFarm(next), next);
});
test("client cannot submit price, yield, ready time or harvest count changes", () => {
  for (const extra of [
    { readyAt: 0 },
    { quantity: 999 },
    { lastHarvestAt: 0 },
    { price: 0 },
  ])
    assert.equal(
      commandSchema.safeParse({
        type: "harvest-fruit-tree",
        treeId: "orchard-0",
        expectedHarvestCount: 0,
        ...extra,
      }).success,
      false,
    );
  assert.equal(
    commandSchema.safeParse({
      type: "plant-fruit-tree",
      species: "banana",
      x: 0,
      y: 9,
    }).success,
    false,
  );
});
test("simultaneous fruit harvest credits once and survives a fresh server repository", async () => {
  const path = resolve(".data", "orchard-test-" + randomUUID() + ".json"),
    repo = new FileFarmRepository(path);
  try {
    await repo.create("orchard");
    const before = await repo.access("orchard");
    const results = await Promise.allSettled(
      [1, 2].map(() =>
        repo.access("orchard", {
          type: "harvest-fruit-tree",
          treeId: "orchard-0",
          expectedHarvestCount: 0,
        }),
      ),
    );
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const after = await new FileFarmRepository(path).access("orchard");
    assert.equal(after.inventory.apple, before.inventory.apple + 3);
    assert.equal(after.fruitTrees[0].harvestCount, 1);
    assert.equal(after.fruitTrees[1].harvestCount, 0);
    assert.equal(
      after.fruitTrees[0].readyAt,
      after.fruitTrees[0].lastHarvestAt! + fruitSpecies.apple.duration,
    );
  } finally {
    await unlink(path).catch(() => {});
  }
});
