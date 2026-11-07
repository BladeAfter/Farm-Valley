import { machineRect } from "./production";
import type { Farm } from "../types/game";
import { fruitRect } from "../types/orchard";
import {
  obstacleKinds,
  type Obstacle,
  type ObstacleKind,
  type LandArea,
  type BuildingId,
  type Placement,
} from "../types/land";
import { pens, penLayout } from "./pens";
import { buildingLayout } from "./buildings";
import { farmWalls, wallContainsPoint } from "../game/map/walls";
import { toIso } from "../game/map/isometric";

export type Rect = { x: number; y: number; w: number; h: number };
export const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.w - 1e-7 &&
  a.x + a.w > b.x + 1e-7 &&
  a.y < b.y + b.h - 1e-7 &&
  a.y + a.h > b.y + 1e-7;
export const obstacleRect = (o: Obstacle): Rect => ({
  x: o.x - 0.5,
  y: o.y - 0.5,
  w: obstacleKinds[o.kind].w,
  h: obstacleKinds[o.kind].h,
});
export const defaultBuildingPositions = () =>
  Object.fromEntries(
    ["house", "barn", "silo"].map((id) => [
      id,
      {
        x: buildingLayout[id as BuildingId].x,
        y: buildingLayout[id as BuildingId].y,
      },
    ]),
  ) as Farm["buildingPositions"];
export function buildingRect(
  id: BuildingId,
  p: { x: number; y: number },
): Rect {
  return {
    x: p.x - (id === "silo" ? 0.5 : 1),
    y: p.y - (id === "silo" ? 0.5 : 1),
    w: id === "silo" ? 1 : 2,
    h: id === "silo" ? 1 : 2,
  };
}
export const landAreas = (): LandArea[] => [
  {
    id: "valley",
    name: "Vale de Alecrim",
    x: -5.5,
    y: -5.5,
    w: 30,
    h: 29,
    unlocked: true,
  },
  {
    id: "east",
    name: "Bosque do Leste",
    x: 24.5,
    y: -5.5,
    w: 10,
    h: 29,
    unlocked: false,
  },
];
const roads = [
  [
    [5, -2],
    [5, 22],
  ],
  [
    [1, 5],
    [20, 5],
  ],
  [
    [5, 12],
    [17, 12],
  ],
  [
    [6.5, 2.6],
    [5, 2.6],
  ],
  [
    [2.15, 7.1],
    [5, 7.1],
  ],
  [
    [3, 11.5],
    [5, 11.5],
  ],
] as const;
const water = [
  [-1700, -520],
  [1450, -520],
  [1450, -320],
  [200, -260],
  [-148, -185],
  [-298, -55],
  [-558, 130],
  [-948, 285],
  [-1728, 725],
];
function isWater(x: number, y: number) {
  const p = toIso(x, y);
  let inside = false;
  for (let i = 0, j = water.length - 1; i < water.length; j = i++) {
    const a = water[i],
      b = water[j];
    if (
      a[1] > p.y !== b[1] > p.y &&
      p.x < ((b[0] - a[0]) * (p.y - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
export function terrainIssue(rect: Rect, areas: LandArea[]): string | null {
  const area = areas.find(
    (a) =>
      rect.x >= a.x &&
      rect.y >= a.y &&
      rect.x + rect.w <= a.x + a.w &&
      rect.y + rect.h <= a.y + a.h,
  );
  if (!area) return "Fora dos limites do terreno.";
  if (!area.unlocked) return "Esta área ainda está bloqueada.";
  for (let x = rect.x; x <= rect.x + rect.w + 0.01; x += 0.25)
    for (let y = rect.y; y <= rect.y + rect.h + 0.01; y += 0.25) {
      if (isWater(x, y)) return "Este espaço pertence ao rio.";
      for (const [[ax, ay], [bx, by]] of roads) {
        const dx = bx - ax,
          dy = by - ay,
          t = Math.max(
            0,
            Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)),
          );
        if (Math.hypot(x - ax - t * dx, y - ay - t * dy) < 0.59)
          return "Mantenha os caminhos livres.";
      }
      if (wallContainsPoint(farmWalls, { x, y }, 0.04))
        return "Este espaço contém um muro.";
    }
  return null;
}
export function occupancyIssue(
  farm: Pick<
    Farm,
    | "plots"
    | "buildingPositions"
    | "decorations"
    | "obstacles"
    | "areas"
    | "fruitTrees"
  > &
    Partial<Pick<Farm, "penPositions" | "machines" | "animals" | "orderBoard">>,
  rect: Rect,
  ignoreBuilding?: BuildingId,
  ignorePlacement?: Placement,
): string | null {
  const terrain = terrainIssue(rect, farm.areas);
  if (terrain) return terrain;
  const board = farm.orderBoard?.position;
  if (board && intersects(rect, { x: board.x - .5, y: board.y - .5, w: 1, h: 1 })) return "Este espaço pertence ao quadro de encomendas.";
  for (const kind of Object.keys(
    pens,
  ) as import("../types/game").AnimalKind[]) {
    if (ignorePlacement?.kind === "pen" && ignorePlacement.animalKind === kind)
      continue;
    if (kind === "sheep" && !farm.animals?.some((a) => a.kind === "sheep"))
      continue;
    const p = penLayout(kind, farm.penPositions);
    if (intersects(rect, { x: p.x, y: p.y, w: p.size, h: p.size }))
      return "Este espaço pertence a um cercado.";
  }
  for (const id of ["house", "barn", "silo"] as BuildingId[])
    if (
      id !== ignoreBuilding &&
      intersects(rect, buildingRect(id, farm.buildingPositions[id]))
    )
      return "Já existe uma construção neste espaço.";
  for (const machine of farm.machines ?? [])
    if (
      !(
        ignorePlacement?.kind === "moveMachine" &&
        ignorePlacement.machineId === machine.id
      ) &&
      intersects(rect, machineRect(machine))
    )
      return "Este espa\u00e7o pertence a uma m\u00e1quina.";
  for (const p of farm.plots)
    if (
      !(
        ignorePlacement?.kind === "moveField" &&
        p.x === ignorePlacement.from.x &&
        p.y === ignorePlacement.from.y
      ) &&
      intersects(rect, { x: p.x - 0.5, y: p.y - 0.5, w: 1, h: 1 })
    )
      return "Já existe um canteiro neste espaço.";
  for (const d of farm.decorations)
    if (intersects(rect, { x: d.x - 0.5, y: d.y - 0.5, w: 1, h: 1 }))
      return "Já existe uma decoração neste espaço.";
  // Existing decorative orchard remains intact and is never used as free building land.
  for (const tree of farm.fruitTrees)
    if (tree.removedAt === null && intersects(rect, fruitRect(tree)))
      return "Este espaço pertence ao pomar.";
  if (
    farm.obstacles.some(
      (o) => o.removedAt === null && intersects(rect, obstacleRect(o)),
    )
  )
    return "Limpe os obstáculos antes de usar este espaço.";
  return null;
}
export function placementRect(
  placement: Placement,
  x: number,
  y: number,
): Rect {
  if (placement.kind === "machine" || placement.kind === "moveMachine")
    return machineRect({ x, y });
  if (placement.kind === "sheep") return { x, y, w: 3, h: 3 };
  if (placement.kind === "pen")
    return {
      x,
      y,
      w: pens[placement.animalKind].size,
      h: pens[placement.animalKind].size,
    };
  return placement.kind === "fruitTree"
    ? fruitRect({ x, y })
    : placement.kind === "building"
      ? buildingRect(placement.buildingId, { x, y })
      : { x: x - 0.5, y: y - 0.5, w: 1, h: 1 };
}
export function initialObstacles(
  seed: number,
  base: Pick<
    Farm,
    "plots" | "buildingPositions" | "decorations" | "areas" | "fruitTrees"
  >,
): Obstacle[] {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const result: Obstacle[] = [];
  const add = (kind: ObstacleKind, x: number, y: number, areaId = "valley") => {
    const o: Obstacle = {
      id: "natural-" + result.length,
      kind,
      x,
      y,
      variant: Math.floor(random() * 4),
      areaId,
      removedAt: null,
    };
    const rect = obstacleRect(o),
      areas = base.areas.map((a) => ({ ...a, unlocked: true }));
    if (areaId === "valley" && intersects(rect, { x: 0.5, y: 8.5, w: 3, h: 2 }))
      return false;
    if (occupancyIssue({ ...base, areas, obstacles: result }, rect))
      return false;
    result.push(o);
    return true;
  };
  // A first clearable stone close to the farm; all other patches stay off infrastructure.
  add("rockSmall", 0, 9);
  for (const [x, y] of [
    [-1, 3],
    [-1, 7],
    [-1, 11],
    [1, 15],
    [3, 18],
    [7, -1],
    [11, -1],
    [16, 0],
    [18, 3],
    [20, 6],
    [19, 11],
    [18, 15],
    [15, 19],
    [10, 20],
    [6, 20],
    [-3, 15],
    [21, 1],
    [22, 9],
    [-3, 9],
  ])
    add("treeLarge", x - 1, y - 1);
  const kinds = Object.keys(obstacleKinds) as ObstacleKind[];
  for (let i = 0; i < 5000 && result.length < 45; i++) {
    const x = -3 + Math.floor(random() * 26),
      y = -4 + Math.floor(random() * 26),
      kind = kinds[i % kinds.length];
    // Keep a useful initial clearing on both sides of the central facilities.
    if (
      intersects(
        {
          x: x - 0.5,
          y: y - 0.5,
          w: obstacleKinds[kind].w,
          h: obstacleKinds[kind].h,
        },
        { x: 0.5, y: 8.5, w: 3, h: 2 },
      )
    )
      continue;
    add(kind, x, y);
  }
  // Guarantee representation of every obstacle type without relying on random acceptance.
  for (const kind of kinds) {
    const needed = kind === "rockSmall" ? 3 : 1;
    for (
      let attempt = 0;
      attempt < 1000 && result.filter((o) => o.kind === kind).length < needed;
      attempt++
    )
      add(kind, -3 + Math.floor(random() * 26), -4 + Math.floor(random() * 26));
  }
  for (const [kind, x, y] of [
    ["rockLarge", 27, 6],
    ["treeLarge", 30, 12],
    ["bushLarge", 26, 17],
    ["roots", 31, 3],
  ] as const)
    add(kind, x, y, "east");
  return result;
}
