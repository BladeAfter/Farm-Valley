import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildWallGraph,
  wallShape,
  wallContainsPoint,
  farmWalls,
  wallPathsFromCells,
} from "../src/game/map/walls";

test("placed cells infer neighbours and reconnect after moving or rotating", () => {
  const cells = Array.from({ length: 10 }, (_, x) => ({ x: x * 0.5, y: 0 }));
  const g = buildWallGraph(wallPathsFromCells([...cells].reverse()));
  assert.equal(g.nodes.length, 10);
  assert.equal(g.edges.length, 9);
  assert.equal(g.nodes.filter((n) => n.shape === "straight-x").length, 8);
  const rotated = buildWallGraph(
    wallPathsFromCells(cells.map((p) => ({ x: 7, y: p.x + 2 }))),
  );
  assert.equal(rotated.nodes.filter((n) => n.shape === "straight-y").length, 8);
  assert.throws(() => buildWallGraph([[{ x: NaN, y: 0 }]]));
});

test("single, ten consecutive placements and both isometric axes choose matching modules", () => {
  assert.equal(buildWallGraph([[{ x: 0, y: 0 }]]).nodes[0].shape, "single");
  for (const axis of ["x", "y"] as const) {
    const nodes = Array.from({ length: 11 }, (_, i) => ({
      x: axis === "x" ? i : 0,
      y: axis === "y" ? i : 0,
    }));
    const graph = buildWallGraph([nodes]);
    assert.equal(graph.edges.length, 10);
    assert.equal(
      graph.nodes.filter((n) => n.shape.startsWith("straight")).length,
      9,
    );
    assert.equal(
      graph.nodes.filter((n) => n.shape.startsWith("end")).length,
      2,
    );
  }
});
test("all four elbows and a closed square have joined neighbours and no open ends", () => {
  for (const mask of [3, 6, 9, 12])
    assert.ok(wallShape(mask).startsWith("corner"));
  const g = buildWallGraph([
    [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 3, y: 3 },
      { x: 0, y: 3 },
      { x: 0, y: 0 },
    ],
  ]);
  assert.equal(g.nodes.length, 4);
  assert.equal(g.edges.length, 4);
  assert.ok(g.nodes.every((n) => n.shape.startsWith("corner")));
});
test("intersections and overlapping independently placed walls connect without duplicate geometry", () => {
  const g = buildWallGraph([
    [
      { x: 0, y: 0 },
      { x: 4, y: 0 },
    ],
    [
      { x: 2, y: -2 },
      { x: 2, y: 2 },
    ],
    [
      { x: 1, y: 0 },
      { x: 3, y: 0 },
    ],
  ]);
  assert.equal(g.nodes.find((n) => n.x === 2 && n.y === 0)?.mask, 15);
  assert.equal(g.edges.length, 6);
  const moved = buildWallGraph([
    [
      { x: 7, y: 5 },
      { x: 7, y: 9 },
    ],
    [
      { x: 7, y: 7 },
      { x: 9, y: 7 },
    ],
  ]);
  assert.equal(
    moved.nodes.find((n) => n.x === 7 && n.y === 7)?.shape,
    "connection",
  );
});
test("footprint follows actual wall orientation and preserved farm border coordinates", () => {
  assert.ok(wallContainsPoint(farmWalls, { x: 8, y: 6.5 }));
  assert.ok(!wallContainsPoint(farmWalls, { x: 8, y: 7 }));
  assert.ok(!wallContainsPoint(farmWalls, { x: 5, y: 6.5 }));
  assert.ok(
    wallContainsPoint(
      [
        [
          { x: 1, y: 1 },
          { x: 1, y: 4 },
        ],
      ],
      { x: 1.1, y: 3 },
    ),
  );
  assert.throws(() =>
    buildWallGraph([
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    ]),
  );
});
