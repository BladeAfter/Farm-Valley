import { test } from "node:test";
import assert from "node:assert/strict";
import {
  animalHome,
  constrainAnimal,
  containsPen,
  pens,
  penLocal,
} from "../src/data/pens";
import { toIso } from "../src/game/map/isometric";

test("four square pastures are separate and avoid crop beds and both cross roads", () => {
  const values = Object.values(pens);
  for (const p of values) {
    assert.equal(p.size, 3);
    assert.ok(p.x + p.size < 5 || p.x > 5);
    assert.ok(p.y + p.size < 5 || p.y > 5);
    assert.ok(p.x >= 13 || p.x + p.size < 6.5 || p.y + p.size < 6.5);
    for (const q of values.filter((q) => q !== p))
      assert.ok(
        p.x + p.size <= q.x ||
          q.x + q.size <= p.x ||
          p.y + p.size <= q.y ||
          q.y + q.size <= p.y,
      );
  }
});
test("all saved animal IDs have safe homes and constrained routes including off-map targets", () => {
  for (const id of ["cow-1", "chicken-1", "chicken-2", "goat-1", "pig-1"]) {
    const kind = id.split("-")[0] as keyof typeof pens;
    const home = animalHome(id);
    const same = constrainAnimal(id, home.x, home.y);
    assert.ok(Math.hypot(same.x - home.x, same.y - home.y) < 1e-8);
    for (let x = -5; x <= 7; x += 0.25)
      for (let y = -5; y <= 7; y += 0.25) {
        const world = toIso(pens[kind].x + x, pens[kind].y + y);
        const safe = constrainAnimal(id, world.x, world.y);
        assert.ok(containsPen(kind, safe.x, safe.y));
        const local = penLocal(kind, safe.x, safe.y);
        assert.ok(
          local.x >= 1.25 - 1e-8 || local.y >= 1.4 - 1e-8,
          "shelter remains blocked",
        );
      }
  }
});
