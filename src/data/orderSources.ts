import { animalProducts, cropIds, crops, type AnimalKind, type Crop, type Farm, type Item } from "../types/game";
import { fruitIds, fruitSpecies, type FruitSpecies } from "../types/orchard";
import { machineKinds, recipes, type RecipeId } from "./production";
import { getLabels } from "../i18n/labels";
import { t } from "../i18n/core";

export function orderProductSource(farm: Farm, item: Item) {
  const { crops, fruitSpecies, machineKinds, pens } = getLabels();
  if (cropIds.includes(item as Crop)) return { kind: "crop" as const, crop: item as Crop, label: t("farm.field"), level: crops[item as Crop].level };
  if (fruitIds.includes(item as FruitSpecies)) return { kind: "tree" as const, tree: farm.fruitTrees.find(t => t.species === item && t.removedAt === null), label: fruitSpecies[item as FruitSpecies].name, level: fruitSpecies[item as FruitSpecies].level };
  const animal = (Object.keys(animalProducts) as AnimalKind[]).find(kind => animalProducts[kind].product === item);
  if (animal) return { kind: "animal" as const, animal, label: pens[animal].title, level: animalProducts[animal].level };
  const recipe = recipes[item as RecipeId];
  if (recipe) return { kind: "machine" as const, machine: farm.machines.find(m => m.kind === recipe.machine), label: machineKinds[recipe.machine].name, level: recipe.level };
  return { kind: "legacy" as const, label: t("orders.legacy"), level: 1 };
}
