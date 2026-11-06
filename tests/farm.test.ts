import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialFarm,
  applyCommand,
  migrateFarm,
} from "../server/services/farm";
import { animalProducts, crops, type Farm } from "../src/types/game";
import { toIso, fromIso } from "../src/game/map/isometric";
import { commandSchema } from "../server/validators/command";
const empty = () => initialFarm({ planted: false });
test("plantio consome semente; colheita devolve duas sem custo em moedas", () => {
  const initial = empty(),
    planted = applyCommand(
      initial,
      { type: "plant", x: 7, y: 7, crop: "wheat" },
      1000,
    );
  assert.equal(planted.inventory.wheat, 7);
  assert.equal(planted.coins, 150);
  assert.equal(initial.inventory.wheat, 8);
  assert.throws(() =>
    applyCommand(planted, { type: "harvest", x: 7, y: 7 }, 120999),
  );
  const harvested = applyCommand(
    planted,
    { type: "harvest", x: 7, y: 7 },
    121000,
  );
  assert.equal(harvested.inventory.wheat, 9);
  assert.equal(harvested.xp, 1);
  assert.throws(() =>
    applyCommand(harvested, { type: "harvest", x: 7, y: 7 }, 122000),
  );
});
test("sem sementes, canteiro invalido e plantio duplicado sao rejeitados", () => {
  const farm = empty();
  farm.inventory.wheat = 0;
  assert.throws(() =>
    applyCommand(farm, { type: "plant", x: 7, y: 7, crop: "wheat" }),
  );
  assert.throws(() =>
    applyCommand(empty(), { type: "plant", x: 0, y: 0, crop: "wheat" }),
  );
  const planted = applyCommand(empty(), {
    type: "plant",
    x: 7,
    y: 7,
    crop: "corn",
  });
  assert.throws(() =>
    applyCommand(planted, { type: "plant", x: 7, y: 7, crop: "corn" }),
  );
});
test("tempos de trigo e milho no servidor", () => {
  assert.equal(crops.wheat.duration, 120000);
  assert.equal(crops.corn.duration, 300000);
  const farm = applyCommand(
    empty(),
    { type: "plant", x: 7, y: 7, crop: "corn" },
    0,
  );
  assert.throws(() =>
    applyCommand(farm, { type: "harvest", x: 7, y: 7 }, 299999),
  );
  assert.equal(
    applyCommand(farm, { type: "harvest", x: 7, y: 7 }, 300000).inventory.corn,
    7,
  );
});
test("arrasto em lote e atomico e rejeita coordenadas duplicadas", () => {
  const initial = empty();
  const command = {
    type: "field-stroke" as const,
    action: "plant" as const,
    crop: "wheat" as const,
    cells: [
      { x: 7, y: 7 },
      { x: 8, y: 7 },
    ],
  };
  const planted = applyCommand(initial, command, 0);
  assert.equal(planted.inventory.wheat, 6);
  assert.equal(planted.revision, 1);
  const harvested = applyCommand(
    planted,
    { ...command, action: "harvest" },
    120000,
  );
  assert.equal(harvested.inventory.wheat, 10);
  assert.throws(() =>
    applyCommand(initial, {
      ...command,
      cells: [
        { x: 7, y: 7 },
        { x: 0, y: 0 },
      ],
    }),
  );
  assert.equal(initial.inventory.wheat, 8);
  assert.equal(initial.plots[0].crop, null);
  assert.throws(() =>
    applyCommand(initial, {
      ...command,
      cells: [
        { x: 7, y: 7 },
        { x: 7, y: 7 },
      ],
    }),
  );
  initial.inventory.wheat = 1;
  assert.throws(() => applyCommand(initial, command));
  assert.equal(initial.inventory.wheat, 1);
});
test("capacidade do silo e independente do celeiro", () => {
  const farm = applyCommand(
    empty(),
    { type: "plant", x: 7, y: 7, crop: "wheat" },
    0,
  );
  farm.inventory.feed = 100;
  assert.equal(
    applyCommand(farm, { type: "harvest", x: 7, y: 7 }, 120000).inventory.wheat,
    9,
  );
  farm.inventory.wheat = 99;
  farm.inventory.corn = 0;
  assert.throws(() =>
    applyCommand(farm, { type: "harvest", x: 7, y: 7 }, 120000),
  );
});
test("animal consome racao uma vez e produz com tempo autoritativo", () => {
  const initial = empty(),
    fed = applyCommand(initial, { type: "feed-animal", animalId: "cow-1" }, 0);
  assert.equal(fed.inventory.feed, 3);
  assert.equal(fed.animals[0].fedAt, 0);
  assert.throws(() =>
    applyCommand(fed, { type: "feed-animal", animalId: "cow-1" }, 0),
  );
  assert.throws(() =>
    applyCommand(
      fed,
      { type: "collect-animal", animalId: "cow-1" },
      animalProducts.cow.duration - 1,
    ),
  );
  const collected = applyCommand(
    fed,
    { type: "collect-animal", animalId: "cow-1" },
    animalProducts.cow.duration,
  );
  assert.equal(collected.inventory.milk, 1);
  assert.equal(collected.animals[0].fedAt, null);
  assert.throws(() =>
    applyCommand(
      collected,
      { type: "collect-animal", animalId: "cow-1" },
      animalProducts.cow.duration * 2,
    ),
  );
});
test("galinha, falta de racao e limite de celeiro", () => {
  const initial = empty();
  initial.inventory.feed = 0;
  assert.throws(() =>
    applyCommand(initial, { type: "feed-animal", animalId: "chicken-1" }),
  );
  const fed = applyCommand(
    empty(),
    { type: "feed-animal", animalId: "chicken-1" },
    0,
  );
  assert.equal(
    applyCommand(
      fed,
      { type: "collect-animal", animalId: "chicken-1" },
      animalProducts.chicken.duration,
    ).inventory.egg,
    1,
  );
  fed.inventory.feed = 100;
  assert.throws(() =>
    applyCommand(
      fed,
      { type: "collect-animal", animalId: "chicken-1" },
      animalProducts.chicken.duration,
    ),
  );
});
test("pedido consome produto, recompensa e bloqueia repeticao", () => {
  const initial = empty(),
    delivered = applyCommand(initial, { type: "deliver-order", orderId: 0 });
  assert.equal(delivered.inventory.wheat, 4);
  assert.equal(delivered.coins, 166);
  assert.equal(delivered.xp, 5);
  assert.throws(() =>
    applyCommand(delivered, { type: "deliver-order", orderId: 0 }),
  );
  initial.inventory.wheat = 0;
  assert.throws(() =>
    applyCommand(initial, { type: "deliver-order", orderId: 0 }),
  );
});
test("compra de ra\u00e7\u00e3o espec\u00edfica desconta recursos; receita instant\u00e2nea antiga foi desativada", () => {
  const bought = applyCommand(empty(), { type: "buy-feed" });
  assert.equal(bought.coins, 132);
  assert.equal(bought.inventory.chickenFeed, 3);
  assert.equal(bought.inventory.feed, 4);
  assert.throws(
    () => applyCommand(empty(), { type: "make-feed" }),
    /f\u00e1brica/,
  );
  const poor = empty();
  poor.coins = 0;
  assert.throws(() => applyCommand(poor, { type: "buy-feed" }));
});

test("sementes de reserva evitam bloqueio por falta de sementes", () => {
  const farm = empty();
  farm.inventory.wheat = 0;
  const bought = applyCommand(farm, { type: "buy-seed", crop: "wheat" });
  assert.equal(bought.inventory.wheat, 3);
  assert.equal(bought.coins, 147);
});
test("validador rejeita economia, relogio e lotes excessivos enviados pelo cliente", () => {
  for (const payload of [
    { type: "plant", x: 7, y: 7, crop: "wheat", coins: 999 },
    { type: "plant", x: 7, y: 7, crop: "wheat", plantedAt: 0 },
    { type: "plant", x: 7, y: 7, crop: "diamond" },
    {
      type: "field-stroke",
      action: "plant",
      crop: "wheat",
      cells: Array.from({ length: 65 }, () => ({ x: 7, y: 7 })),
    },
    { type: "feed-animal", animalId: "cow-1", fedAt: 0 },
  ])
    assert.equal(commandSchema.safeParse(payload).success, false);
});
test("migracao preserva progresso preexistente", () => {
  const old = {
    coins: 99,
    xp: 15,
    inventory: { wheat: 2, corn: 3 },
    plots: [{ x: 7, y: 7, crop: "wheat", plantedAt: 1234 }],
    revision: 7,
  } as unknown as Farm;
  const next = migrateFarm(old);
  assert.equal(next.coins, 99);
  assert.equal(next.xp, 15);
  assert.equal(next.inventory.wheat, 2);
  assert.equal(next.plots[0].plantedAt, 1234);
  assert.equal(next.version, 7);
});
test("grade isometrica reversivel", () => {
  for (let x = 0; x < 25; x++)
    for (let y = 0; y < 25; y++) {
      const p = toIso(x, y);
      assert.deepEqual(fromIso(p.x, p.y), { x, y });
    }
});
