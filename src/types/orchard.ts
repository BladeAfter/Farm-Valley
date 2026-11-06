const HOUR = 3_600_000;
export const fruitSpecies = {
  cocoa: {
    name: "Cacaueiro",
    fruit: "Cacau",
    singular: "Cacau",
    duration: 6 * HOUR,
    yield: 3,
    growth: 300_000,
    price: 260,
    level: 10,
    sellPrice: 18,
    width: 116,
    xp: 8,
  },
  apple: {
    name: "Macieira",
    fruit: "Maçãs",
    singular: "Maçã",
    duration: 2 * HOUR,
    yield: 3,
    growth: 60_000,
    price: 40,
    level: 1,
    sellPrice: 8,
    width: 116,
    xp: 3,
  },
  pear: {
    name: "Pereira",
    fruit: "Peras",
    singular: "Pera",
    duration: 3 * HOUR,
    yield: 3,
    growth: 90_000,
    price: 55,
    level: 1,
    sellPrice: 11,
    width: 112,
    xp: 4,
  },
  cherry: {
    name: "Cerejeira",
    fruit: "Cerejas",
    singular: "Cereja",
    duration: 4 * HOUR,
    yield: 4,
    growth: 120_000,
    price: 70,
    level: 2,
    sellPrice: 12,
    width: 118,
    xp: 5,
  },
  orange: {
    name: "Laranjeira",
    fruit: "Laranjas",
    singular: "Laranja",
    duration: 5 * HOUR,
    yield: 3,
    growth: 150_000,
    price: 85,
    level: 2,
    sellPrice: 15,
    width: 110,
    xp: 6,
  },
  lemon: {
    name: "Limoeiro",
    fruit: "Limões",
    singular: "Limão",
    duration: 6 * HOUR,
    yield: 4,
    growth: 180_000,
    price: 100,
    level: 3,
    sellPrice: 16,
    width: 110,
    xp: 7,
  },
  peach: {
    name: "Pessegueiro",
    fruit: "Pêssegos",
    singular: "Pêssego",
    duration: 7 * HOUR,
    yield: 3,
    growth: 210_000,
    price: 120,
    level: 3,
    sellPrice: 20,
    width: 118,
    xp: 8,
  },
  mango: {
    name: "Mangueira",
    fruit: "Mangas",
    singular: "Manga",
    duration: 8 * HOUR,
    yield: 3,
    growth: 240_000,
    price: 145,
    level: 4,
    sellPrice: 23,
    width: 125,
    xp: 9,
  },
  avocado: {
    name: "Abacateiro",
    fruit: "Abacates",
    singular: "Abacate",
    duration: 10 * HOUR,
    yield: 3,
    growth: 300_000,
    price: 175,
    level: 4,
    sellPrice: 28,
    width: 124,
    xp: 10,
  },
} as const;
export type FruitSpecies = keyof typeof fruitSpecies;
export const fruitIds = Object.keys(fruitSpecies) as FruitSpecies[];
export type FruitTree = {
  id: string;
  species: FruitSpecies;
  x: number;
  y: number;
  plantedAt: number;
  growsAt: number;
  readyAt: number;
  lastHarvestAt: number | null;
  harvestCount: number;
  harvestLimit: number | null;
  removedAt: number | null;
};
// Applied when planting. Existing unlimited trees keep their saved unlimited lifetime.
export const orchardRules: {
  harvestLimitEnabled: boolean;
  harvestLimit: number;
} = { harvestLimitEnabled: false, harvestLimit: 4 };
export type FruitStage =
  | "seedling"
  | "growing"
  | "adult"
  | "small-fruit"
  | "ripening"
  | "ready"
  | "harvested"
  | "dry"
  | "removed";
export function fruitStage(tree: FruitTree, now: number): FruitStage {
  if (tree.removedAt !== null) return "removed";
  if (tree.harvestLimit !== null && tree.harvestCount >= tree.harvestLimit)
    return "dry";
  if (now < tree.growsAt)
    return now < tree.plantedAt + (tree.growsAt - tree.plantedAt) * 0.4
      ? "seedling"
      : "growing";
  if (now >= tree.readyAt) return "ready";
  const duration = fruitSpecies[tree.species].duration,
    progress = (now - (tree.readyAt - duration)) / duration;
  if (progress < 0.35)
    return tree.lastHarvestAt === null ? "adult" : "harvested";
  return progress < 0.65 ? "small-fruit" : "ripening";
}
export function fruitFrame(stage: FruitStage) {
  return stage === "seedling"
    ? 0
    : stage === "growing"
      ? 1
      : stage === "small-fruit"
        ? 3
        : stage === "ripening"
          ? 4
          : stage === "ready"
            ? 5
            : 2;
}
export const fruitRect = (p: { x: number; y: number }) => ({
  x: p.x - 0.65,
  y: p.y - 0.65,
  w: 1.3,
  h: 1.3,
});
export function starterOrchard(now: number): FruitTree[] {
  return [
    [8, 14],
    [11, 14],
    [14, 14],
    [8, 17],
    [11, 17],
    [14, 17],
  ].map(([x, y], i) => ({
    id: "orchard-" + i,
    species: "apple",
    x,
    y,
    plantedAt: now - fruitSpecies.apple.growth - fruitSpecies.apple.duration,
    growsAt: now - fruitSpecies.apple.duration,
    readyAt: now,
    lastHarvestAt: null,
    harvestCount: 0,
    harvestLimit: null,
    removedAt: null,
  }));
}
