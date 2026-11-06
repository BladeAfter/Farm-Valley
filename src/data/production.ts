import type { Farm, Item } from "../types/game";

const MINUTE = 60_000;
export const machineKinds = {
  feedMill: {
    name: "Fábrica de ração",
    level: 2,
    price: 60,
    width: 132,
    effect: "gear",
  },
  bakery: {
    name: "Padaria",
    level: 4,
    price: 160,
    width: 144,
    effect: "smoke",
  },
  dairy: {
    name: "Laticínios",
    level: 6,
    price: 240,
    width: 138,
    effect: "gear",
  },
  cakery: {
    name: "Confeitaria",
    level: 10,
    price: 420,
    width: 145,
    effect: "smoke",
  },
  sugarMill: {
    name: "Engenho de açúcar",
    level: 14,
    price: 580,
    width: 134,
    effect: "steam",
  },
  popcorn: {
    name: "Pipoqueira",
    level: 16,
    price: 660,
    width: 112,
    effect: "steam",
  },
  grill: {
    name: "Churrasqueira",
    level: 20,
    price: 850,
    width: 132,
    effect: "smoke",
  },
  juicer: {
    name: "Casa de sucos",
    level: 24,
    price: 1100,
    width: 138,
    effect: "gear",
  },
  iceCream: {
    name: "Sorveteria",
    level: 28,
    price: 1350,
    width: 140,
    effect: "gear",
  },
} as const;
export type MachineKind = keyof typeof machineKinds;
export const machineIds = Object.keys(machineKinds) as MachineKind[];
export type Category =
  | "Rações"
  | "Padaria"
  | "Laticínios"
  | "Bolos e doces"
  | "Industrializados"
  | "Produtos animais";
export const productionItems = {
  chickenFeed: { name: "Ração de galinha", category: "Rações", sellPrice: 4 },
  cowFeed: { name: "Ração de vaca", category: "Rações", sellPrice: 6 },
  goatFeed: { name: "Ração de cabra", category: "Rações", sellPrice: 5 },
  pigFeed: { name: "Ração de porco", category: "Rações", sellPrice: 6 },
  sheepFeed: { name: "Ração de ovelha", category: "Rações", sellPrice: 5 },
  bacon: { name: "Bacon", category: "Produtos animais", sellPrice: 24 },
  wool: { name: "Lã", category: "Produtos animais", sellPrice: 30 },
  bread: { name: "Pão", category: "Padaria", sellPrice: 10 },
  cornBread: { name: "Pão de milho", category: "Padaria", sellPrice: 19 },
  cookie: { name: "Biscoito", category: "Padaria", sellPrice: 24 },
  muffin: { name: "Muffin", category: "Padaria", sellPrice: 33 },
  pie: { name: "Torta simples", category: "Padaria", sellPrice: 44 },
  cream: { name: "Creme de leite", category: "Laticínios", sellPrice: 32 },
  butter: { name: "Manteiga", category: "Laticínios", sellPrice: 47 },
  cheese: { name: "Queijo", category: "Laticínios", sellPrice: 66 },
  goatCheese: {
    name: "Queijo de cabra",
    category: "Laticínios",
    sellPrice: 78,
  },
  cake: { name: "Bolo simples", category: "Bolos e doces", sellPrice: 48 },
  carrotCake: {
    name: "Bolo de cenoura",
    category: "Bolos e doces",
    sellPrice: 96,
  },
  appleCake: {
    name: "Bolo de maçã",
    category: "Bolos e doces",
    sellPrice: 115,
  },
  chocolateCake: {
    name: "Bolo de chocolate",
    category: "Bolos e doces",
    sellPrice: 118,
  },
  strawberryCake: {
    name: "Bolo de morango",
    category: "Bolos e doces",
    sellPrice: 100,
  },
  brownSugar: {
    name: "Açúcar mascavo",
    category: "Industrializados",
    sellPrice: 18,
  },
  whiteSugar: {
    name: "Açúcar branco",
    category: "Industrializados",
    sellPrice: 25,
  },
  syrup: { name: "Xarope", category: "Industrializados", sellPrice: 34 },
  popcorn: { name: "Pipoca", category: "Industrializados", sellPrice: 10 },
  butterPopcorn: {
    name: "Pipoca com manteiga",
    category: "Industrializados",
    sellPrice: 72,
  },
  sweetPopcorn: {
    name: "Pipoca doce",
    category: "Industrializados",
    sellPrice: 35,
  },
  grilledBacon: {
    name: "Bacon grelhado",
    category: "Industrializados",
    sellPrice: 36,
  },
  baconEggs: {
    name: "Ovos com bacon",
    category: "Industrializados",
    sellPrice: 54,
  },
  bakedPotato: {
    name: "Batatas assadas",
    category: "Industrializados",
    sellPrice: 16,
  },
  vanillaIceCream: {
    name: "Sorvete de baunilha",
    category: "Industrializados",
    sellPrice: 98,
  },
  strawberryIceCream: {
    name: "Sorvete de morango",
    category: "Industrializados",
    sellPrice: 110,
  },
  chocolateIceCream: {
    name: "Sorvete de chocolate",
    category: "Industrializados",
    sellPrice: 135,
  },
  appleJuice: {
    name: "Suco de maçã",
    category: "Industrializados",
    sellPrice: 35,
  },
  carrotJuice: {
    name: "Suco de cenoura",
    category: "Industrializados",
    sellPrice: 19,
  },
  fruitJuice: {
    name: "Suco de frutas",
    category: "Industrializados",
    sellPrice: 52,
  },
} satisfies Record<
  string,
  { name: string; category: Category; sellPrice: number }
>;
export type ProductionItem = keyof typeof productionItems;
export const productionItemIds = Object.keys(
  productionItems,
) as ProductionItem[];
export type Recipe = {
  machine: MachineKind;
  ingredients: Partial<Record<Item, number>>;
  minutes: number;
  quantity: number;
  xp: number;
  level: number;
};
export const recipes = {
  chickenFeed: {
    machine: "feedMill",
    ingredients: { corn: 2, wheat: 1 },
    minutes: 5,
    quantity: 3,
    xp: 2,
    level: 2,
  },
  cowFeed: {
    machine: "feedMill",
    ingredients: { corn: 2, soybean: 1 },
    minutes: 10,
    quantity: 3,
    xp: 3,
    level: 3,
  },
  goatFeed: {
    machine: "feedMill",
    ingredients: { carrot: 2, wheat: 1 },
    minutes: 15,
    quantity: 3,
    xp: 4,
    level: 3,
  },
  pigFeed: {
    machine: "feedMill",
    ingredients: { carrot: 2, soybean: 1 },
    minutes: 20,
    quantity: 3,
    xp: 5,
    level: 3,
  },
  sheepFeed: {
    machine: "feedMill",
    ingredients: { wheat: 2, soybean: 1 },
    minutes: 25,
    quantity: 3,
    xp: 6,
    level: 18,
  },
  bread: {
    machine: "bakery",
    ingredients: { wheat: 3 },
    minutes: 5,
    quantity: 1,
    xp: 3,
    level: 4,
  },
  cornBread: {
    machine: "bakery",
    ingredients: { corn: 2, egg: 1 },
    minutes: 15,
    quantity: 1,
    xp: 5,
    level: 4,
  },
  cookie: {
    machine: "bakery",
    ingredients: { wheat: 2, egg: 2 },
    minutes: 20,
    quantity: 1,
    xp: 6,
    level: 5,
  },
  muffin: {
    machine: "bakery",
    ingredients: { wheat: 2, egg: 1, milk: 1 },
    minutes: 30,
    quantity: 1,
    xp: 8,
    level: 5,
  },
  pie: {
    machine: "bakery",
    ingredients: { wheat: 3, egg: 2, milk: 1 },
    minutes: 45,
    quantity: 1,
    xp: 10,
    level: 6,
  },
  cream: {
    machine: "dairy",
    ingredients: { milk: 2 },
    minutes: 20,
    quantity: 1,
    xp: 6,
    level: 6,
  },
  butter: {
    machine: "dairy",
    ingredients: { milk: 3 },
    minutes: 30,
    quantity: 1,
    xp: 8,
    level: 6,
  },
  cheese: {
    machine: "dairy",
    ingredients: { milk: 4 },
    minutes: 60,
    quantity: 1,
    xp: 10,
    level: 7,
  },
  goatCheese: {
    machine: "dairy",
    ingredients: { goatMilk: 3 },
    minutes: 90,
    quantity: 1,
    xp: 12,
    level: 12,
  },
  cake: {
    machine: "cakery",
    ingredients: { wheat: 3, egg: 2, milk: 1 },
    minutes: 45,
    quantity: 1,
    xp: 10,
    level: 10,
  },
  carrotCake: {
    machine: "cakery",
    ingredients: { carrot: 3, egg: 2, butter: 1 },
    minutes: 60,
    quantity: 1,
    xp: 14,
    level: 10,
  },
  appleCake: {
    machine: "cakery",
    ingredients: { apple: 3, egg: 2, butter: 1 },
    minutes: 90,
    quantity: 1,
    xp: 16,
    level: 11,
  },
  chocolateCake: {
    machine: "cakery",
    ingredients: { cocoa: 2, egg: 2, cream: 1 },
    minutes: 120,
    quantity: 1,
    xp: 20,
    level: 12,
  },
  strawberryCake: {
    machine: "cakery",
    ingredients: { strawberry: 3, egg: 2, cream: 1 },
    minutes: 150,
    quantity: 1,
    xp: 22,
    level: 12,
  },
  brownSugar: {
    machine: "sugarMill",
    ingredients: { sugarcane: 2 },
    minutes: 20,
    quantity: 1,
    xp: 5,
    level: 14,
  },
  whiteSugar: {
    machine: "sugarMill",
    ingredients: { sugarcane: 3 },
    minutes: 40,
    quantity: 1,
    xp: 7,
    level: 14,
  },
  syrup: {
    machine: "sugarMill",
    ingredients: { sugarcane: 4 },
    minutes: 60,
    quantity: 1,
    xp: 9,
    level: 15,
  },
  popcorn: {
    machine: "popcorn",
    ingredients: { corn: 2 },
    minutes: 15,
    quantity: 1,
    xp: 4,
    level: 16,
  },
  butterPopcorn: {
    machine: "popcorn",
    ingredients: { corn: 2, butter: 1 },
    minutes: 30,
    quantity: 1,
    xp: 9,
    level: 16,
  },
  sweetPopcorn: {
    machine: "popcorn",
    ingredients: { corn: 2, brownSugar: 1 },
    minutes: 30,
    quantity: 1,
    xp: 8,
    level: 17,
  },
  grilledBacon: {
    machine: "grill",
    ingredients: { bacon: 1 },
    minutes: 20,
    quantity: 1,
    xp: 7,
    level: 20,
  },
  baconEggs: {
    machine: "grill",
    ingredients: { bacon: 1, egg: 2 },
    minutes: 30,
    quantity: 1,
    xp: 10,
    level: 20,
  },
  bakedPotato: {
    machine: "grill",
    ingredients: { potato: 2 },
    minutes: 30,
    quantity: 1,
    xp: 5,
    level: 20,
  },
  vanillaIceCream: {
    machine: "iceCream",
    ingredients: { milk: 1, cream: 1, whiteSugar: 1 },
    minutes: 120,
    quantity: 1,
    xp: 20,
    level: 28,
  },
  strawberryIceCream: {
    machine: "iceCream",
    ingredients: { strawberry: 3, cream: 1, whiteSugar: 1 },
    minutes: 150,
    quantity: 1,
    xp: 22,
    level: 28,
  },
  chocolateIceCream: {
    machine: "iceCream",
    ingredients: { cocoa: 2, cream: 1, whiteSugar: 1 },
    minutes: 180,
    quantity: 1,
    xp: 24,
    level: 29,
  },
  appleJuice: {
    machine: "juicer",
    ingredients: { apple: 3 },
    minutes: 20,
    quantity: 1,
    xp: 7,
    level: 24,
  },
  carrotJuice: {
    machine: "juicer",
    ingredients: { carrot: 3 },
    minutes: 25,
    quantity: 1,
    xp: 6,
    level: 24,
  },
  fruitJuice: {
    machine: "juicer",
    ingredients: { apple: 1, orange: 2, mango: 1 },
    minutes: 45,
    quantity: 1,
    xp: 10,
    level: 25,
  },
} satisfies Record<string, Recipe>;
export type RecipeId = keyof typeof recipes;
export const recipeIds = Object.keys(recipes) as RecipeId[];
export type ProductionJob = {
  id: string;
  recipe: RecipeId;
  startedAt: number;
  readyAt: number;
  duration: number;
  quantity: number;
};
export type Machine = {
  id: string;
  kind: MachineKind;
  x: number;
  y: number;
  slots: number;
  completed: number;
  builtAt: number;
  jobs: ProductionJob[];
};
export const queueUpgradePrices = [30, 60, 120, 200] as const;
export const masteryStages = [
  { batches: 0, speed: 0, name: "Aprendiz" },
  { batches: 10, speed: 0.03, name: "Artesão" },
  { batches: 40, speed: 0.05, name: "Especialista" },
  { batches: 100, speed: 0.08, name: "Mestre" },
] as const;
export const machineMastery = (machine: Pick<Machine, "completed">) =>
  [...masteryStages]
    .reverse()
    .find((stage) => machine.completed >= stage.batches)!;
export const recipeDuration = (recipe: Recipe, machine: Machine) =>
  Math.ceil(recipe.minutes * MINUTE * (1 - machineMastery(machine).speed));
export const machineRect = (p: { x: number; y: number }) => ({
  x: p.x - 1,
  y: p.y - 1,
  w: 2,
  h: 2,
});
export const recipeUnlocked = (farm: Farm, id: RecipeId) =>
  1 + Math.floor(farm.xp / 50) >= recipes[id].level;
export const recipeIngredients = (id: RecipeId) =>
  Object.entries(recipes[id].ingredients) as [Item, number][];
export const canAffordRecipe = (farm: Farm, id: RecipeId) =>
  recipeIngredients(id).every(
    ([item, amount]) => farm.inventory[item] >= amount,
  );
export const machineImage = (kind: MachineKind) =>
  "/assets/buildings/machines/" + kind + "-v1.webp";
