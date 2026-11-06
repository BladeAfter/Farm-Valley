import {
  crops,
  items,
  animalOutput,
  animalReadyAt,
  currentOrder,
  animalProducts,
  orders,
  siloUsed,
  barnUsed,
  storageCapacity,
  nextStorageStage,
  playerLevel,
  type Farm,
  type Command,
  type Cell,
  type Crop,
} from "../../src/types/game.js";
import { randomInt } from "node:crypto";
import {
  initialObstacles,
  defaultBuildingPositions,
  landAreas,
  occupancyIssue,
  placementRect,
} from "../../src/data/land.js";
import { obstacleKinds, placementPrices } from "../../src/types/land.js";
import {
  fruitIds,
  fruitSpecies,
  fruitStage,
  fruitRect,
  starterOrchard,
  orchardRules,
} from "../../src/types/orchard.js";
import { defaultPenPositions } from "../../src/data/pens.js";
import { applyProductionCommand, animalAction } from "./production.js";
export function initialFarm(options: { planted?: boolean } = {}): Farm {
  const now = Date.now();
  const farm: Farm = {
    version: 7,
    penPositions: defaultPenPositions(),
    machines: [],
    fruitTrees: starterOrchard(now),
    landSeed: randomInt(1, 2147483647),
    obstacles: [],
    areas: landAreas(),
    buildingPositions: defaultBuildingPositions(),
    decorations: [],
    coins: 150,
    diamonds: 0,
    xp: 0,
    inventory: {
      ...Object.fromEntries(Object.keys(items).map((id) => [id, 0])),
      ...(Object.fromEntries(fruitIds.map((id) => [id, 0])) as Record<
        import("../../src/types/orchard").FruitSpecies,
        number
      >),
      axe: 2,
      saw: 2,
      pickaxe: 2,
      tnt: 2,
      dynamite: 2,
      shovel: 2,
      carrot: 0,
      soybean: 0,
      sugarcane: 0,
      wheat: 8,
      corn: 6,
      feed: 4,
      milk: 0,
      egg: 0,
      goatMilk: 0,
      truffle: 0,
    } as Farm["inventory"],
    plots: Array.from({ length: 24 }, (_, i) => {
      const crop =
        options.planted === false || i >= 18
          ? null
          : i % 6 < 4
            ? ("wheat" as const)
            : ("corn" as const);
      return {
        x: 7 + (i % 6),
        y: 7 + Math.floor(i / 6),
        crop,
        plantedAt: crop ? now - crops[crop].duration : 0,
      };
    }),
    animals: [
      { id: "cow-1", kind: "cow", fedAt: null },
      { id: "chicken-1", kind: "chicken", fedAt: null },
      { id: "chicken-2", kind: "chicken", fedAt: null },
      { id: "goat-1", kind: "goat", fedAt: null },
      { id: "pig-1", kind: "pig", fedAt: null },
    ],
    ordersCompleted: 0,
    storage: { barn: 1, silo: 1 },
    revision: 0,
  };
  farm.obstacles = initialObstacles(farm.landSeed, farm);
  return farm;
}
export function migrateFarm(value: Farm): Farm {
  if (
    value.version === 7 &&
    value.penPositions &&
    value.penPositions.sheep &&
    Array.isArray(value.machines) &&
    Object.keys(items).every((id) =>
      Number.isFinite(value.inventory[id as keyof typeof items]),
    )
  )
    return value;
  const base = initialFarm({ planted: false });
  const animals = structuredClone(value.animals ?? base.animals);
  for (const animal of base.animals.filter(
    (a) => a.kind === "goat" || a.kind === "pig",
  )) {
    if (!animals.some((existing) => existing.kind === animal.kind))
      animals.push(animal);
  }
  const migrated: Farm = {
    ...base,
    ...value,
    version: 7,
    penPositions: { ...base.penPositions, ...value.penPositions },
    inventory: {
      ...Object.fromEntries(Object.keys(items).map((id) => [id, 0])),
      ...base.inventory,
      ...value.inventory,
    },
    animals: animals.map((animal) => ({
      ...animal,
      production:
        animal.fedAt === null
          ? null
          : { readyAt: animalReadyAt(animal)!, product: animalOutput(animal) },
    })),
    ordersCompleted: value.ordersCompleted ?? 0,
    storage: { ...base.storage, ...value.storage },
  };
  if (!Array.isArray(value.obstacles))
    migrated.obstacles = initialObstacles(migrated.landSeed, migrated);
  return migrated;
}
function fieldAction(
  farm: Farm,
  action: "plant" | "harvest",
  cell: Cell,
  cropId: Crop,
  now: number,
) {
  const plot = farm.plots.find((p) => p.x === cell.x && p.y === cell.y);
  if (!plot) throw new Error("Canteiro inválido.");
  if (action === "plant") {
    if (playerLevel(farm) < crops[cropId].level)
      throw new Error("Cultura bloqueada para este nivel.");
    if (plot.crop) throw new Error("Este canteiro já está plantado.");
    if (farm.inventory[cropId] < crops[cropId].seed)
      throw new Error(
        "Guarde uma semente para replantar. Colha os campos maduros primeiro.",
      );
    farm.inventory[cropId] -= crops[cropId].seed;
    plot.crop = cropId;
    plot.plantedAt = now;
  } else {
    if (!plot.crop) throw new Error("Canteiro vazio.");
    const crop = crops[plot.crop];
    if (now - plot.plantedAt < crop.duration)
      throw new Error("A plantação ainda está crescendo.");
    if (siloUsed(farm) + crop.yield > storageCapacity(farm, "silo"))
      throw new Error("Silo cheio. Entregue um pedido para liberar espaço.");
    farm.inventory[plot.crop] += crop.yield;
    farm.xp += crop.xp;
    plot.crop = null;
    plot.plantedAt = 0;
  }
}
export function applyCommand(
  previous: Farm,
  command: Command,
  now = Date.now(),
): Farm {
  const farm = structuredClone(migrateFarm(previous));
  if (applyProductionCommand(farm, command, now)) {
    farm.revision++;
    return farm;
  }
  switch (command.type) {
    case "plant-fruit-tree": {
      const config = fruitSpecies[command.species];
      if (playerLevel(farm) < config.level)
        throw new Error("Esta árvore exige nível " + config.level + ".");
      const issue = occupancyIssue(farm, fruitRect(command));
      if (issue) throw new Error(issue);
      if (farm.coins < config.price) throw new Error("Moedas insuficientes.");
      farm.coins -= config.price;
      farm.fruitTrees.push({
        id: "fruit-" + farm.revision,
        species: command.species,
        x: command.x,
        y: command.y,
        plantedAt: now,
        growsAt: now + config.growth,
        readyAt: now + config.growth + config.duration,
        lastHarvestAt: null,
        harvestCount: 0,
        harvestLimit: orchardRules.harvestLimitEnabled
          ? orchardRules.harvestLimit
          : null,
        removedAt: null,
      });
      break;
    }
    case "harvest-fruit-tree": {
      const tree = farm.fruitTrees.find((t) => t.id === command.treeId);
      if (!tree || tree.harvestCount !== command.expectedHarvestCount)
        throw new Error("Esta colheita já mudou. Atualize a fazenda.");
      if (fruitStage(tree, now) !== "ready")
        throw new Error("Esta árvore ainda não está pronta para colher.");
      const config = fruitSpecies[tree.species];
      if (barnUsed(farm) + config.yield > storageCapacity(farm, "barn"))
        throw new Error("Celeiro cheio. Libere espaço antes de colher.");
      farm.inventory[tree.species] += config.yield;
      farm.xp += config.xp;
      tree.harvestCount++;
      tree.lastHarvestAt = now;
      tree.readyAt = now + config.duration;
      break;
    }
    case "remove-fruit-tree": {
      const tree = farm.fruitTrees.find((t) => t.id === command.treeId);
      if (!tree || fruitStage(tree, now) !== "dry")
        throw new Error("Somente árvores secas podem ser removidas.");
      if (farm.inventory.saw < 1)
        throw new Error("Você precisa de um serrote.");
      farm.inventory.saw--;
      tree.removedAt = now;
      break;
    }
    case "remove-obstacle": {
      const obstacle = farm.obstacles.find((o) => o.id === command.obstacleId);
      if (!obstacle || obstacle.removedAt !== null)
        throw new Error("Este obstáculo já foi removido ou não existe.");
      if (!farm.areas.find((a) => a.id === obstacle.areaId)?.unlocked)
        throw new Error("Esta área ainda está bloqueada.");
      const tool = obstacleKinds[obstacle.kind].tool;
      if (farm.inventory[tool] < 1)
        throw new Error("Você precisa de mais ferramentas.");
      farm.inventory[tool]--;
      obstacle.removedAt = now;
      break;
    }
    case "move-pen":
    case "move-field": {
      if (
        command.type === "move-pen" &&
        !farm.animals.some((a) => a.kind === command.animalKind)
      )
        throw new Error("Voc\u00ea ainda n\u00e3o tem este cercado.");
      const placement =
        command.type === "move-pen"
          ? { kind: "pen" as const, animalKind: command.animalKind }
          : { kind: "moveField" as const, from: command.from };
      const issue = occupancyIssue(
        farm,
        placementRect(placement, command.x, command.y),
        undefined,
        placement,
      );
      if (issue) throw new Error(issue);
      if (command.type === "move-pen")
        farm.penPositions[command.animalKind] = { x: command.x, y: command.y };
      else {
        const plot = farm.plots.find(
          (p) => p.x === command.from.x && p.y === command.from.y,
        );
        if (!plot) throw new Error("Canteiro inexistente.");
        plot.x = command.x;
        plot.y = command.y;
      }
      break;
    }
    case "place-field":
    case "place-decoration":
    case "move-building": {
      const placement =
        command.type === "move-building"
          ? { kind: "building" as const, buildingId: command.buildingId }
          : {
              kind:
                command.type === "place-field"
                  ? ("field" as const)
                  : ("decoration" as const),
            };
      const issue = occupancyIssue(
        farm,
        placementRect(placement, command.x, command.y),
        placement.kind === "building" ? placement.buildingId : undefined,
      );
      if (issue) throw new Error(issue);
      const price =
        placement.kind === "building" ? 0 : placementPrices[placement.kind];
      if (farm.coins < price) throw new Error("Moedas insuficientes.");
      farm.coins -= price;
      if (placement.kind === "building")
        farm.buildingPositions[placement.buildingId] = {
          x: command.x,
          y: command.y,
        };
      else if (placement.kind === "field")
        farm.plots.push({
          x: command.x,
          y: command.y,
          crop: null,
          plantedAt: 0,
        });
      else
        farm.decorations.push({
          id: "flower-" + farm.revision,
          x: command.x,
          y: command.y,
        });
      break;
    }
    case "plant":
      fieldAction(farm, "plant", command, command.crop, now);
      break;
    case "harvest":
      fieldAction(farm, "harvest", command, "wheat", now);
      break;
    case "field-stroke": {
      if (!command.cells.length || command.cells.length > 64)
        throw new Error("Seleção inválida.");
      const unique = new Set(command.cells.map((c) => c.x + "," + c.y));
      if (unique.size !== command.cells.length)
        throw new Error("Canteiros duplicados.");
      for (const cell of command.cells)
        fieldAction(farm, command.action, cell, command.crop, now);
      break;
    }
    case "feed-animal":
    case "collect-animal": {
      const animal = farm.animals.find((a) => a.id === command.animalId);
      if (!animal) throw new Error("Animal inv\u00e1lido.");
      animalAction(
        farm,
        animal,
        command.type === "feed-animal" ? "feed" : "collect",
        now,
      );
      break;
    }
    case "buy-feed": {
      const kind = command.kind ?? "chicken",
        feed = animalProducts[kind].feed;
      if (
        !farm.animals.some((a) => a.kind === kind) &&
        playerLevel(farm) < animalProducts[kind].level
      )
        throw new Error("Animal bloqueado para este n\u00edvel.");
      const price = (items[feed].sellPrice! + 2) * 3;
      if (farm.coins < price) throw new Error("Moedas insuficientes.");
      if (barnUsed(farm) + 3 > storageCapacity(farm, "barn"))
        throw new Error("Celeiro cheio.");
      farm.coins -= price;
      farm.inventory[feed] += 3;
      break;
    }
    case "buy-seed": {
      const config = crops[command.crop];
      if (playerLevel(farm) < config.level)
        throw new Error("Cultura bloqueada para este nivel.");
      const price = config.seedPrice;
      if (farm.coins < price) throw new Error("Moedas insuficientes.");
      if (siloUsed(farm) + 3 > storageCapacity(farm, "silo"))
        throw new Error("Silo cheio.");
      farm.coins -= price;
      farm.inventory[command.crop] += 3;
      break;
    }
    case "make-feed":
      throw new Error(
        "Use a f\u00e1brica de ra\u00e7\u00e3o para enfileirar a receita.",
      );
    case "upgrade-storage": {
      if (farm.storage[command.storage] !== command.expectedLevel)
        throw new Error("Este armazém já mudou. Atualize a fazenda.");
      const next = nextStorageStage(farm, command.storage);
      if (!next)
        throw new Error("Este armazém já está na última etapa disponível.");
      if (playerLevel(farm) < next.requiredLevel)
        throw new Error(
          "Alcance o nível " +
            next.requiredLevel +
            " para melhorar este armazém.",
        );
      if (farm.coins < next.cost) throw new Error("Moedas insuficientes.");
      farm.coins -= next.cost;
      farm.storage[command.storage]++;
      break;
    }
    case "deliver-order": {
      if (command.orderId !== farm.ordersCompleted)
        throw new Error("Este pedido já foi entregue. Atualize o quadro.");
      const order = currentOrder(farm);
      if (command.item && command.item !== order.item)
        throw new Error("O pedido mudou. Atualize o quadro.");
      if (farm.inventory[order.item] < order.amount)
        throw new Error("Faltam produtos para entregar este pedido.");
      farm.inventory[order.item] -= order.amount;
      farm.coins += order.coins;
      farm.xp += order.xp;
      farm.ordersCompleted++;
      break;
    }
  }
  farm.revision++;
  return farm;
}
