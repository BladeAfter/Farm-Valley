import { toolIds } from "../src/types/land";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialFarm,
  applyCommand,
  migrateFarm,
} from "../server/services/farm";
import {
  animalProducts,
  barnUsed,
  siloUsed,
  type Farm,
} from "../src/types/game";
import { commandSchema } from "../server/validators/command";

for (const [kind, id, item] of [
  ["goat", "goat-1", "goatMilk"],
  ["pig", "pig-1", "bacon"],
] as const) {
  test(
    kind + " usa racao, respeita tempo e coleta um produto sem duplicar",
    () => {
      const before = initialFarm();
      const fed = applyCommand(
        before,
        { type: "feed-animal", animalId: id },
        1000,
      );
      assert.equal(fed.inventory.feed, 3);
      assert.throws(() =>
        applyCommand(fed, { type: "feed-animal", animalId: id }, 1001),
      );
      const duration = animalProducts[kind].duration;
      assert.throws(() =>
        applyCommand(
          fed,
          { type: "collect-animal", animalId: id },
          1000 + duration - 1,
        ),
      );
      const collected = applyCommand(
        fed,
        { type: "collect-animal", animalId: id },
        1000 + duration,
      );
      assert.equal(collected.inventory[item], 1);
      assert.equal(collected.xp, animalProducts[kind].xp);
      assert.equal(collected.animals.find((a) => a.id === id)?.fedAt, null);
      assert.throws(() =>
        applyCommand(
          collected,
          { type: "collect-animal", animalId: id },
          2000 + duration,
        ),
      );
      assert.equal(before.inventory.feed, 4);
      assert.equal(before.inventory[item], 0);
    },
  );
}
test("novos produtos contam no celeiro e coleta nao e perdida quando esta cheio", () => {
  const fed = applyCommand(
    initialFarm(),
    { type: "feed-animal", animalId: "goat-1" },
    0,
  );
  for (const tool of toolIds) fed.inventory[tool] = 0;
  fed.inventory.feed = 0;
  fed.inventory.goatMilk = 99;
  fed.inventory.truffle = 1;
  assert.equal(barnUsed(fed), 100);
  assert.equal(siloUsed(fed), 14);
  assert.throws(
    () =>
      applyCommand(
        fed,
        { type: "collect-animal", animalId: "goat-1" },
        animalProducts.goat.duration,
      ),
    /Celeiro cheio/,
  );
  assert.equal(fed.animals.find((a) => a.id === "goat-1")?.fedAt, 0);
  fed.inventory.truffle = 0;
  assert.equal(
    applyCommand(
      fed,
      { type: "collect-animal", animalId: "goat-1" },
      animalProducts.goat.duration,
    ).inventory.goatMilk,
    100,
  );
});
test("migracao v3 preserva fazenda melhorada e adiciona uma cabra e um porco", () => {
  const old = {
    ...initialFarm(),
    version: 3,
    animals: initialFarm().animals.filter(
      (a) => a.kind === "cow" || a.kind === "chicken",
    ),
  } as unknown as Farm;
  delete (old.inventory as Partial<Farm["inventory"]>).goatMilk;
  delete (old.inventory as Partial<Farm["inventory"]>).truffle;
  old.coins = 321;
  old.xp = 123;
  old.storage = { barn: 2, silo: 3 };
  old.animals[0].fedAt = 5678;
  const next = migrateFarm(old);
  assert.equal(next.version, 7);
  assert.equal(next.coins, 321);
  assert.equal(next.xp, 123);
  assert.deepEqual(next.storage, { barn: 2, silo: 3 });
  assert.equal(next.animals[0].fedAt, 5678);
  assert.equal(next.animals.filter((a) => a.kind === "goat").length, 1);
  assert.equal(next.animals.filter((a) => a.kind === "pig").length, 1);
  assert.equal(next.inventory.goatMilk, 0);
  assert.equal(next.inventory.truffle, 0);
  assert.equal(migrateFarm(next).animals.length, 5);
  assert.equal(old.animals.length, 3);
});
test("pedidos utilizam leite de cabra e trufas do inventario", () => {
  const farm = initialFarm();
  farm.ordersCompleted = 4;
  assert.throws(() =>
    applyCommand(farm, { type: "deliver-order", orderId: 4 }),
  );
  farm.inventory.goatMilk = 1;
  const milk = applyCommand(farm, { type: "deliver-order", orderId: 4 });
  assert.equal(milk.inventory.goatMilk, 0);
  assert.equal(milk.coins, 178);
  milk.inventory.truffle = 1;
  const truffle = applyCommand(milk, { type: "deliver-order", orderId: 5 });
  assert.equal(truffle.inventory.truffle, 0);
  assert.equal(truffle.coins, 210);
  assert.throws(() =>
    applyCommand(truffle, { type: "deliver-order", orderId: 5 }),
  );
});
test("cliente nao define produto quantidade ou relogio dos novos animais", () => {
  for (const payload of [
    { type: "feed-animal", animalId: "goat-1", fedAt: 0 },
    {
      type: "collect-animal",
      animalId: "pig-1",
      product: "truffle",
      quantity: 999,
    },
  ])
    assert.equal(commandSchema.safeParse(payload).success, false);
  assert.throws(() =>
    applyCommand(initialFarm(), { type: "feed-animal", animalId: "unknown" }),
  );
});
