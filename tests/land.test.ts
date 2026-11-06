import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialFarm,
  applyCommand,
  migrateFarm,
} from "../server/services/farm";
import { obstacleKinds, toolIds, type ObstacleKind } from "../src/types/land";
import {
  initialObstacles,
  occupancyIssue,
  obstacleRect,
  intersects,
  placementRect,
} from "../src/data/land";
import { barnUsed, type Farm } from "../src/types/game";
import { commandSchema } from "../server/validators/command";
import { fieldBatches } from "../src/data/fields";

test("seed is stable and dozens of obstacles avoid infrastructure, each other and blocked areas", () => {
  for (const seed of [1, 42, 9001]) {
    const farm = initialFarm();
    farm.obstacles = initialObstacles(seed, farm);
    assert.ok(farm.obstacles.length >= 40);
    for (const kind of Object.keys(obstacleKinds))
      assert.ok(farm.obstacles.some((o) => o.kind === kind));
    assert.deepEqual(initialObstacles(seed, farm), farm.obstacles);
    for (const obstacle of farm.obstacles) {
      assert.equal(
        occupancyIssue(
          {
            ...farm,
            areas: farm.areas.map((a) => ({ ...a, unlocked: true })),
            obstacles: farm.obstacles.filter((o) => o.id !== obstacle.id),
          },
          obstacleRect(obstacle),
        ),
        null,
      );
    }
  }
});
test("every species uses the authoritative tool once and frees its actual footprint", () => {
  for (const kind of Object.keys(obstacleKinds) as ObstacleKind[]) {
    const farm = initialFarm();
    const o = farm.obstacles.find((o) => o.id === "natural-0")!;
    o.kind = kind;
    o.x = 27;
    o.y = 7;
    o.areaId = "east";
    farm.areas.find((a) => a.id === "east")!.unlocked = true;
    const tool = obstacleKinds[kind].tool,
      before = farm.inventory[tool];
    const next = applyCommand(
      farm,
      { type: "remove-obstacle", obstacleId: o.id },
      1234,
    );
    assert.equal(next.inventory[tool], before - 1);
    assert.equal(next.obstacles[0].removedAt, 1234);
    assert.equal(farm.obstacles[0].removedAt, null);
    assert.throws(() =>
      applyCommand(next, { type: "remove-obstacle", obstacleId: o.id }),
    );
    farm.inventory[tool] = 0;
    assert.throws(
      () => applyCommand(farm, { type: "remove-obstacle", obstacleId: o.id }),
      /mais ferramentas/,
    );
  }
});
test("cleared land accepts a real plantable field, decoration and building with no invisible collision", () => {
  let farm = initialFarm({ planted: false });
  const o = farm.obstacles[0];
  assert.equal(o.kind, "rockSmall");
  assert.throws(
    () => applyCommand(farm, { type: "place-field", x: o.x, y: o.y }),
    /obstáculos/,
  );
  farm = applyCommand(farm, { type: "remove-obstacle", obstacleId: o.id });
  const field = applyCommand(farm, { type: "place-field", x: o.x, y: o.y });
  assert.equal(field.coins, farm.coins - 5);
  const planted = applyCommand(
    field,
    { type: "plant", x: o.x, y: o.y, crop: "wheat" },
    0,
  );
  assert.equal(planted.inventory.wheat, field.inventory.wheat - 1);
  assert.throws(
    () => applyCommand(field, { type: "place-decoration", x: o.x, y: o.y }),
    /canteiro/,
  );
  const decorated = applyCommand(farm, {
    type: "place-decoration",
    x: o.x,
    y: o.y,
  });
  assert.equal(decorated.decorations.length, 1);
  const moved = applyCommand(farm, {
    type: "move-building",
    buildingId: "silo",
    x: o.x,
    y: o.y,
  });
  assert.deepEqual(moved.buildingPositions.silo, { x: o.x, y: o.y });
  assert.throws(
    () => applyCommand(moved, { type: "place-field", x: o.x, y: o.y }),
    /construção/,
  );
  assert.throws(
    () =>
      applyCommand(farm, {
        type: "move-building",
        buildingId: "barn",
        x: 7,
        y: 7,
      }),
    /canteiro|muro/,
  );
});
test("locked expansion, paths, river and existing pens cannot be removed or built over", () => {
  const farm = initialFarm();
  const locked = farm.obstacles.find((o) => o.areaId === "east")!;
  assert.ok(locked);
  assert.throws(
    () =>
      applyCommand(farm, { type: "remove-obstacle", obstacleId: locked.id }),
    /bloqueada/,
  );
  for (const [x, y] of [
    [5, 9],
    [15, 7],
    [27, 4],
    [-5, -5],
  ])
    assert.throws(() => applyCommand(farm, { type: "place-field", x, y }));
  for (const extra of [
    { tool: "axe" },
    { quantity: 0 },
    { removedAt: 0 },
    { x: 0 },
  ])
    assert.equal(
      commandSchema.safeParse({
        type: "remove-obstacle",
        obstacleId: "natural-0",
        ...extra,
      }).success,
      false,
    );
});
test("v4 migration preserves all progress and grants tools exactly once", () => {
  const old = initialFarm();
  const raw = structuredClone(old) as unknown as Record<string, unknown>;
  raw.version = 4;
  for (const k of [
    "obstacles",
    "landSeed",
    "areas",
    "buildingPositions",
    "decorations",
  ])
    delete raw[k];
  const inv = raw.inventory as Record<string, number>;
  for (const tool of toolIds) delete inv[tool];
  const migrated = migrateFarm(raw as unknown as Farm);
  assert.equal(migrated.version, 7);
  assert.equal(migrated.coins, old.coins);
  assert.deepEqual(migrated.plots, old.plots);
  assert.deepEqual(
    migrated.animals.map(({ production, ...animal }) => animal),
    old.animals.map(({ production, ...animal }) => animal),
  );
  migrated.inventory.axe = 0;
  const again = migrateFarm(migrated);
  assert.equal(again.inventory.axe, 0);
  assert.deepEqual(again.obstacles, migrated.obstacles);
  assert.equal(barnUsed(migrated), 14);
});
test("separate field beds never paint the empty rectangle between them", () => {
  const batches = fieldBatches([...initialFarm().plots, { x: 0, y: 9 }]);
  assert.equal(batches.length, 2);
  assert.equal(
    batches.some((b) => b.minX < 7 && b.maxX >= 7),
    false,
  );
});
