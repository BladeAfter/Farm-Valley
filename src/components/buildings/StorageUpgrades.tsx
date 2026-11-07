import { t } from "../../i18n/core";
import { Lock, Check } from "lucide-react";
import { useFarm } from "../../store/useFarm";
import {
  storageStages,
  storageStage,
  nextStorageStage,
  storageCapacity,
  playerLevel,
  barnUsed,
  siloUsed,
  type StorageKind,
} from "../../types/game";
import { storageImage } from "../../data/buildings";
export function StorageUpgrades({
  only,
}: {
  only?: StorageKind;
} = {}) {
  const { snapshot, act, busy } = useFarm();
  const farm = snapshot?.farm;
  if (!farm) return null;
  return (
    <div className="storage-upgrades">
      {(only ? [only] : (["silo", "barn"] as StorageKind[])).map((kind) => {
        const name = kind === "barn" ? t("farm.barn") : t("farm.silo");
        const stage = farm.storage[kind],
          current = storageStage(stage),
          next = nextStorageStage(farm, kind);
        const used = kind === "barn" ? barnUsed(farm) : siloUsed(farm);
        const unlocked = !next || playerLevel(farm) >= next.requiredLevel;
        return (
          <article className="storage-card" key={kind}>
            <div className="storage-card-header">
              <img src={storageImage(kind, stage)} alt="" />
              <div>
                <b>{name}</b>
                <small>
                  {t("inventory.stage",{name:t("farm.stage."+stage),stage})}
                </small>
                <span>
                  {t("inventory.spaces",{used,capacity:storageCapacity(farm,kind)})}
                </span>
              </div>
            </div>
            <progress value={used} max={storageCapacity(farm, kind)} />
            <div className="storage-evolution" hidden={!!only}>
              {storageStages.map((step, index) => (
                <div
                  key={step.capacity}
                  className={
                    index + 1 === stage
                      ? "current"
                      : index + 1 > stage
                        ? "locked"
                        : ""
                  }
                >
                  <img
                    src={storageImage(kind, index + 1)}
                    alt={name}
                  />
                  <small>{step.capacity}</small>
                  {index + 1 <= stage ? <Check size={9} /> : <Lock size={9} />}
                </div>
              ))}
            </div>
            {next ? (
              <>
                <span className="storage-next">
                  {t("inventory.next",{current:current.capacity,next:next.capacity,level:next.requiredLevel})}
                </span>
                <button
                  aria-label={t("inventory.upgradeNamed",{name})}
                  className="primary"
                  disabled={busy || !unlocked || farm.coins < next.cost}
                  onClick={() =>
                    void act({
                      type: "upgrade-storage",
                      storage: kind,
                      expectedLevel: stage,
                    })
                  }
                >
                  {!unlocked ? (
                    <>
                      <Lock size={12} />
                      {t("common.level",{level:next.requiredLevel})}
                    </>
                  ) : (
                    <>
                      <img src="/assets/ui/coin.svg" alt="" />
                      {t("common.coinValue",{coins:next.cost})} · {t("inventory.upgrade")}
                    </>
                  )}
                </button>
              </>
            ) : (
              <span className="storage-max">
                <Check size={13} />
                {t("inventory.max")}
              </span>
            )}
          </article>
        );
      })}
    </div>
  );
}
