import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initialFarm } from "../server/services/farm.js";
import {
  trade,
  marketSchema,
  publicListings,
} from "../server/services/market.js";
import { FileFarmRepository } from "../server/database/file-repository.js";
import type { MarketListing } from "../src/types/market.js";
import type { Item } from "../src/types/game.js";
test("ferramentas, TNT, frutas e leite transferem estoque e moedas uma única vez", () => {
  for (const item of ["axe", "tnt", "apple", "milk"] as Item[]) {
    const seller = initialFarm(),
      buyer = initialFarm(),
      farms = { seller, buyer },
      listings: MarketListing[] = [];
    seller.inventory[item] = 3;
    const coins = seller.coins + buyer.coins;
    const id = randomUUID();
    trade(farms, listings, "seller", {
      type: "list",
      id,
      item,
      amount: 2,
      price: 2,
    });
    assert.equal(seller.inventory[item], 1);
    assert.throws(() => trade(farms, listings, "seller", { type: "buy", id }));
    const stock = buyer.inventory[item];
    trade(farms, listings, "buyer", { type: "buy", id });
    assert.equal(buyer.inventory[item], stock + 2);
    assert.equal(seller.coins + buyer.coins, coins);
    assert.throws(() => trade(farms, listings, "buyer", { type: "buy", id }));
    assert.throws(() =>
      trade(farms, listings, "seller", {
        type: "list",
        id,
        item,
        amount: 2,
        price: 2,
      }),
    );
    assert.equal(publicListings(listings, "buyer").length, 0);
  }
});
test("cancelamento devolve reserva; estoque, capacidade, preço e campos forjados são validados", () => {
  const seller = initialFarm(),
    buyer = initialFarm(),
    farms = { seller, buyer },
    listings: MarketListing[] = [];
  seller.inventory.milk = 5;
  const id = randomUUID();
  trade(farms, listings, "seller", {
    type: "list",
    id,
    item: "milk",
    amount: 2,
    price: 2,
  });
  assert.ok(!("seller" in publicListings(listings, "buyer")[0]));
  assert.throws(() => trade(farms, listings, "buyer", { type: "cancel", id }));
  buyer.inventory.milk = 10000;
  assert.throws(() => trade(farms, listings, "buyer", { type: "buy", id }));
  assert.equal(listings[0].status, "active");
  trade(farms, listings, "seller", { type: "cancel", id });
  assert.equal(seller.inventory.milk, 5);
  assert.throws(() => trade(farms, listings, "seller", { type: "cancel", id }));
  assert.throws(() =>
    trade(farms, listings, "seller", {
      type: "list",
      id: randomUUID(),
      item: "milk",
      amount: 6,
      price: 1,
    }),
  );
  assert.throws(() =>
    trade(farms, listings, "seller", {
      type: "list",
      id: randomUUID(),
      item: "milk",
      amount: 1,
      price: 1000000,
    }),
  );
  assert.equal(
    marketSchema.safeParse({ type: "buy", id: randomUUID(), price: 0 }).success,
    false,
  );
  assert.equal(
    marketSchema.safeParse({
      type: "list",
      id: randomUUID(),
      item: "milk",
      amount: -1,
      price: 1,
    }).success,
    false,
  );
});
test("duas compras simultâneas têm um vencedor e persistem após reinício", async () => {
  const directory = await mkdtemp(join(tmpdir(), "farm-market-")),
    path = join(directory, "save.json");
  try {
    const seller = "a".repeat(64),
      buyer = "b".repeat(64),
      other = "c".repeat(64);
    const farm = initialFarm();
    farm.inventory.milk = 5;
    await writeFile(
      path,
      JSON.stringify(
        Object.fromEntries(
          [seller, buyer, other].map((id) => [
            id,
            { farm: structuredClone(farm), expires: Date.now() + 60000 },
          ]),
        ),
      ),
    );
    const repo = new FileFarmRepository(path),
      id = randomUUID();
    await repo.market(seller, {
      type: "list",
      id,
      item: "milk",
      amount: 2,
      price: 10,
    });
    const outcomes = await Promise.allSettled([
      repo.market(buyer, { type: "buy", id }),
      repo.market(other, { type: "buy", id }),
    ]);
    assert.equal(outcomes.filter((o) => o.status === "fulfilled").length, 1);
    const restarted = new FileFarmRepository(path);
    assert.equal((await restarted.market(seller)).listings.length, 0);
    assert.equal((await restarted.access(seller)).coins, farm.coins + 10);
    assert.equal(
      (await restarted.access(buyer)).coins +
        (await restarted.access(other)).coins,
      farm.coins * 2 - 10,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
