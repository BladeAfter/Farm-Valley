export const tools = {
  axe: { name: "Machado", description: "Árvores pequenas, médias e arbustos" },
  saw: { name: "Serrote", description: "Árvores grandes, secas e troncos" },
  pickaxe: {
    name: "Picareta",
    description: "Pedras pequenas e conjuntos de pedras",
  },
  tnt: { name: "TNT", description: "Rochas médias e irregulares" },
  dynamite: { name: "Dinamite", description: "Rochas grandes" },
  shovel: { name: "Pá", description: "Raízes, galhos e vegetação seca" },
} as const;
export type ToolItem = keyof typeof tools;
export const toolIds = Object.keys(tools) as ToolItem[];
export const obstacleKinds = {
  treeSmall: {
    name: "Árvore pequena",
    w: 2,
    h: 2,
    tool: "axe",
    texture: "oak",
    width: 104,
    effect: "leaves",
  },
  treeMedium: {
    name: "Árvore média",
    w: 2,
    h: 2,
    tool: "axe",
    texture: "oak",
    width: 139,
    effect: "leaves",
  },
  treeLarge: {
    name: "Árvore grande",
    w: 3,
    h: 3,
    tool: "saw",
    texture: "oak",
    width: 172,
    effect: "leaves",
  },
  treeDead: {
    name: "Árvore seca",
    w: 2,
    h: 2,
    tool: "saw",
    texture: "obstacle-dead-tree",
    width: 100,
    effect: "wood",
  },
  stump: {
    name: "Tronco",
    w: 2,
    h: 1,
    tool: "saw",
    texture: "obstacle-stump",
    width: 69,
    effect: "wood",
  },
  rockSmall: {
    name: "Pedra pequena",
    w: 1,
    h: 1,
    tool: "pickaxe",
    texture: "obstacle-rock",
    width: 43,
    effect: "stone",
  },
  rockMedium: {
    name: "Rocha média",
    w: 2,
    h: 2,
    tool: "tnt",
    texture: "obstacle-rock",
    width: 79,
    effect: "dust",
  },
  rockLarge: {
    name: "Rocha grande",
    w: 3,
    h: 3,
    tool: "dynamite",
    texture: "obstacle-rock",
    width: 120,
    effect: "dust",
  },
  rockCluster: {
    name: "Conjunto de pedras",
    w: 2,
    h: 1,
    tool: "pickaxe",
    texture: "obstacle-rock",
    width: 66,
    effect: "stone",
  },
  rockIrregular: {
    name: "Rocha irregular",
    w: 2,
    h: 2,
    tool: "tnt",
    texture: "obstacle-rock",
    width: 92,
    effect: "dust",
  },
  bushSmall: {
    name: "Arbusto pequeno",
    w: 1,
    h: 1,
    tool: "axe",
    texture: "obstacle-bush",
    width: 46,
    effect: "leaves",
  },
  bushLarge: {
    name: "Arbusto grande",
    w: 2,
    h: 2,
    tool: "axe",
    texture: "obstacle-bush",
    width: 77,
    effect: "leaves",
  },
  dryBush: {
    name: "Moita seca",
    w: 1,
    h: 1,
    tool: "shovel",
    texture: "obstacle-roots",
    width: 46,
    effect: "leaves",
  },
  roots: {
    name: "Raízes e galhos",
    w: 2,
    h: 1,
    tool: "shovel",
    texture: "obstacle-roots",
    width: 67,
    effect: "wood",
  },
} as const;
export type ObstacleKind = keyof typeof obstacleKinds;
export type Obstacle = {
  id: string;
  kind: ObstacleKind;
  x: number;
  y: number;
  variant: number;
  areaId: string;
  removedAt: number | null;
};
export type LandArea = {
  id: string;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  unlocked: boolean;
};
export type BuildingId = "house" | "barn" | "silo";
export type PlacedDecoration = { id: string; x: number; y: number };
export type Placement =
  | { kind: "machine"; machineKind: import("../data/production").MachineKind }
  | { kind: "moveMachine"; machineId: string }
  | { kind: "sheep" }
  | { kind: "pen"; animalKind: import("./game").AnimalKind }
  | { kind: "moveField"; from: import("./game").Cell }
  | { kind: "fruitTree"; species: import("./orchard").FruitSpecies }
  | { kind: "field" | "decoration" }
  | { kind: "building"; buildingId: BuildingId };
export const placementPrices = { field: 5, decoration: 8 };
