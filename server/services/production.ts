import { randomUUID } from "node:crypto";
import {
  animalProducts,
  animalOutput,
  animalRemaining,
  barnUsed,
  cropIds,
  items,
  playerLevel,
  siloUsed,
  storageCapacity,
  type Animal,
  type Command,
  type Crop,
  type Farm,
  type Item,
} from "../../src/types/game.js";
import {
  canAffordRecipe,
  machineKinds,
  machineRect,
  queueUpgradePrices,
  recipeDuration,
  recipeIngredients,
  recipes,
  recipeUnlocked,
  type Machine,
} from "../../src/data/production.js";
import { occupancyIssue } from "../../src/data/land.js";

export function animalAction(
  farm: Farm,
  animal: Animal,
  action: "feed" | "collect",
  now: number,
) {
  const config = animalProducts[animal.kind];
  if (action === "feed") {
    if (animal.fedAt !== null)
      throw new Error("Este animal já foi alimentado. Aguarde a produção.");
    const feed = farm.inventory[config.feed] > 0 ? config.feed : "feed";
    if (farm.inventory[feed] < 1)
      throw new Error(
        "Você precisa de " +
          items[config.feed].name.toLocaleLowerCase("pt-BR") +
          ".",
      );
    farm.inventory[feed]--;
    animal.fedAt = now;
    animal.production = {
      product: config.product,
      readyAt: now + config.duration,
    };
  } else {
    if (animalRemaining(animal, now) !== 0)
      throw new Error("O produto ainda não está pronto.");
    if (barnUsed(farm) + config.yield > storageCapacity(farm, "barn"))
      throw new Error("Celeiro cheio. O produto continua com o animal.");
    farm.inventory[animalOutput(animal)] += config.yield;
    farm.xp += config.xp;
    animal.fedAt = null;
    animal.production = null;
  }
}
function getMachine(farm: Farm, id: string): Machine {
  const machine = farm.machines.find((m) => m.id === id);
  if (!machine) throw new Error("Máquina inexistente.");
  return machine;
}
function requireRevision(farm: Farm, revision: number) {
  if (farm.revision !== revision)
    throw new Error(
      "A fazenda mudou. Atualize antes de repetir esta operação.",
    );
}
export function applyProductionCommand(
  farm: Farm,
  command: Command,
  now: number,
): boolean {
  switch (command.type) {
    case "buy-machine": {
      const config = machineKinds[command.kind];
      if (playerLevel(farm) < config.level)
        throw new Error("Alcance o nível " + config.level + ".");
      if (farm.machines.some((m) => m.kind === command.kind))
        throw new Error("Você já tem esta máquina.");
      const issue = occupancyIssue(farm, machineRect(command));
      if (issue) throw new Error(issue);
      if (farm.coins < config.price) throw new Error("Moedas insuficientes.");
      farm.coins -= config.price;
      farm.machines.push({
        id: randomUUID(),
        kind: command.kind,
        x: command.x,
        y: command.y,
        slots: 2,
        completed: 0,
        builtAt: now,
        jobs: [],
      });
      break;
    }
    case "move-machine": {
      const machine = getMachine(farm, command.machineId);
      const issue = occupancyIssue(farm, machineRect(command), undefined, {
        kind: "moveMachine",
        machineId: machine.id,
      });
      if (issue) throw new Error(issue);
      machine.x = command.x;
      machine.y = command.y;
      break;
    }
    case "enqueue-production": {
      requireRevision(farm, command.expectedRevision);
      const machine = getMachine(farm, command.machineId),
        recipe = recipes[command.recipeId];
      if (recipe.machine !== machine.kind)
        throw new Error("Esta receita pertence a outra máquina.");
      if (!recipeUnlocked(farm, command.recipeId))
        throw new Error("Receita bloqueada para este nível.");
      if (machine.jobs.length >= machine.slots)
        throw new Error("Fila cheia. Colete os produtos ou amplie os espaços.");
      if (!canAffordRecipe(farm, command.recipeId))
        throw new Error("Ingredientes insuficientes.");
      for (const [item, amount] of recipeIngredients(command.recipeId))
        farm.inventory[item] -= amount;
      const duration = recipeDuration(recipe, machine),
        startedAt = Math.max(now, machine.jobs.at(-1)?.readyAt ?? now);
      machine.jobs.push({
        id: randomUUID(),
        recipe: command.recipeId,
        startedAt,
        readyAt: startedAt + duration,
        duration,
        quantity: recipe.quantity,
      });
      break;
    }
    case "collect-production": {
      const machine = getMachine(farm, command.machineId),
        index = machine.jobs.findIndex((job) => job.id === command.jobId),
        job = machine.jobs[index];
      if (!job) throw new Error("Este produto já foi coletado ou não existe.");
      if (now < job.readyAt)
        throw new Error("A fabricação ainda não terminou.");
      if (barnUsed(farm) + job.quantity > storageCapacity(farm, "barn"))
        throw new Error("Celeiro cheio. O produto continua na máquina.");
      farm.inventory[job.recipe] += job.quantity;
      farm.xp += recipes[job.recipe].xp;
      machine.completed++;
      machine.jobs.splice(index, 1);
      break;
    }
    case "cancel-production": {
      const machine = getMachine(farm, command.machineId),
        index = machine.jobs.findIndex((job) => job.id === command.jobId),
        job = machine.jobs[index];
      if (!job) throw new Error("Esta fabricação já mudou.");
      if (now >= job.startedAt)
        throw new Error("Uma fabricação iniciada não pode ser cancelada.");
      const ingredients = recipeIngredients(job.recipe);
      const toSilo = ingredients
        .filter(([id]) => cropIds.includes(id as Crop))
        .reduce((n, [, amount]) => n + amount, 0);
      const toBarn =
        ingredients.reduce((n, [, amount]) => n + amount, 0) - toSilo;
      if (
        siloUsed(farm) + toSilo > storageCapacity(farm, "silo") ||
        barnUsed(farm) + toBarn > storageCapacity(farm, "barn")
      )
        throw new Error("Libere espaço para receber os ingredientes de volta.");
      for (const [id, amount] of ingredients) farm.inventory[id] += amount;
      machine.jobs.splice(index, 1);
      let cursor = machine.jobs[index - 1]?.readyAt ?? now;
      for (let i = index; i < machine.jobs.length; i++) {
        const next = machine.jobs[i];
        next.startedAt = Math.max(now, cursor);
        next.readyAt = next.startedAt + next.duration;
        cursor = next.readyAt;
      }
      break;
    }
    case "upgrade-machine": {
      const machine = getMachine(farm, command.machineId);
      if (machine.slots !== command.expectedSlots || machine.slots >= 6)
        throw new Error("Os espaços desta máquina já mudaram.");
      const price = queueUpgradePrices[machine.slots - 2];
      if (farm.coins < price) throw new Error("Moedas insuficientes.");
      farm.coins -= price;
      machine.slots++;
      break;
    }
    case "animal-batch": {
      if (
        command.animalIds.length === 0 ||
        new Set(command.animalIds).size !== command.animalIds.length
      )
        throw new Error("Seleção de animais inválida.");
      for (const id of command.animalIds) {
        const animal = farm.animals.find((a) => a.id === id);
        if (!animal) throw new Error("Animal inválido.");
        animalAction(farm, animal, command.action, now);
      }
      break;
    }
    case "buy-sheep": {
      if (playerLevel(farm) < 18)
        throw new Error("As ovelhas chegam no nível 18.");
      if (farm.animals.some((a) => a.kind === "sheep"))
        throw new Error("Você já tem um aprisco.");
      const issue = occupancyIssue(
        farm,
        { x: command.x, y: command.y, w: 3, h: 3 },
        undefined,
        { kind: "pen", animalKind: "sheep" },
      );
      if (issue) throw new Error(issue);
      if (farm.coins < 120) throw new Error("Moedas insuficientes.");
      farm.coins -= 120;
      farm.penPositions.sheep = { x: command.x, y: command.y };
      farm.animals.push({
        id: "sheep-1",
        kind: "sheep",
        fedAt: null,
        production: null,
      });
      break;
    }
    case "sell-item": {
      requireRevision(farm, command.expectedRevision);
      const price = items[command.item].sellPrice;
      if (
        !price ||
        command.amount < 1 ||
        !Number.isInteger(command.amount) ||
        command.amount > 99
      )
        throw new Error("Venda inválida.");
      if (farm.inventory[command.item] < command.amount)
        throw new Error("Quantidade insuficiente.");
      farm.inventory[command.item] -= command.amount;
      farm.coins += price * command.amount;
      break;
    }
    default:
      return false;
  }
  return true;
}
