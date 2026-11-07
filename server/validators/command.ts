import { z } from "zod";
import { items, type Item, cropIds } from "../../src/types/game.js";
import { fruitIds } from "../../src/types/orchard.js";
import { machineIds, recipeIds } from "../../src/data/production.js";
import { localeIds } from "../../src/i18n/languages.js";
const itemIds = Object.keys(items) as [Item, ...Item[]];
const animalKinds = ["cow", "chicken", "goat", "pig", "sheep"] as const;
const position = {
  x: z.number().int().min(-5).max(34),
  y: z.number().int().min(-5).max(34),
};
export const commandSchema = z.discriminatedUnion("type", [
  z.object({type:z.literal("set-language"),locale:z.enum(localeIds)}).strict(),
  z.object({ type: z.literal("deliver-board-order"), orderId: z.string().uuid() }).strict(),
  z.object({ type: z.literal("discard-order"), orderId: z.string().uuid() }).strict(),
  z
    .object({
      type: z.literal("buy-machine"),
      kind: z.enum(machineIds),
      ...position,
    })
    .strict(),
  z
    .object({
      type: z.literal("move-machine"),
      machineId: z.string().min(1).max(60),
      ...position,
    })
    .strict(),
  z
    .object({
      type: z.literal("enqueue-production"),
      machineId: z.string().min(1).max(60),
      recipeId: z.enum(recipeIds),
      expectedRevision: z.number().int().min(0),
    })
    .strict(),
  ...(["collect-production", "cancel-production"] as const).map((type) =>
    z
      .object({
        type: z.literal(type),
        machineId: z.string().min(1).max(60),
        jobId: z.string().min(1).max(60),
      })
      .strict(),
  ),
  z
    .object({
      type: z.literal("upgrade-machine"),
      machineId: z.string().min(1).max(60),
      expectedSlots: z.number().int().min(2).max(6),
    })
    .strict(),
  z
    .object({
      type: z.literal("animal-batch"),
      action: z.enum(["feed", "collect"]),
      animalIds: z.array(z.string().min(1).max(40)).min(1).max(20),
    })
    .strict(),
  z.object({ type: z.literal("buy-sheep"), ...position }).strict(),
  z
    .object({
      type: z.literal("sell-item"),
      item: z.enum(itemIds),
      amount: z.number().int().min(1).max(99),
      expectedRevision: z.number().int().min(0),
    })
    .strict(),
  z
    .object({
      type: z.literal("move-pen"),
      animalKind: z.enum(animalKinds),
      ...position,
    })
    .strict(),
  z
    .object({
      type: z.literal("move-field"),
      from: z.object(position).strict(),
      ...position,
    })
    .strict(),
  z
    .object({
      type: z.literal("plant-fruit-tree"),
      species: z.enum(fruitIds),
      x: z.number().int().min(-5).max(34),
      y: z.number().int().min(-5).max(23),
    })
    .strict(),
  z
    .object({
      type: z.literal("harvest-fruit-tree"),
      treeId: z.string().min(1).max(60),
      expectedHarvestCount: z.number().int().min(0).max(1e9),
    })
    .strict(),
  z
    .object({
      type: z.literal("remove-fruit-tree"),
      treeId: z.string().min(1).max(60),
    })
    .strict(),
  z
    .object({
      type: z.literal("remove-obstacle"),
      obstacleId: z.string().min(1).max(60),
    })
    .strict(),
  ...(["place-field", "place-decoration"] as const).map((type) =>
    z
      .object({
        type: z.literal(type),
        x: z.number().int().min(-5).max(34),
        y: z.number().int().min(-5).max(23),
      })
      .strict(),
  ),
  z
    .object({
      type: z.literal("move-building"),
      buildingId: z.enum(["house", "barn", "silo"]),
      x: z.number().int().min(-5).max(34),
      y: z.number().int().min(-5).max(23),
    })
    .strict(),
  z
    .object({
      ...position,
      type: z.literal("plant"),
      crop: z.enum(cropIds),
    })
    .strict(),
  z.object({ ...position, type: z.literal("harvest") }).strict(),
  z
    .object({
      type: z.literal("field-stroke"),
      action: z.enum(["plant", "harvest"]),
      crop: z.enum(cropIds),
      cells: z.array(z.object(position).strict()).min(1).max(64),
    })
    .strict(),
  z
    .object({ type: z.literal("feed-animal"), animalId: z.string().max(40) })
    .strict(),
  z
    .object({ type: z.literal("collect-animal"), animalId: z.string().max(40) })
    .strict(),
  z
    .object({
      type: z.literal("buy-feed"),
      kind: z.enum(animalKinds).optional(),
    })
    .strict(),
  z.object({ type: z.literal("buy-seed"), crop: z.enum(cropIds) }).strict(),
  z.object({ type: z.literal("make-feed") }).strict(),
  z
    .object({
      type: z.literal("upgrade-storage"),
      storage: z.enum(["barn", "silo"]),
      expectedLevel: z.number().int().min(1).max(3),
    })
    .strict(),
  z
    .object({
      type: z.literal("deliver-order"),
      orderId: z.number().int().min(0),
      item: z.enum(itemIds).optional(),
    })
    .strict(),
]);
