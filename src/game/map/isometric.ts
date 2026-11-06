export const TILE_W = 88,
  TILE_H = 44;
export const toIso = (x: number, y: number) => ({
  x: ((x - y) * TILE_W) / 2,
  y: ((x + y) * TILE_H) / 2,
});
export const fromIso = (x: number, y: number) => ({
  x: Math.round(x / TILE_W + y / TILE_H),
  y: Math.round(y / TILE_H - x / TILE_W),
});
