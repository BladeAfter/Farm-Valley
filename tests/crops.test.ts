import test from "node:test";
import assert from "node:assert/strict";
import {
  initialFarm,
  migrateFarm,
  applyCommand,
} from "../server/services/farm";
import { crops, siloUsed } from "../src/types/game";
import { commandSchema } from "../server/validators/command";

for (const crop of [
  "carrot",
  "soybean",
  "sugarcane",
  "strawberry",
  "potato",
] as const) {
  test(`${crop}: unlock, buy, plant, grow and harvest with authoritative storage`, () => {
    let farm = initialFarm({ planted: false });
    assert.throws(() => applyCommand(farm, { type: "buy-seed", crop }));
    assert.throws(() =>
      applyCommand(farm, { type: "plant", crop, x: 7, y: 7 }),
    );
    farm.xp = (crops[crop].level - 1) * 50;
    const coins = farm.coins;
    farm = applyCommand(farm, { type: "buy-seed", crop }, 1000);
    assert.equal(farm.coins, coins - crops[crop].seedPrice);
    assert.equal(farm.inventory[crop], 3);
    assert.equal(siloUsed(farm), 17);
    farm = applyCommand(
      farm,
      {
        type: "field-stroke",
        action: "plant",
        crop,
        cells: [
          { x: 7, y: 7 },
          { x: 8, y: 7 },
        ],
      },
      1000,
    );
    assert.equal(farm.inventory[crop], 1);
    assert.throws(() =>
      applyCommand(
        farm,
        { type: "harvest", x: 7, y: 7 },
        1000 + crops[crop].duration - 1,
      ),
    );
    const full = structuredClone(farm);
    full.inventory.wheat = 100;
    assert.throws(() =>
      applyCommand(
        full,
        { type: "harvest", x: 7, y: 7 },
        1000 + crops[crop].duration,
      ),
    );
    farm = applyCommand(
      farm,
      { type: "harvest", x: 7, y: 7 },
      1000 + crops[crop].duration,
    );
    assert.equal(farm.inventory[crop], 3);
    assert.equal(farm.xp, (crops[crop].level - 1) * 50 + crops[crop].xp);
    assert.equal(
      commandSchema.safeParse({ type: "buy-seed", crop }).success,
      true,
    );
  });
}

test("adding crops to existing saves retains moved pens, fields and inventory", () => {
  const farm = initialFarm();
  farm.penPositions.cow = { x: 18, y: 15 };
  const old = structuredClone(farm);
  for (const crop of [
    "carrot",
    "soybean",
    "sugarcane",
    "strawberry",
    "potato",
  ] as const)
    delete (old.inventory as Partial<typeof old.inventory>)[crop];
  const migrated = migrateFarm(old);
  assert.deepEqual(migrated.penPositions, farm.penPositions);
  assert.deepEqual(migrated.plots, farm.plots);
  assert.deepEqual(migrated.inventory, farm.inventory);
  assert.equal(
    commandSchema.safeParse({ type: "buy-seed", crop: "invalid" }).success,
    false,
  );
});
