import { useLabels } from "../../i18n/labels";
import { t } from "../../i18n/core";
import { useState } from "react";
import { Clock } from "lucide-react";
import { AnimalCard, GameTabs } from "../ui/GameComponents";
import { pens } from "../../data/pens";
import {
  animalFeedAvailable,
  animalOutput,
  animalProducts,
  animalRemaining,
  barnUsed,
  items,
  storageCapacity,
  type AnimalKind,
} from "../../types/game";
import { useFarm } from "../../store/useFarm";
import { animalPortrait } from "../../data/animals";
import { formatTime } from "../../utils/time";
export function AnimalProductionPanel({ now }: { now: number }) {
  const { items, pens } = useLabels();
  const { snapshot, animalKind, act, busy } = useFarm();
  const [selectedKind, setSelectedKind] = useState<AnimalKind>("chicken");
  if (!snapshot) return null;
  const farm = snapshot.farm,
    ownedKinds = [...new Set(farm.animals.map((a) => a.kind))];
  const currentKind =
    animalKind ??
    (ownedKinds.includes(selectedKind) ? selectedKind : ownedKinds[0]);
  const animals = farm.animals.filter((a) => a.kind === currentKind),
    config = animalProducts[currentKind];
  if (!config) return <p>{t("animals.title")}</p>;
  const stock = { ...farm.inventory };
  const feedable = animals.filter((animal) => {
    if (animal.fedAt !== null) return false;
    const type = animalProducts[animal.kind].feed,
      feed = stock[type] > 0 ? type : "feed";
    if (stock[feed] < 1) return false;
    stock[feed]--;
    return true;
  });
  const ready = animals.filter((animal) => animalRemaining(animal, now) === 0);
  return (
    <div className="animal-paddock-panel">
      {!animalKind && (
        <GameTabs
          label={t("animals.title")}
          value={currentKind}
          onChange={setSelectedKind}
          options={ownedKinds.map((kind) => ({
            id: kind,
            label: pens[kind].title,
            image: animalPortrait(kind),
          }))}
        />
      )}
      <div className="paddock-summary">
        <img src={items[config.feed].image} alt="" />
        <div>
          <b>{items[config.feed].name}</b>
          <small>
            {farm.inventory.feed > 0 ? t("animals.reserve",{count:farm.inventory[config.feed],reserve:farm.inventory.feed}) : t("inventory.available",{count:farm.inventory[config.feed]})}
          </small>
        </div>
        <span>
          {t("animals.count",{count:animals.length})}
        </span>
      </div>
      <div className="animal-list">
        {animals.map((animal) => {
          const remaining = animalRemaining(animal, now),
            product = animalOutput(animal),
            ready = remaining === 0;
          return (
            <AnimalCard
              key={animal.id}
              name={config.name + (animal.id.endsWith("2") ? " II" : "")}
              image={animalPortrait(animal.kind)}
              product={items[remaining === null ? config.feed : product].image}
              ready={ready}
              state={
                remaining === null
                  ? t("animals.hungry")
                  : ready
                    ? t("animals.ready",{name:items[product].name})
                    : t("animals.producing")
              }
            >
              {remaining !== null && remaining > 0 ? (
                <div className="animal-timer">
                  <Clock size={13} />
                  <span>{formatTime(remaining)}</span>
                </div>
              ) : (
                <button
                  className="primary"
                  disabled={
                    busy ||
                    (remaining === null &&
                      animalFeedAvailable(farm, animal.kind) < 1) ||
                    (ready &&
                      barnUsed(farm) + config.yield >
                        storageCapacity(farm, "barn"))
                  }
                  onClick={() =>
                    void act({
                      type:
                        remaining === null ? "feed-animal" : "collect-animal",
                      animalId: animal.id,
                    })
                  }
                >
                  {remaining === null
                    ? t("animals.feed")
                    : t("animals.collect")}
                </button>
              )}
            </AnimalCard>
          );
        })}
      </div>
      {(feedable.length > 0 || ready.length > 0) && (
        <div className="animal-batch">
          {feedable.length > 0 && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                void act({
                  type: "animal-batch",
                  action: "feed",
                  animalIds: feedable.map((a) => a.id),
                })
              }
            >
              {t("animals.feedBatch",{count:feedable.length})}
            </button>
          )}
          {ready.length > 0 && (
            <button
              className="primary"
              disabled={
                busy ||
                barnUsed(farm) + ready.length * config.yield >
                  storageCapacity(farm, "barn")
              }
              onClick={() =>
                void act({
                  type: "animal-batch",
                  action: "collect",
                  animalIds: ready.map((a) => a.id),
                })
              }
            >
              {t("animals.collectBatch",{count:ready.length})}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
