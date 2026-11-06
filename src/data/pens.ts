import type { AnimalKind } from "../types/game";
import { toIso } from "../game/map/isometric";

// Presentation only: animal identities, production and saved snapshots stay on the server.
export const pens: Record<
  AnimalKind,
  { x: number; y: number; size: number; title: string; width: number }
> = {
  sheep: { x: 19, y: 8, size: 3, title: "Aprisco", width: 110 },
  chicken: { x: 0.5, y: -3.2, size: 3, title: "Galinheiro", width: 105 },
  goat: { x: 10, y: 0, size: 3, title: "Abrigo das cabras", width: 110 },
  pig: { x: 0.5, y: 1.2, size: 3, title: "Chiqueiro", width: 100 },
  cow: { x: 13, y: 5.7, size: 3, title: "Estábulo", width: 115 },
};

export const penKindForAnimal = (id: string): AnimalKind =>
  id.split("-")[0] as AnimalKind;
export type PenPositions = Partial<
  Record<AnimalKind, { x: number; y: number }>
>;
export const defaultPenPositions = () =>
  Object.fromEntries(
    Object.entries(pens).map(([kind, p]) => [kind, { x: p.x, y: p.y }]),
  ) as Record<AnimalKind, { x: number; y: number }>;
export const penLayout = (kind: AnimalKind, positions?: PenPositions) => ({
  ...pens[kind],
  ...positions?.[kind],
});
export function animalHome(id: string, positions?: PenPositions) {
  const pen = penLayout(penKindForAnimal(id), positions);
  const chicken = id.startsWith("chicken");
  const x = chicken ? (id.endsWith("2") ? 2.05 : 1.05) : 1.8;
  return toIso(pen.x + x, pen.y + (chicken ? 1.9 : 1.85));
}

/** Continuous inverse projection (never round to a grid cell for collisions). */
export function penLocal(
  kind: AnimalKind,
  wx: number,
  wy: number,
  positions?: PenPositions,
) {
  const pen = penLayout(kind, positions);
  return { x: wx / 88 + wy / 44 - pen.x, y: wy / 44 - wx / 88 - pen.y };
}
export function containsPen(
  kind: AnimalKind,
  wx: number,
  wy: number,
  positions?: PenPositions,
) {
  const p = penLocal(kind, wx, wy, positions),
    size = pens[kind].size;
  return p.x >= 0 && p.y >= 0 && p.x <= size && p.y <= size;
}

// Leave a body-sized clearance from all rails and the shelter in the back corner.
export function constrainAnimal(
  id: string,
  wx: number,
  wy: number,
  positions?: PenPositions,
) {
  const kind = penKindForAnimal(id),
    pen = penLayout(kind, positions),
    p = penLocal(kind, wx, wy, positions);
  const margin = kind === "cow" ? 0.7 : kind === "chicken" ? 0.4 : 0.55;
  const clamp = (v: number) => Math.max(margin, Math.min(pen.size - margin, v));
  let x = clamp(p.x),
    y = clamp(p.y);
  if (x < 1.25 && y < 1.4) y = 1.4;
  return toIso(pen.x + x, pen.y + y);
}
