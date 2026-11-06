import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { FileFarmRepository } from "../server/database/file-repository";

test("server file transaction serializes simultaneous removal and survives a fresh repository", async () => {
  const path = resolve(".data", "test-" + randomUUID() + ".json"),
    repo = new FileFarmRepository(path);
  try {
    await repo.create("player");
    const before = await repo.access("player"),
      id = before.obstacles[0].id;
    const results = await Promise.allSettled([
      repo.access("player", { type: "remove-obstacle", obstacleId: id }),
      repo.access("player", { type: "remove-obstacle", obstacleId: id }),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const restarted = new FileFarmRepository(path),
      saved = await restarted.access("player");
    assert.equal(saved.inventory.pickaxe, before.inventory.pickaxe - 1);
    assert.notEqual(saved.obstacles[0].removedAt, null);
    assert.equal(saved.revision, before.revision + 1);
    assert.equal(saved.landSeed, before.landSeed);
    const others = saved.obstacles
      .filter(
        (o) =>
          o.kind === "rockSmall" &&
          o.removedAt === null &&
          o.areaId === "valley",
      )
      .slice(0, 2);
    assert.equal(others.length, 2);
    const competing = await Promise.allSettled(
      others.map((o) =>
        restarted.access("player", {
          type: "remove-obstacle",
          obstacleId: o.id,
        }),
      ),
    );
    assert.equal(competing.filter((r) => r.status === "fulfilled").length, 1);
    const after = await restarted.access("player");
    assert.equal(after.inventory.pickaxe, 0);
    assert.equal(after.revision, before.revision + 2);
    const stable = structuredClone(after);
    await assert.rejects(() =>
      restarted.access("player", {
        type: "remove-obstacle",
        obstacleId: "missing",
      }),
    );
    assert.deepEqual(await restarted.access("player"), stable);
    await assert.rejects(() =>
      restarted.access("another-player", {
        type: "remove-obstacle",
        obstacleId: id,
      }),
    );
  } finally {
    await unlink(path).catch(() => {});
  }
});
