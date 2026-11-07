export const cropIds = [
  "wheat",
  "corn",
  "carrot",
  "soybean",
  "sugarcane",
  "strawberry",
  "potato",
] as const;
export type Crop = (typeof cropIds)[number];
import {
  productionItems,
  productionItemIds,
  recipes,
  recipeIds,
  type ProductionItem,
  type RecipeId,
  type Machine,
  type MachineKind,
} from "../data/production";
import {
  tools,
  toolIds,
  type ToolItem,
  type Obstacle,
  type LandArea,
  type BuildingId,
  type PlacedDecoration,
} from "./land";
import {
  fruitIds,
  fruitSpecies,
  type FruitSpecies,
  type FruitTree,
} from "./orchard";
export type Item =
  | Crop
  | "feed"
  | "milk"
  | "egg"
  | "goatMilk"
  | "truffle"
  | ToolItem
  | ProductionItem
  | FruitSpecies;
export type AnimalKind = "cow" | "chicken" | "goat" | "pig" | "sheep";
export type StorageKind = "barn" | "silo";
export type Plot = {
  x: number;
  y: number;
  crop: Crop | null;
  plantedAt: number;
};
export type Animal = {
  id: string;
  kind: AnimalKind;
  fedAt: number | null;
  production?: { readyAt: number; product: Item } | null;
};
export type Farm = {
  version: 7;
  machines: Machine[];
  penPositions: Record<AnimalKind, Cell>;
  fruitTrees: FruitTree[];
  landSeed: number;
  obstacles: Obstacle[];
  areas: LandArea[];
  buildingPositions: Record<BuildingId, Cell>;
  decorations: PlacedDecoration[];
  coins: number;
  diamonds: number;
  xp: number;
  inventory: Record<Item, number>;
  plots: Plot[];
  animals: Animal[];
  ordersCompleted: number;
  orderBoard?: import("./orders").OrderBoard;
  preferences?: { locale?: import("../i18n/languages").Locale };
  storage: Record<StorageKind, number>;
  revision: number;
};
export type Cell = { x: number; y: number };
export type Command =
  | { type: "set-language"; locale: import("../i18n/languages").Locale }
  | ({ type: "buy-machine"; kind: MachineKind } & Cell)
  | ({ type: "move-machine"; machineId: string } & Cell)
  | {
      type: "enqueue-production";
      machineId: string;
      recipeId: RecipeId;
      expectedRevision: number;
    }
  | {
      type: "collect-production" | "cancel-production";
      machineId: string;
      jobId: string;
    }
  | { type: "upgrade-machine"; machineId: string; expectedSlots: number }
  | { type: "animal-batch"; action: "feed" | "collect"; animalIds: string[] }
  | ({ type: "buy-sheep" } & Cell)
  | { type: "sell-item"; item: Item; amount: number; expectedRevision: number }
  | ({ type: "move-pen"; animalKind: AnimalKind } & Cell)
  | ({ type: "move-field"; from: Cell } & Cell)
  | ({ type: "plant-fruit-tree"; species: FruitSpecies } & Cell)
  | { type: "harvest-fruit-tree"; treeId: string; expectedHarvestCount: number }
  | { type: "remove-fruit-tree"; treeId: string }
  | { type: "remove-obstacle"; obstacleId: string }
  | ({ type: "place-field" | "place-decoration" } & Cell)
  | ({ type: "move-building"; buildingId: BuildingId } & Cell)
  | ({ type: "plant"; crop: Crop } & Cell)
  | ({ type: "harvest" } & Cell)
  | {
      type: "field-stroke";
      action: "plant" | "harvest";
      crop: Crop;
      cells: Cell[];
    }
  | { type: "feed-animal" | "collect-animal"; animalId: string }
  | { type: "buy-feed"; kind?: AnimalKind }
  | { type: "buy-seed"; crop: Crop }
  | { type: "make-feed" }
  | { type: "deliver-order"; orderId: number; item?: Item }
  | { type: "deliver-board-order" | "discard-order"; orderId: string }
  | { type: "upgrade-storage"; storage: StorageKind; expectedLevel: number };

// Original Farm Valley progression. Player level unlocks the paid upgrade;
// capacity and building appearance advance only when that upgrade succeeds.
export const storageStages = [
  { name: "Rústico", capacity: 100, requiredLevel: 1, cost: 0 },
  { name: "Reforçado", capacity: 150, requiredLevel: 2, cost: 75 },
  { name: "Ampliado", capacity: 250, requiredLevel: 4, cost: 180 },
] as const;
export const playerLevel = (farm: Pick<Farm, "xp">) =>
  1 + Math.floor(farm.xp / 50);
export const storageStage = (level: number) =>
  storageStages[level - 1] ?? storageStages[0];
export const storageCapacity = (farm: Farm, kind: StorageKind) =>
  storageStage(farm.storage[kind]).capacity;
export const nextStorageStage = (farm: Farm, kind: StorageKind) =>
  storageStages[farm.storage[kind]] ?? null;
// A seed is a stored crop, not a coin purchase. Time is owned by the server.
export const crops = {
  wheat: {
    name: "Trigo",
    duration: 120_000,
    seed: 1,
    yield: 2,
    xp: 1,
    level: 1,
    seedPrice: 3,
  },
  corn: {
    name: "Milho",
    duration: 300_000,
    seed: 1,
    yield: 2,
    xp: 1,
    level: 1,
    seedPrice: 7,
  },
  carrot: {
    name: "Cenoura",
    duration: 600_000,
    seed: 1,
    yield: 2,
    xp: 2,
    level: 2,
    seedPrice: 9,
  },
  soybean: {
    name: "Soja",
    duration: 1_200_000,
    seed: 1,
    yield: 2,
    xp: 3,
    level: 3,
    seedPrice: 12,
  },
  sugarcane: {
    name: "Cana-de-a\u00e7\u00facar",
    duration: 1_800_000,
    seed: 1,
    yield: 2,
    xp: 4,
    level: 4,
    seedPrice: 15,
  },
  strawberry: {
    name: "Morango",
    duration: 2_700_000,
    seed: 1,
    yield: 2,
    xp: 5,
    level: 10,
    seedPrice: 18,
  },
  potato: {
    name: "Batata",
    duration: 1_800_000,
    seed: 1,
    yield: 2,
    xp: 4,
    level: 18,
    seedPrice: 15,
  },
} as const;
export const animalProducts = {
  cow: {
    name: "Mimosa",
    product: "milk",
    duration: 3_600_000,
    yield: 1,
    xp: 3,
    feed: "cowFeed",
    level: 3,
  },
  chicken: {
    name: "Pipoca",
    product: "egg",
    duration: 1_200_000,
    yield: 1,
    xp: 2,
    feed: "chickenFeed",
    level: 1,
  },
  goat: {
    name: "Amora",
    product: "goatMilk",
    duration: 7_200_000,
    yield: 1,
    xp: 4,
    feed: "goatFeed",
    level: 12,
  },
  pig: {
    name: "Pingo",
    product: "bacon",
    duration: 10_800_000,
    yield: 1,
    xp: 4,
    feed: "pigFeed",
    level: 8,
  },
  sheep: {
    name: "Nuvem",
    product: "wool",
    duration: 14_400_000,
    yield: 1,
    xp: 6,
    feed: "sheepFeed",
    level: 18,
  },
} as const;
export const animalReadyAt = (animal: Animal) =>
  animal.production?.readyAt ??
  (animal.fedAt === null
    ? null
    : animal.fedAt +
      {
        cow: 120000,
        chicken: 60000,
        goat: 120000,
        pig: 90000,
        sheep: 14400000,
      }[animal.kind]);
export const animalRemaining = (animal: Animal, now: number) => {
  const ready = animalReadyAt(animal);
  return ready === null ? null : Math.max(0, ready - now);
};
export const animalOutput = (animal: Animal): Item =>
  animal.production?.product ??
  (animal.fedAt !== null &&
  animal.production === undefined &&
  animal.kind === "pig"
    ? "truffle"
    : animalProducts[animal.kind].product);
export const animalFeedAvailable = (farm: Farm, kind: AnimalKind) =>
  (farm.inventory[animalProducts[kind].feed] ?? 0) + farm.inventory.feed;
export const items: Record<
  Item,
  { name: string; image: string; sellPrice?: number }
> = {
  ...(Object.fromEntries(
    productionItemIds.map((id) => [
      id,
      {
        ...productionItems[id],
        image: "/assets/products/production/" + id + ".svg",
      },
    ]),
  ) as unknown as Record<
    ProductionItem,
    { name: string; image: string; sellPrice: number }
  >),
  ...(Object.fromEntries(
    fruitIds.map((id) => [
      id,
      {
        name: fruitSpecies[id].fruit,
        image: "/assets/products/fruits/" + id + ".svg",
        sellPrice: fruitSpecies[id].sellPrice,
      },
    ]),
  ) as Record<
    FruitSpecies,
    { name: string; image: string; sellPrice: number }
  >),
  ...(Object.fromEntries(
    toolIds.map((id) => [
      id,
      { name: tools[id].name, image: "/assets/ui/tools/" + id + ".svg" },
    ]),
  ) as Record<ToolItem, { name: string; image: string }>),
  carrot: {
    name: crops.carrot.name,
    image: "/assets/crops/carrot/ready-v2.webp",
  },
  strawberry: {
    name: crops.strawberry.name,
    image: "/assets/crops/strawberry/ready-v1.webp",
    sellPrice: 6,
  },
  potato: {
    name: crops.potato.name,
    image: "/assets/crops/potato/ready-v1.webp",
    sellPrice: 5,
  },
  soybean: {
    name: crops.soybean.name,
    image: "/assets/crops/soybean/ready-v2.webp",
  },
  sugarcane: {
    name: crops.sugarcane.name,
    image: "/assets/crops/sugarcane/ready-v2.webp",
  },
  wheat: {
    name: "Trigo",
    image: "/assets/crops/wheat/ready-v2.webp",
    sellPrice: 2,
  },
  corn: {
    name: "Milho",
    image: "/assets/crops/corn/ready-v2.webp",
    sellPrice: 3,
  },
  feed: { name: "Ração de reserva", image: "/assets/products/feed.svg" },
  milk: { name: "Leite", image: "/assets/products/milk.svg", sellPrice: 12 },
  egg: { name: "Ovos", image: "/assets/products/egg.svg", sellPrice: 6 },
  goatMilk: {
    name: "Leite de cabra",
    image: "/assets/products/goat-milk.svg",
    sellPrice: 18,
  },
  truffle: {
    name: "Trufas",
    image: "/assets/products/truffle.svg",
    sellPrice: 24,
  },
};
items.carrot.sellPrice = 4;
items.soybean.sellPrice = 5;
items.sugarcane.sellPrice = 5;
export const orders = [
  {
    customer: "Dona Rosa",
    description: "Um pão quentinho começa no campo.",
    item: "wheat",
    amount: 4,
    coins: 16,
    xp: 5,
  },
  {
    customer: "Café do Vale",
    description: "Milho fresquinho para o bolo da tarde.",
    item: "corn",
    amount: 3,
    coins: 21,
    xp: 7,
  },
  {
    customer: "Seu Bento",
    description: "Leite fresco, direto da fazenda.",
    item: "milk",
    amount: 1,
    coins: 24,
    xp: 8,
  },
  {
    customer: "Dona Rosa",
    description: "Ovos para a receita de família.",
    item: "egg",
    amount: 2,
    coins: 20,
    xp: 6,
  },
  {
    customer: "Queijaria da Serra",
    description: "Leite de cabra para um queijo especial.",
    item: "goatMilk",
    amount: 1,
    coins: 28,
    xp: 8,
  },
  {
    customer: "Bistrô do Bosque",
    description: "Uma trufa fresquinha para o prato do dia.",
    item: "truffle",
    amount: 1,
    coins: 32,
    xp: 10,
  },
  {
    customer: "Cozinha da vila",
    description: "Bacon para o café da manhã.",
    item: "bacon",
    amount: 1,
    coins: 32,
    xp: 10,
  },
  {
    customer: "Ateliê do vale",
    description: "Lã macia para novas criações.",
    item: "wool",
    amount: 1,
    coins: 42,
    xp: 12,
  },
] as const;
export const siloUsed = (farm: Farm) =>
  cropIds.reduce((total, id) => total + farm.inventory[id], 0);
export const barnUsed = (farm: Farm) =>
  (Object.keys(items) as Item[])
    .filter((id) => !cropIds.includes(id as Crop))
    .reduce((n, id) => n + (farm.inventory[id] ?? 0), 0);

export function currentOrder(farm: Farm) {
  const accessible = (
    item: Item,
    quantity = 1,
    seen = new Set<Item>(),
  ): boolean => {
    if (farm.inventory[item] >= quantity) return true;
    if (seen.has(item)) return false;
    const visited = new Set(seen).add(item);
    if (cropIds.includes(item as Crop))
      return playerLevel(farm) >= crops[item as Crop].level;
    if (fruitIds.includes(item as FruitSpecies))
      return (
        playerLevel(farm) >= fruitSpecies[item as FruitSpecies].level &&
        farm.fruitTrees.some(
          (tree) => tree.species === item && tree.removedAt === null,
        )
      );
    const animal = (Object.keys(animalProducts) as AnimalKind[]).find(
      (kind) => animalProducts[kind].product === item,
    );
    if (animal) return farm.animals.some((a) => a.kind === animal);
    const recipe = recipes[item as RecipeId];
    return (
      !!recipe &&
      playerLevel(farm) >= recipe.level &&
      farm.machines.some((m) => m.kind === recipe.machine) &&
      Object.entries(recipe.ingredients).every(([id, amount]) =>
        accessible(id as Item, amount, visited),
      )
    );
  };
  const base = orders.filter((order) => accessible(order.item, order.amount));
  const extra = recipeIds
    .filter((id) => accessible(id) && !id.endsWith("Feed"))
    .map((id) => ({
      customer: "Mercado do vale",
      description: "Uma encomenda feita com cuidado.",
      item: id as Item,
      amount: 1,
      coins: Math.ceil((items[id].sellPrice ?? 1) * 1.25),
      xp: Math.max(3, Math.ceil(recipes[id].xp / 2)),
    }));
  const pool = [...base, ...extra];
  return pool[farm.ordersCompleted % pool.length] ?? orders[0];
}
