import type { StorageKind } from "../types/game";
export const buildingLayout = {
  house: { x: 6.5, y: 2, width: 145 },
  barn: {
    x: 2,
    y: 7.5,
    widths: [116, 130, 145],
    flipX: true,
    entrance: { x: 2.15, y: 7.1 },
    roadAccess: { x: 5, y: 7.1 },
  },
  silo: { x: 3, y: 11.5, widths: [62, 72, 82], flipX: false },
} as const;
export function storageImage(kind: StorageKind, stage: number) {
  return stage >= 3
    ? "/assets/buildings/" +
        kind +
        "/" +
        (kind === "barn" ? "barn-v2" : "silo-v2") +
        ".webp"
    : "/assets/buildings/" + kind + "/stage-" + stage + "-v1.webp";
}
export const storageTexture = (kind: StorageKind, stage: number) =>
  kind + "-stage-" + stage;
