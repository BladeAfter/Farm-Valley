import test from "node:test";
import assert from "node:assert/strict";
import {
  initialFarm,
  applyCommand,
  migrateFarm,
} from "../server/services/farm";
import { occupancyIssue, placementRect } from "../src/data/land";
import { animalHome, containsPen, constrainAnimal } from "../src/data/pens";
import { commandSchema } from "../server/validators/command";

test("moving pens preserves animals, production, economy and relocates collision bounds", () => {
  let farm = initialFarm();
  farm.obstacles = [];
  farm = applyCommand(farm, { type: "feed-animal", animalId: "cow-1" });
  const placement = { kind: "pen" as const, animalKind: "cow" as const };
  let target: { x: number; y: number } | undefined;
  for (let x = 0; x < 23 && !target; x++)
    for (let y = 0; y < 20 && !target; y++)
      if (
        !occupancyIssue(
          farm,
          placementRect(placement, x, y),
          undefined,
          placement,
        )
      )
        target = { x, y };
  assert.ok(target);
  const moved = applyCommand(farm, {
    type: "move-pen",
    animalKind: "cow",
    ...target,
  });
  assert.deepEqual(moved.animals, farm.animals);
  assert.deepEqual(moved.inventory, farm.inventory);
  assert.equal(moved.coins, farm.coins);
  assert.deepEqual(moved.penPositions.cow, target);
  const home = animalHome("cow-1", moved.penPositions);
  assert.ok(containsPen("cow", home.x, home.y, moved.penPositions));
  const constrained = constrainAnimal("cow-1", -9000, 9000, moved.penPositions);
  assert.ok(
    containsPen("cow", constrained.x, constrained.y, moved.penPositions),
  );
  assert.match(
    occupancyIssue(
      moved,
      placementRect({ kind: "field" }, target.x + 1, target.y + 1),
    )!,
    /cercado/,
  );
  assert.throws(() =>
    applyCommand(moved, { type: "move-pen", animalKind: "cow", x: 7, y: 7 }),
  );
  assert.throws(() =>
    applyCommand(moved, { type: "move-pen", animalKind: "cow", x: 5, y: 15 }),
  );
});

test("moving a planted field preserves crop and growth timestamp and rejects a stale source", () => {
  const farm = initialFarm();
  farm.obstacles = [];
  const source = farm.plots[0];
  const moved = applyCommand(farm, {
    type: "move-field",
    from: source,
    x: 2,
    y: 10,
  });
  assert.equal(moved.plots.length, farm.plots.length);
  assert.deepEqual(moved.plots[0], { ...source, x: 2, y: 10 });
  assert.deepEqual(moved.inventory, farm.inventory);
  assert.equal(moved.coins, farm.coins);
  assert.throws(() =>
    applyCommand(moved, { type: "move-field", from: source, x: 1, y: 10 }),
  );
  assert.throws(() =>
    applyCommand(moved, {
      type: "move-field",
      from: { x: 2, y: 10 },
      x: 8,
      y: 7,
    }),
  );
});

test("existing saves gain pen positions once without resetting progress; commands remain strict", () => {
  const farm = initialFarm();
  const old = structuredClone(farm);
  delete (old as Partial<typeof old>).penPositions;
  const migrated = migrateFarm(old);
  assert.deepEqual(migrated.penPositions, farm.penPositions);
  assert.deepEqual(migrated.plots, farm.plots);
  assert.deepEqual(migrated.inventory, farm.inventory);
  assert.deepEqual(migrateFarm(migrated), migrated);
  assert.equal(
    commandSchema.safeParse({
      type: "move-pen",
      animalKind: "cow",
      x: 2,
      y: 10,
      coins: 999,
    }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({
      type: "move-field",
      from: { x: 7, y: 7 },
      x: 2,
      y: 10,
    }).success,
    true,
  );
});
