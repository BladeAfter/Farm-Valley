import { randomUUID } from "node:crypto";
import { occupancyIssue } from "../../src/data/land.js";
import {
  animalProducts,
  cropIds,
  crops,
  currentOrder,
  items,
  playerLevel,
  storageCapacity,
  type AnimalKind,
  type Command,
  type Crop,
  type Farm,
  type Item,
} from "../../src/types/game.js";
import {
  fruitIds,
  fruitSpecies,
  type FruitSpecies,
} from "../../src/types/orchard.js";
import {
  recipeIds,
  recipes,
  type RecipeId,
} from "../../src/data/production.js";
import {
  orderRules,
  orderSlotCount,
  type CustomerId,
  type DeliveryOrder,
  type OrderBoard,
  type OrderSlot,
} from "../../src/types/orders.js";

export function orderItemAvailable(
  farm: Farm,
  item: Item,
  seen = new Set<Item>(),
): boolean {
  if (seen.has(item) || !items[item].sellPrice) return false;
  const level = playerLevel(farm),
    visited = new Set(seen).add(item);
  if (cropIds.includes(item as Crop)) return level >= crops[item as Crop].level;
  if (fruitIds.includes(item as FruitSpecies))
    return (
      level >= fruitSpecies[item as FruitSpecies].level &&
      (farm.inventory[item] > 0 ||
        farm.fruitTrees.some((t) => t.species === item && t.removedAt === null))
    );
  const kind = (Object.keys(animalProducts) as AnimalKind[]).find(
    (kind) => animalProducts[kind].product === item,
  );
  if (kind)
    return (
      level >= animalProducts[kind].level &&
      (farm.inventory[item] > 0 || farm.animals.some((a) => a.kind === kind))
    );
  if (item === "truffle") return farm.inventory.truffle > 0;
  const recipe = recipes[item as RecipeId];
  return (
    !!recipe &&
    level >= recipe.level &&
    (farm.inventory[item] > 0 ||
      (farm.machines.some((m) => m.kind === recipe.machine) &&
        Object.entries(recipe.ingredients).every(
          ([id, amount]) =>
            farm.inventory[id as Item] >= amount ||
            orderItemAvailable(farm, id as Item, visited),
        )))
  );
}

function customerFor(item: Item): CustomerId {
  if (
    fruitIds.includes(item as FruitSpecies) ||
    recipes[item as RecipeId]?.machine === "juicer"
  )
    return "clara";
  const machine = recipes[item as RecipeId]?.machine;
  if (machine === "bakery") return "rosa";
  if (machine === "dairy" || item === "milk" || item === "goatMilk")
    return "bento";
  if (["cakery", "sugarMill", "iceCream", "popcorn"].includes(machine))
    return "teresa";
  if (
    cropIds.includes(item as Crop) ||
    item === "egg" ||
    machine === "feedMill"
  )
    return "miguel";
  return "pedro";
}
function productValue(item: Item): number {
  const recipe = recipes[item as RecipeId];
  const ingredientValue = recipe
    ? Object.entries(recipe.ingredients).reduce(
        (sum, [id, amount]) =>
          sum + (items[id as Item].sellPrice ?? 0) * amount,
        0,
      ) / recipe.quantity
    : 0;
  return Math.max(items[item].sellPrice ?? 1, ingredientValue);
}
export function orderRewards(products: DeliveryOrder["products"]) {
  let value = 0,
    minutes = 0,
    effort = 0;
  for (const { item, amount } of products) {
    value += productValue(item) * amount;
    const recipe = recipes[item as RecipeId],
      crop = crops[item as Crop];
    minutes +=
      (recipe
        ? recipe.minutes / recipe.quantity
        : crop
          ? crop.duration / 60000 / crop.yield
          : 15) * amount;
    effort +=
      (recipe ? recipe.xp / recipe.quantity : crop ? crop.xp / crop.yield : 2) *
      amount;
  }
  return {
    coins: Math.ceil(value * 1.2 + Math.min(value * 0.3, minutes * 0.025)),
    xp: Math.max(
      3,
      Math.ceil(effort * 0.6) +
        Math.min(8, Math.floor(minutes / 40)) +
        products.length -
        1,
    ),
  };
}
function makeOrder(
  farm: Farm,
  board: OrderBoard,
  slot: OrderSlot,
  now: number,
): DeliveryOrder {
  let seed =
    (farm.landSeed ^
      Math.imul(board.nextNumber + slot.generation * 71, 2654435761)) >>>
    0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const pool = [
    ...cropIds,
    "egg",
    "milk",
    "goatMilk",
    "bacon",
    "wool",
    "truffle",
    ...fruitIds,
    ...recipeIds,
  ] as Item[];
  const available = [...new Set(pool)].filter((item) =>
    orderItemAvailable(farm, item),
  );
  const others = new Set(
    board.slots
      .filter((s) => s !== slot)
      .map((s) => s.order?.products[0]?.item),
  );
  const varied = available.filter((item) => !others.has(item));
  const candidates = varied.length ? varied : available;
  const first = candidates[Math.floor(random() * candidates.length)] ?? "wheat";
  const picks = [first];
  if (playerLevel(farm) >= 3 && available.length > 1 && random() > 0.4) {
    const second = available.filter((id) => id !== first);
    picks.push(second[Math.floor(random() * second.length)]);
  }
  const products = picks.map((item) => {
    const agricultural =
      cropIds.includes(item as Crop) || fruitIds.includes(item as FruitSpecies);
    const capacity = storageCapacity(
      farm,
      cropIds.includes(item as Crop) ? "silo" : "barn",
    );
    const maximum = Math.min(
      agricultural ? 6 : 2,
      Math.max(1, Math.floor(capacity * 0.06)),
      Math.max(2, 2 + Math.floor(playerLevel(farm) / 5)),
    );
    return {
      item,
      amount: agricultural
        ? 2 + Math.floor(random() * Math.max(1, maximum - 1))
        : 1 + Math.floor(random() * Math.min(maximum, 2)),
    };
  });
  return {
    id: randomUUID(),
    number: board.nextNumber++,
    customer: customerFor(first),
    products,
    ...orderRewards(products),
    createdAt: now,
  };
}

/** Called under the same repository lock as all other farm operations. Never mutates a read snapshot. */
export function synchronizeOrders(previous: Farm, now = Date.now()): Farm {
  const count = orderSlotCount(playerLevel(previous));
  if (
    previous.orderBoard &&
    previous.orderBoard.position !== undefined &&
    previous.orderBoard.slots.length >= count &&
    !previous.orderBoard.slots.some(
      (slot) => !slot.order && slot.refillAt !== null && now >= slot.refillAt,
    )
  )
    return previous;
  const farm = structuredClone(previous);
  if (!farm.orderBoard) {
    const legacy = currentOrder(previous);
    const customer = legacy.customer.includes("Rosa")
      ? "rosa"
      : legacy.customer.includes("Bento")
        ? "bento"
        : customerFor(legacy.item);
    farm.orderBoard = {
      schema: 1,
      nextNumber: farm.ordersCompleted + 2,
      slots: [
        {
          id: "slot-1",
          generation: 0,
          refillAt: null,
          order: {
            id: randomUUID(),
            number: farm.ordersCompleted + 1,
            legacyNumber: farm.ordersCompleted,
            customer,
            customerName: legacy.customer,
            products: [{ item: legacy.item, amount: legacy.amount }],
            coins: legacy.coins,
            xp: legacy.xp,
            createdAt: now,
          },
        },
      ],
    };
  }
  const board = farm.orderBoard;
  if (board.position === undefined) {
    const candidates = [
      { x: 7, y: 3.5 },
      { x: 8.5, y: 3.5 },
      { x: 3.5, y: 3.5 },
      { x: 6.5, y: 13.5 },
    ];
    for (let x = 1; x < 22; x++)
      for (let y = 1; y < 22; y++) candidates.push({ x, y });
    board.position =
      candidates.find(
        (p) =>
          !occupancyIssue(farm, { x: p.x - 0.5, y: p.y - 0.5, w: 1, h: 1 }),
      ) ?? null;
  }
  while (board.slots.length < count)
    board.slots.push({
      id: "slot-" + (board.slots.length + 1),
      generation: 0,
      order: null,
      refillAt: now,
    });
  for (const slot of board.slots)
    if (!slot.order && slot.refillAt !== null && now >= slot.refillAt) {
      slot.order = makeOrder(farm, board, slot, now);
      slot.refillAt = null;
    }
  return farm;
}

export function applyOrderCommand(
  farm: Farm,
  command: Command,
  now: number,
): boolean {
  if (
    !["deliver-order", "deliver-board-order", "discard-order"].includes(
      command.type,
    )
  )
    return false;
  if (
    command.type !== "deliver-order" &&
    command.type !== "deliver-board-order" &&
    command.type !== "discard-order"
  )
    return false;
  const slot = farm.orderBoard?.slots.find((slot) =>
    command.type === "deliver-order"
      ? slot.order?.legacyNumber === command.orderId
      : slot.order?.id === command.orderId,
  );
  const order = slot?.order;
  if (!slot || !order)
    throw new Error("Este pedido já mudou. Atualize o mural.");
  if (
    command.type === "deliver-order" &&
    command.item &&
    command.item !== order.products[0].item
  )
    throw new Error("O produto do pedido mudou.");
  if (command.type !== "discard-order") {
    if (farm.orderBoard?.truck && now < farm.orderBoard.truck.returnsAt)
      throw new Error("Aguarde o caminhão retornar para enviar outro pedido.");
    if (order.products.some((p) => farm.inventory[p.item] < p.amount))
      throw new Error("Faltam produtos para entregar este pedido.");
    for (const product of order.products)
      farm.inventory[product.item] -= product.amount;
    farm.coins += order.coins;
    farm.xp += order.xp;
    farm.ordersCompleted++;
    farm.orderBoard!.truck = { orderId:order.id, departedAt:now, returnsAt:now+orderRules.truckTravelMs };
  }
  slot.order = null;
  slot.generation++;
  slot.refillAt =
    now +
    (command.type === "discard-order"
      ? orderRules.discardDelayMs
      : orderRules.deliveryDelayMs);
  return true;
}
