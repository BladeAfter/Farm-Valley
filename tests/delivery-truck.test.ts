import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialFarm,
  applyCommand,
  migrateFarm,
} from "../server/services/farm";
import { deliveryTruckState } from "../src/data/deliveryTruck";
import { orderRules } from "../src/types/orders";
test("viagem tem carregamento, saída, ausência, retorno e estacionamento determinísticos", () => {
  const trip = { orderId: "test", departedAt: 1000, returnsAt: 46000 };
  assert.equal(deliveryTruckState(undefined, 0).phase, "idle");
  assert.equal(deliveryTruckState(trip, 1000).phase, "loading");
  assert.equal(deliveryTruckState(trip, 3500).phase, "departing");
  assert.equal(deliveryTruckState(trip, 10000).visible, false);
  assert.equal(deliveryTruckState(trip, 42000).phase, "returning");
  assert.equal(deliveryTruckState(trip, 46000).phase, "idle");
});
test("servidor reserva um caminhão, preserva viagem no reload e impede segundo envio", () => {
  const farm = initialFarm(),
    now = Date.now();
  for (const slot of farm.orderBoard!.slots)
    for (const product of slot.order!.products)
      farm.inventory[product.item] = 100;
  const first = farm.orderBoard!.slots[0].order!,
    second = farm.orderBoard!.slots[1].order!;
  const sent = applyCommand(
    farm,
    { type: "deliver-board-order", orderId: first.id },
    now,
  );
  assert.equal(
    sent.orderBoard!.truck!.returnsAt,
    now + orderRules.truckTravelMs,
  );
  assert.equal(sent.coins, farm.coins + first.coins);
  assert.throws(
    () =>
      applyCommand(
        sent,
        { type: "deliver-board-order", orderId: second.id },
        now + 1000,
      ),
    /caminhão/,
  );
  assert.throws(() =>
    applyCommand(
      sent,
      { type: "deliver-board-order", orderId: first.id },
      now + 1000,
    ),
  );
  const restored = migrateFarm(JSON.parse(JSON.stringify(sent)));
  assert.deepEqual(restored.orderBoard!.truck, sent.orderBoard!.truck);
  const next = applyCommand(
    restored,
    { type: "deliver-board-order", orderId: second.id },
    now + orderRules.truckTravelMs,
  );
  assert.equal(next.coins, sent.coins + second.coins);
  assert.equal(
    deliveryTruckState(sent.orderBoard!.truck, now + 86400000).phase,
    "idle",
  );
});
