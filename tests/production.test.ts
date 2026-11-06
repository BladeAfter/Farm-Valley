import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  initialFarm,
  applyCommand,
  migrateFarm,
} from "../server/services/farm";
import {
  animalOutput,
  animalProducts,
  animalReadyAt,
  barnUsed,
  currentOrder,
  items,
  type Farm,
  type Item,
} from "../src/types/game";
import {
  canAffordRecipe,
  machineKinds,
  machineRect,
  queueUpgradePrices,
  recipeIds,
  recipeIngredients,
  recipes,
  type MachineKind,
} from "../src/data/production";
import { occupancyIssue } from "../src/data/land";
import { FileFarmRepository } from "../server/database/file-repository";
import { commandSchema } from "../server/validators/command";

function rich(): Farm {
  const farm = initialFarm({ planted: false });
  farm.xp = 1500;
  farm.coins = 100000;
  farm.obstacles = [];
  farm.fruitTrees = [];
  farm.plots = [];
  for (const id of Object.keys(items) as Item[]) farm.inventory[id] = 0;
  return farm;
}
function free(farm: Farm) {
  for (let x = 0; x < 22; x++)
    for (let y = 0; y < 21; y++)
      if (!occupancyIssue(farm, machineRect({ x, y }))) return { x, y };
  throw new Error("No free machine footprint");
}
function buy(farm: Farm, kind: MachineKind, now = 1000) {
  return applyCommand(farm, { type: "buy-machine", kind, ...free(farm) }, now);
}
function enqueue(farm: Farm, recipeId: (typeof recipeIds)[number], now = 1000) {
  const machine = farm.machines.find(
    (m) => m.kind === recipes[recipeId].machine,
  )!;
  return applyCommand(
    farm,
    {
      type: "enqueue-production",
      machineId: machine.id,
      recipeId,
      expectedRevision: farm.revision,
    },
    now,
  );
}
for (const recipeId of recipeIds)
  test(
    recipeId +
      ": consumes exact ingredients, respects time, collects real output once",
    () => {
      let farm = buy(rich(), recipes[recipeId].machine);
      for (const [id, n] of recipeIngredients(recipeId)) farm.inventory[id] = n;
      const before = structuredClone(farm);
      assert.ok(canAffordRecipe(farm, recipeId));
      farm = enqueue(farm, recipeId);
      for (const [id] of recipeIngredients(recipeId))
        assert.equal(farm.inventory[id], 0);
      const machine = farm.machines[0],
        job = machine.jobs[0];
      assert.equal(
        job.readyAt - job.startedAt,
        recipes[recipeId].minutes * 60000,
      );
      const collect = {
        type: "collect-production" as const,
        machineId: machine.id,
        jobId: job.id,
      };
      assert.throws(() => applyCommand(farm, collect, job.readyAt - 1));
      const collected = applyCommand(farm, collect, job.readyAt);
      assert.equal(collected.inventory[recipeId], recipes[recipeId].quantity);
      assert.equal(collected.xp, before.xp + recipes[recipeId].xp);
      assert.equal(collected.machines[0].completed, 1);
      assert.throws(() => applyCommand(collected, collect, job.readyAt + 1));
      assert.deepEqual(before.machines[0].jobs, []);
    },
  );
test("purchase, placement, level, funds, ownership and relocation are authoritative", () => {
  let farm = initialFarm();
  farm.obstacles = [];
  assert.throws(() => buy(farm, "feedMill"));
  farm.xp = 50;
  farm.coins = 59;
  assert.throws(() => buy(farm, "feedMill"));
  farm.coins = 200;
  assert.throws(() =>
    applyCommand(farm, { type: "buy-machine", kind: "feedMill", x: 5, y: 7 }),
  );
  const bought = buy(farm, "feedMill");
  assert.equal(bought.coins, 140);
  assert.equal(bought.machines[0].slots, 2);
  assert.throws(() => buy(bought, "feedMill"));
  const machine = bought.machines[0],
    destination = free(bought);
  const moved = applyCommand(bought, {
    type: "move-machine",
    machineId: machine.id,
    ...destination,
  });
  assert.deepEqual(
    { x: moved.machines[0].x, y: moved.machines[0].y },
    destination,
  );
  assert.deepEqual(moved.machines[0].jobs, machine.jobs);
  assert.throws(() =>
    applyCommand(moved, {
      type: "move-machine",
      machineId: machine.id,
      x: 7,
      y: 7,
    }),
  );
  assert.throws(() =>
    applyCommand(moved, {
      type: "move-machine",
      machineId: "another-player",
      ...free(moved),
    }),
  );
  assert.ok(occupancyIssue(moved, machineRect(destination)));
});
test("sequential queue, offline completion, capacity and stale enqueue protection", () => {
  let farm = buy(rich(), "feedMill");
  farm.inventory.corn = 20;
  farm.inventory.wheat = 10;
  const staleRevision = farm.revision;
  farm = enqueue(farm, "chickenFeed", 1000);
  farm = enqueue(farm, "chickenFeed", 1000);
  const machine = farm.machines[0],
    jobs = machine.jobs;
  assert.equal(jobs[1].startedAt, jobs[0].readyAt);
  assert.throws(() => enqueue(farm, "chickenFeed", jobs[1].readyAt + 100000));
  assert.throws(() =>
    applyCommand(farm, {
      type: "enqueue-production",
      machineId: machine.id,
      recipeId: "chickenFeed",
      expectedRevision: staleRevision,
    }),
  );
  const before = structuredClone(farm);
  farm.inventory.feed = 99;
  assert.throws(() =>
    applyCommand(
      farm,
      { type: "collect-production", machineId: machine.id, jobId: jobs[0].id },
      jobs[1].readyAt,
    ),
  );
  assert.deepEqual(farm.machines[0].jobs, before.machines[0].jobs);
  farm.inventory.feed = 0;
  for (const job of jobs)
    farm = applyCommand(
      farm,
      { type: "collect-production", machineId: machine.id, jobId: job.id },
      jobs[1].readyAt + 86400000,
    );
  assert.equal(farm.inventory.chickenFeed, 6);
  assert.equal(farm.machines[0].jobs.length, 0);
});
test("future cancellation refunds once, checks storage, reschedules successors without starting free jobs", () => {
  let farm = buy(rich(), "feedMill");
  farm.inventory.corn = 20;
  farm.inventory.wheat = 10;
  farm.inventory.soybean = 5;
  farm = applyCommand(farm, {
    type: "upgrade-machine",
    machineId: farm.machines[0].id,
    expectedSlots: 2,
  });
  farm = enqueue(
    enqueue(enqueue(farm, "chickenFeed", 1000), "cowFeed", 1000),
    "chickenFeed",
    1000,
  );
  const [first, second] = farm.machines[0].jobs,
    previous = structuredClone(farm.inventory);
  farm = applyCommand(
    farm,
    {
      type: "cancel-production",
      machineId: farm.machines[0].id,
      jobId: second.id,
    },
    1001,
  );
  assert.equal(farm.inventory.corn, previous.corn + 2);
  assert.equal(farm.inventory.soybean, previous.soybean + 1);
  assert.equal(farm.inventory.wheat, previous.wheat);
  assert.equal(farm.machines[0].jobs[1].startedAt, first.readyAt);
});
test("cancel waiting recipe atomically; started and duplicate cancellations are rejected", () => {
  let farm = buy(rich(), "bakery");
  farm.inventory.wheat = 30;
  farm = applyCommand(farm, {
    type: "upgrade-machine",
    machineId: farm.machines[0].id,
    expectedSlots: 2,
  });
  farm = enqueue(
    enqueue(enqueue(farm, "bread", 1000), "bread", 1000),
    "bread",
    1000,
  );
  const [first, second] = farm.machines[0].jobs,
    machineId = farm.machines[0].id;
  assert.throws(() =>
    applyCommand(
      farm,
      { type: "cancel-production", machineId, jobId: first.id },
      1001,
    ),
  );
  const full = structuredClone(farm);
  full.inventory.wheat = 100;
  assert.throws(() =>
    applyCommand(
      full,
      { type: "cancel-production", machineId, jobId: second.id },
      1001,
    ),
  );
  const wheat = farm.inventory.wheat;
  const cancelled = applyCommand(
    farm,
    { type: "cancel-production", machineId, jobId: second.id },
    1001,
  );
  assert.equal(cancelled.inventory.wheat, wheat + 3);
  assert.equal(cancelled.machines[0].jobs[1].startedAt, first.readyAt);
  assert.throws(() =>
    applyCommand(
      cancelled,
      { type: "cancel-production", machineId, jobId: second.id },
      1001,
    ),
  );
});
test("two free slots extend to six; duplicate upgrades cannot spend or grant twice", () => {
  let farm = buy(rich(), "dairy");
  const before = farm.coins,
    id = farm.machines[0].id;
  for (let slots = 2; slots < 6; slots++)
    farm = applyCommand(farm, {
      type: "upgrade-machine",
      machineId: id,
      expectedSlots: slots,
    });
  assert.equal(
    farm.coins,
    before - queueUpgradePrices.reduce((n, p) => n + p, 0),
  );
  assert.equal(farm.machines[0].slots, 6);
  assert.throws(() =>
    applyCommand(farm, {
      type: "upgrade-machine",
      machineId: id,
      expectedSlots: 5,
    }),
  );
});
test("mastery changes only subsequent jobs, not timers already saved", () => {
  let farm = buy(rich(), "bakery");
  farm.inventory.wheat = 30;
  farm.machines[0].completed = 9;
  farm = enqueue(enqueue(farm, "bread", 1000), "bread", 1000);
  const [first, second] = farm.machines[0].jobs,
    id = farm.machines[0].id;
  farm = applyCommand(
    farm,
    { type: "collect-production", machineId: id, jobId: first.id },
    first.readyAt,
  );
  assert.equal(farm.machines[0].completed, 10);
  assert.equal(farm.machines[0].jobs[0].readyAt, second.readyAt);
  farm = enqueue(farm, "bread", first.readyAt);
  assert.equal(farm.machines[0].jobs[1].duration, 291000);
});
test("species feeds, batch atomicity, legacy reserves and exact animal durations", () => {
  let farm = rich();
  farm.inventory.chickenFeed = 2;
  farm.inventory.cowFeed = 1;
  const ids = ["cow-1", "chicken-1", "chicken-2"];
  const fed = applyCommand(
    farm,
    { type: "animal-batch", action: "feed", animalIds: ids },
    1000,
  );
  assert.equal(fed.inventory.chickenFeed, 0);
  assert.equal(fed.inventory.cowFeed, 0);
  for (const animal of fed.animals.filter((a) => ids.includes(a.id)))
    assert.equal(
      animalReadyAt(animal),
      1000 + animalProducts[animal.kind].duration,
    );
  assert.throws(() =>
    applyCommand(
      fed,
      { type: "animal-batch", action: "collect", animalIds: ids },
      2000,
    ),
  );
  const ready = applyCommand(
    fed,
    { type: "animal-batch", action: "collect", animalIds: ids },
    1000 + 3600000,
  );
  assert.equal(ready.inventory.egg, 2);
  assert.equal(ready.inventory.milk, 1);
  const invalid = rich();
  invalid.inventory.chickenFeed = 1;
  const before = structuredClone(invalid);
  assert.throws(() =>
    applyCommand(invalid, {
      type: "animal-batch",
      action: "feed",
      animalIds: ["chicken-1", "chicken-2"],
    }),
  );
  assert.deepEqual(invalid, before);
  assert.throws(() =>
    applyCommand(invalid, {
      type: "animal-batch",
      action: "feed",
      animalIds: ["chicken-1", "chicken-1"],
    }),
  );
  assert.deepEqual(
    Object.values(animalProducts)
      .map((c) => c.duration)
      .sort((a, b) => a - b),
    [1200000, 3600000, 7200000, 10800000, 14400000],
  );
});
test("migration preserves legacy pig output, pending timer, moved pens and all saved resources", () => {
  const old = initialFarm() as unknown as Farm;
  (old as { version: number }).version = 6;
  delete (old as Partial<Farm>).machines;
  old.animals.find((a) => a.kind === "pig")!.fedAt = 1000;
  old.penPositions.cow = { x: 18, y: 16 };
  old.inventory.truffle = 7;
  old.coins = 321;
  const next = migrateFarm(old),
    pig = next.animals.find((a) => a.kind === "pig")!;
  assert.equal(animalReadyAt(pig), 91000);
  assert.equal(animalOutput(pig), "truffle");
  assert.deepEqual(next.penPositions, old.penPositions);
  assert.equal(next.coins, 321);
  const collected = applyCommand(
    next,
    { type: "collect-animal", animalId: pig.id },
    91000,
  );
  assert.equal(collected.inventory.truffle, 8);
  const fed = applyCommand(
    collected,
    { type: "feed-animal", animalId: pig.id },
    92000,
  );
  assert.equal(
    animalOutput(fed.animals.find((a) => a.id === pig.id)!),
    "bacon",
  );
  assert.deepEqual(migrateFarm(next), next);
});
test("sheep purchase respects level, terrain, ownership and wool uses its own feed", () => {
  let farm = rich();
  const target = (() => {
    for (let x = 0; x < 21; x++)
      for (let y = 0; y < 20; y++)
        if (!occupancyIssue(farm, { x, y, w: 3, h: 3 })) return { x, y };
    throw new Error("No sheep space");
  })();
  const low = structuredClone(farm);
  low.xp = 0;
  assert.throws(() => applyCommand(low, { type: "buy-sheep", ...target }));
  farm = applyCommand(farm, { type: "buy-sheep", ...target });
  assert.throws(() => applyCommand(farm, { type: "buy-sheep", ...target }));
  farm.inventory.sheepFeed = 1;
  farm = applyCommand(farm, { type: "feed-animal", animalId: "sheep-1" }, 1000);
  farm = applyCommand(
    farm,
    { type: "collect-animal", animalId: "sheep-1" },
    14401000,
  );
  assert.equal(farm.inventory.wool, 1);
  assert.equal(farm.inventory.sheepFeed, 0);
});
test("sales and orders use real stock, configured values and reachable production chains", () => {
  let farm = rich();
  farm.inventory.bread = 2;
  const sold = applyCommand(farm, {
    type: "sell-item",
    item: "bread",
    amount: 1,
    expectedRevision: farm.revision,
  });
  assert.equal(sold.coins, farm.coins + 10);
  assert.equal(sold.inventory.bread, 1);
  assert.throws(() =>
    applyCommand(sold, {
      type: "sell-item",
      item: "bread",
      amount: 1,
      expectedRevision: farm.revision,
    }),
  );
  assert.throws(() =>
    applyCommand(sold, {
      type: "sell-item",
      item: "bread",
      amount: 99,
      expectedRevision: sold.revision,
    }),
  );
  farm.inventory.bread = 0;
  farm = buy(farm, "cakery");
  for (let i = 0; i < 50; i++) {
    farm.ordersCompleted = i;
    assert.ok(
      !["chocolateCake", "carrotCake", "appleCake", "strawberryCake"].includes(
        currentOrder(farm).item,
      ),
    );
  }
  farm = buy(farm, "dairy");
  const pool = new Set<Item>();
  for (let i = 0; i < 100; i++) {
    farm.ordersCompleted = i;
    pool.add(currentOrder(farm).item);
  }
  assert.ok(pool.has("carrotCake"));
  assert.ok(!pool.has("chocolateCake"));
});
test("validators reject forged outputs, timers, prices, extra rewards and arbitrary machines", () => {
  assert.equal(
    commandSchema.safeParse({
      type: "enqueue-production",
      machineId: "a",
      recipeId: "bread",
      expectedRevision: 1,
      readyAt: 0,
    }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({
      type: "enqueue-production",
      machineId: "a",
      recipeId: "not-a-recipe",
      expectedRevision: 1,
    }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({
      type: "buy-machine",
      kind: "bakery",
      x: 1,
      y: 10,
      price: 0,
    }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({
      type: "sell-item",
      item: "bread",
      amount: -1,
      expectedRevision: 0,
    }).success,
    false,
  );
  assert.equal(
    commandSchema.safeParse({
      type: "collect-production",
      machineId: "a",
      jobId: "b",
      quantity: 999,
    }).success,
    false,
  );
});
test("simultaneous manufacture and duplicate collection remain atomic after file-repository restart", async () => {
  const path = resolve(".data", "production-" + randomUUID() + ".json");
  let farm = buy(rich(), "bakery", Date.now() - 600000);
  farm.inventory.wheat = 12;
  const entry = { player: { farm, expires: Date.now() + 3600000 } };
  await mkdir(resolve(".data"), { recursive: true });
  await writeFile(path, JSON.stringify(entry));
  try {
    let repo = new FileFarmRepository(path);
    const machineId = farm.machines[0].id;
    const requests = await Promise.allSettled(
      [0, 1].map(() =>
        repo.access("player", {
          type: "enqueue-production",
          machineId,
          recipeId: "bread",
          expectedRevision: farm.revision,
        }),
      ),
    );
    assert.equal(requests.filter((r) => r.status === "fulfilled").length, 1);
    const saved = await repo.access("player");
    assert.equal(saved.inventory.wheat, 9);
    const job = saved.machines[0].jobs[0];
    job.startedAt = Date.now() - 300001;
    job.readyAt = Date.now() - 1;
    await writeFile(
      path,
      JSON.stringify({
        player: { farm: saved, expires: entry.player.expires },
      }),
    );
    repo = new FileFarmRepository(path);
    const collects = await Promise.allSettled(
      [0, 1].map(() =>
        repo.access("player", {
          type: "collect-production",
          machineId,
          jobId: job.id,
        }),
      ),
    );
    assert.equal(collects.filter((r) => r.status === "fulfilled").length, 1);
    const restarted = await new FileFarmRepository(path).access("player");
    assert.equal(restarted.inventory.bread, 1);
    assert.equal(restarted.machines[0].completed, 1);
    assert.equal(restarted.inventory.wheat, 9);
    const disk = JSON.parse(await readFile(path, "utf8"));
    assert.equal(disk.player.farm.revision, restarted.revision);
  } finally {
    await unlink(path).catch(() => {});
  }
});
