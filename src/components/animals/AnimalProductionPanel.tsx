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
  if (!config) return <p>Os novos moradores aparecerão aqui.</p>;
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
          label="Cercados"
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
            {farm.inventory[config.feed]} disponíveis
            {farm.inventory.feed > 0
              ? ` · ${farm.inventory.feed} de reserva geral`
              : ""}
          </small>
        </div>
        <span>
          {animals.length} {animals.length === 1 ? "animal" : "animais"}
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
                  ? "Precisa de ração"
                  : ready
                    ? items[product].name + " pronto!"
                    : "Produzindo"
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
                  {remaining === null ? "Alimentar" : "Coletar"}
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
              Alimentar {feedable.length} animais
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
              Coletar {ready.length} produtos
            </button>
          )}
        </div>
      )}
    </div>
  );
}
