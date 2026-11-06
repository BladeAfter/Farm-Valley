import {
  readFile,
  mkdir,
  writeFile,
  rename,
  open,
  unlink,
} from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { Farm, Command } from "../../src/types/game.js";
import { initialFarm, migrateFarm, applyCommand } from "../services/farm.js";
type Entries = Record<string, { farm: Farm; expires: number }>;
/** Durable single-process development adapter. Production still requires PostgreSQL. */
export class FileFarmRepository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(readonly path: string) {}
  private transact<T>(operation: (entries: Entries) => T): Promise<T> {
    const task = this.queue.then(async () => {
      let entries: Entries;
      try {
        entries = JSON.parse(await readFile(this.path, "utf8"));
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
        entries = {};
      }
      const result = operation(entries);
      await mkdir(dirname(this.path), { recursive: true });
      const temp = this.path + "." + randomUUID() + ".tmp";
      await writeFile(temp, JSON.stringify(entries), { mode: 0o600 });
      const handle = await open(temp, "r+");
      try {
        await handle.sync();
      } finally {
        await handle.close();
      }
      try {
        for (let attempt = 0; ; attempt++) {
          try {
            await rename(temp, this.path);
            break;
          } catch (error) {
            // Windows scanners may briefly hold a newly written file. Keep the
            // previous save intact and retry the atomic replacement, never delete it.
            const code = (error as NodeJS.ErrnoException).code;
            if (
              attempt >= 5 ||
              !["EPERM", "EACCES", "EBUSY"].includes(code ?? "")
            )
              throw error;
            await delay(25 * (attempt + 1));
          }
        }
      } catch (error) {
        await unlink(temp).catch(() => {});
        throw error;
      }
      return result === undefined ? result : structuredClone(result);
    });
    this.queue = task.catch(() => {});
    return task;
  }
  create(hash: string) {
    return this.transact((entries) => {
      entries[hash] = {
        farm: initialFarm(),
        expires: Date.now() + 30 * 86400000,
      };
    });
  }
  access(hash: string, command?: Command): Promise<Farm> {
    return this.transact((entries) => {
      const entry = entries[hash];
      if (!entry || entry.expires < Date.now())
        throw new Error("Sessão expirada");
      const farm = migrateFarm(entry.farm);
      entry.farm = command ? applyCommand(farm, command) : farm;
      return entry.farm;
    });
  }
}
