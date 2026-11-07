import { useLabels } from "../../i18n/labels";
import { t } from "../../i18n/core";
import { duration } from "../../i18n/core";
import { useFarm } from "../../store/useFarm";
import { fruitSpecies, fruitStage } from "../../types/orchard";
import { barnUsed, storageCapacity } from "../../types/game";
export function orchardTime(ms: number) {
  return duration(ms);
}
export function FruitTreePanel({ now }: { now: number }) {
  const { fruitSpecies } = useLabels();
  const { snapshot, fruitTreeId, act, busy, open } = useFarm(),
    farm = snapshot?.farm,
    tree = farm?.fruitTrees.find((t) => t.id === fruitTreeId);
  if (!farm || !tree || tree.removedAt !== null) return null;
  const config = fruitSpecies[tree.species],
    stage = fruitStage(tree, now),
    growing = stage === "seedling" || stage === "growing",
    full = barnUsed(farm) + config.yield > storageCapacity(farm, "barn");
  const progress = growing
    ? (now - tree.plantedAt) / (tree.growsAt - tree.plantedAt)
    : (now - (tree.readyAt - config.duration)) / config.duration;
  return (
    <div className="fruit-tree-panel">
      <img
        className="fruit-panel-icon"
        src={"/assets/products/fruits/" + tree.species + ".svg"}
        alt=""
      />
      {stage === "ready" ? (
        <>
          <p>
            {t("production.ready")}{" "}
            <b>
              {config.yield} × {config.fruit}
            </b>
          </p>
          {full && <p className="land-warning">{t("errors.barn")}</p>}
          <button
            className="primary"
            disabled={busy || full}
            onClick={() =>
              void act({
                type: "harvest-fruit-tree",
                treeId: tree.id,
                expectedHarvestCount: tree.harvestCount,
              })
            }
          >
            {t("farm.harvest")}
            {config.yield} × {config.fruit}
          </button>
        </>
      ) : stage === "dry" ? (
        <>
          <p>{t("farm.dry")}</p>
          <p>{t("items.saw")} · {t("inventory.available",{count:farm.inventory.saw})}</p>
          <button
            className="primary"
            disabled={busy || farm.inventory.saw < 1}
            onClick={async () => {
              if (await act({ type: "remove-fruit-tree", treeId: tree.id }))
                open(null);
            }}
          >
            {t("farm.removeDry")}
          </button>
        </>
      ) : (
        <>
          <p>
            {growing
              ? t("farm.growing")
              : t("farm.fruitProducing",{name:config.fruit})}
          </p>
          <div className="fruit-progress">
            <span
              style={{ width: Math.max(0, Math.min(1, progress)) * 100 + "%" }}
            />
          </div>
          <b>
            {t(growing?"farm.grownIn":"farm.nextHarvest",{time:orchardTime((growing?tree.growsAt:tree.readyAt)-now)})}
          </b>
          <p className="subtle">{t("farm.offlineProduction")}</p>
        </>
      )}
      <small className="subtle">
        {t("farm.harvestCount",{count:tree.harvestCount})}
      </small>
    </div>
  );
}
