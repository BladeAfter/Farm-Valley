import {
  items as baseItems,
  crops as baseCrops,
  animalProducts,
  storageStages,
} from "../types/game";
import { machineKinds as baseMachines } from "../data/production";
import { pens as basePens } from "../data/pens";
import { fruitSpecies as baseTrees } from "../types/orchard";
import {
  obstacleKinds as baseObstacles,
  tools as baseTools,
} from "../types/land";
import { customers as baseCustomers } from "../types/orders";
import { t, useLocale } from "./core";
let version = -1;
let cached: ReturnType<typeof build>;
function map<T extends Record<string, object>>(
  data: T,
  transform: (value: T[keyof T], key: string) => object,
): T {
  return Object.fromEntries(
    Object.entries(data).map(([id, value]) => [
      id,
      { ...value, ...transform(value as T[keyof T], id) },
    ]),
  ) as T;
}
function build() {
  return {
    items: map(baseItems, (_, id) => ({ name: t("items." + id) })),
    crops: map(baseCrops, (_, id) => ({ name: t("items." + id) })),
    machineKinds: map(baseMachines, (_, id) => ({
      name: t("production." + id),
    })),
    pens: map(basePens, (_, id) => ({ title: t("animals.pen." + id) })),
    fruitSpecies: map(baseTrees, (_, id) => ({
      name: t("farm.tree." + id),
      fruit: t("items." + id),
      singular: t("items." + id),
    })),
    obstacleKinds: map(baseObstacles, (_, id) => ({
      name: t("farm.obstacle." + id),
    })),
    tools: map(baseTools, (_, id) => ({ name: t("items." + id) })),
    customers: map(baseCustomers, (value, id) => ({
      role: t("orders.customer." + id + ".role"),
      thanks: t("orders.customer." + id + ".thanks"),
    })),
    animalProducts,
    storageStages,
  };
}
export function getLabels() {
  const revision = useLocale.getState().revision;
  if (version !== revision) {
    cached = build();
    version = revision;
  }
  return cached;
}
export function useLabels() {
  useLocale((state) => state.revision);
  return getLabels();
}
