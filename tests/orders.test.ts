import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initialFarm, migrateFarm, applyCommand } from "../server/services/farm";
import { orderItemAvailable, orderRewards, synchronizeOrders } from "../server/services/orders";
import { orderRules, orderSlotCount } from "../src/types/orders";
import { FileFarmRepository } from "../server/database/file-repository";
import { commandSchema } from "../server/validators/command";
import { type Farm, type Item } from "../src/types/game";

const first = (farm: Farm) => farm.orderBoard!.slots[0].order!;
test("mural começa com dois pedidos persistentes e progride até seis por nível", () => {
  let farm = initialFarm();
  assert.equal(farm.orderBoard!.slots.length, 2);
  assert.deepEqual(first(farm).products, [{ item: "wheat", amount: 4 }]);
  for (const [level, count] of [[1,2],[3,3],[6,4],[10,5],[15,6]]) {
    farm.xp = (level - 1) * 50;
    farm = synchronizeOrders(farm);
    assert.equal(orderSlotCount(level), count);
    assert.equal(farm.orderBoard!.slots.length, count);
  }
  assert.equal(new Set(farm.orderBoard!.slots.map(slot => slot.order!.id)).size, 6);
  assert.equal(synchronizeOrders(farm), farm);
});
test("migração preserva o pedido legado e todos os recursos sem trocar a encomenda ao colher", () => {
  const farm = initialFarm(); delete farm.orderBoard;
  farm.ordersCompleted = 4; farm.inventory.goatMilk = 1; farm.coins = 321;
  const migrated = migrateFarm(farm), order = first(migrated);
  assert.equal(order.legacyNumber, 4);
  assert.deepEqual(order.products, [{ item: "goatMilk", amount: 1 }]);
  assert.equal(order.coins, 28);
  assert.equal(migrated.coins, 321);
  assert.deepEqual(migrated.inventory, farm.inventory);
  migrated.inventory.truffle = 1; migrated.xp += 50;
  assert.deepEqual(first(synchronizeOrders(migrated)), order);
  assert.equal(farm.orderBoard, undefined);
});
test("entrega é atômica, só usa produtos reais e não aceita repetição nem endpoint antigo para ignorar espera", () => {
  const farm = initialFarm(), order = first(farm);
  order.products.push({ item: "milk", amount: 1 });
  const before = structuredClone(farm);
  assert.throws(() => applyCommand(farm, { type: "deliver-board-order", orderId: order.id }, 1000), /Faltam/);
  assert.deepEqual(farm, before);
  farm.inventory.milk = 1;
  const delivered = applyCommand(farm, { type: "deliver-board-order", orderId: order.id }, 1000);
  assert.equal(delivered.inventory.milk, 0); assert.equal(delivered.inventory.wheat, 4);
  assert.equal(delivered.coins, farm.coins + order.coins);
  assert.equal(delivered.xp, farm.xp + order.xp);
  assert.equal(delivered.ordersCompleted, 1);
  assert.equal(delivered.orderBoard!.slots[0].refillAt, 1000 + orderRules.deliveryDelayMs);
  for (const type of ["deliver-board-order", "discard-order"] as const)
    assert.throws(() => applyCommand(delivered, { type, orderId: order.id }, 1001));
  assert.throws(() => applyCommand(delivered, { type: "deliver-order", orderId: 0 }, 1001));
});
test("descartar não concede recursos e reposição usa prazo do servidor uma única vez, mesmo offline", () => {
  const farm = initialFarm(), order = first(farm);
  const discarded = applyCommand(farm, { type: "discard-order", orderId: order.id }, 5000);
  assert.equal(discarded.coins, farm.coins); assert.equal(discarded.xp, farm.xp);
  assert.deepEqual(discarded.inventory, farm.inventory);
  assert.equal(discarded.ordersCompleted, 0);
  const readyAt = 5000 + orderRules.discardDelayMs;
  assert.equal(synchronizeOrders(discarded, readyAt - 1).orderBoard!.slots[0].order, null);
  const replaced = synchronizeOrders(discarded, readyAt + 86400000), newOrder = first(replaced);
  assert.notEqual(newOrder.id, order.id);
  assert.equal(replaced.orderBoard!.slots[0].generation, 1);
  assert.equal(synchronizeOrders(replaced, readyAt + 86400001), replaced);
  assert.throws(() => applyCommand(replaced, { type: "deliver-board-order", orderId: order.id }, readyAt + 86400001));
});
test("novos pedidos respeitam nível, posse das máquinas, fontes agrícolas e quantidades de armazenamento", () => {
  let farm = initialFarm(), now = Date.now();
  for (let i = 0; i < 30; i++) {
    const slot = farm.orderBoard!.slots.find(slot => slot.order)!;
    farm = applyCommand(farm, { type: "discard-order", orderId: slot.order!.id }, now);
    now += orderRules.discardDelayMs;
    farm = synchronizeOrders(farm, now);
    for (const slot of farm.orderBoard!.slots) if (slot.order && slot.order.legacyNumber === undefined) for (const p of slot.order.products) {
      assert.ok(["wheat", "corn", "egg", "apple"].includes(p.item));
      assert.ok(orderItemAvailable(farm, p.item)); assert.ok(p.amount > 0 && p.amount <= 6);
    }
  }
  farm.xp = 1500;
  assert.equal(orderItemAvailable(farm, "bread"), false);
  assert.equal(orderItemAvailable(farm, "chocolateCake"), false);
  farm.machines.push({ id: "bakery-owned", kind: "bakery", x: 0, y: 0, slots: 2, completed: 0, builtAt: now, jobs: [] });
  assert.equal(orderItemAvailable(farm, "bread"), true);
  assert.equal(orderItemAvailable(farm, "chocolateCake"), false);
  farm.xp = 0; assert.equal(orderItemAvailable(farm, "bread"), false);
  assert.equal(orderItemAvailable(farm, "feed"), false);
  assert.equal(orderItemAvailable(farm, "axe"), false);
});
test("recompensas configuradas valorizam quantidade, ingredientes e complexidade sem valor enviado pelo cliente", () => {
  const small = orderRewards([{ item: "wheat", amount: 2 }]), big = orderRewards([{ item: "wheat", amount: 6 }]);
  assert.ok(big.coins > small.coins && big.xp >= small.xp);
  const complex = orderRewards([{ item: "cake", amount: 1 }, { item: "cream", amount: 1 }]);
  assert.ok(complex.coins > small.coins && complex.xp > small.xp);
  const id = first(initialFarm()).id;
  for (const extra of [{ coins: 9999 }, { xp: 999 }, { now: 9999999999 }, { products: [{ item: "wheat", amount: 0 }] }])
    assert.equal(commandSchema.safeParse({ type: "deliver-board-order", orderId: id, ...extra }).success, false);
  assert.equal(commandSchema.safeParse({ type: "discard-order", orderId: "other-user-order" }).success, false);
});
test("duas entregas concorrentes concedem uma recompensa, pedidos pertencem à sessão e sobrevivem ao reinício", async () => {
  const directory = await mkdtemp(join(tmpdir(), "farm-orders-")), path = join(directory, "save.json");
  try {
    const repository = new FileFarmRepository(path);
    await repository.create("owner"); await repository.create("other");
    const before = await repository.access("owner"), order = first(before);
    await assert.rejects(repository.access("other", { type: "deliver-board-order", orderId: order.id }));
    const results = await Promise.allSettled([1,2].map(() => repository.access("owner", { type: "deliver-board-order", orderId: order.id })));
    assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    const after = await new FileFarmRepository(path).access("owner");
    assert.equal(after.coins, before.coins + order.coins); assert.equal(after.ordersCompleted, 1);
    assert.equal(after.inventory.wheat, before.inventory.wheat - 4);
    const entries = JSON.parse(await readFile(path, "utf8"));
    entries.owner.farm.orderBoard.slots[0].refillAt = Date.now() - 1;
    await writeFile(path, JSON.stringify(entries));
    const restarted = new FileFarmRepository(path), filled = await restarted.access("owner");
    assert.ok(first(filled).id !== order.id);
    assert.equal(first(await restarted.access("owner")).id, first(filled).id);
    assert.equal(JSON.parse(await readFile(path, "utf8")).owner.farm.orderBoard.slots[0].order.id, first(filled).id);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
