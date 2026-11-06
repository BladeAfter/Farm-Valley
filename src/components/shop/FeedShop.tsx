import {
  animalProducts,
  barnUsed,
  items,
  playerLevel,
  storageCapacity,
  type AnimalKind,
} from "../../types/game";
import { useFarm } from "../../store/useFarm";
export function FeedShop({ onMachines }: { onMachines: () => void }) {
  const { snapshot, act, busy, openMachine } = useFarm();
  if (!snapshot) return null;
  const farm = snapshot.farm,
    mill = farm.machines.find((m) => m.kind === "feedMill");
  return (
    <>
      <div className="feed-supplies">
        {(Object.keys(animalProducts) as AnimalKind[])
          .filter(
            (kind) =>
              farm.animals.some((a) => a.kind === kind) ||
              playerLevel(farm) >= animalProducts[kind].level,
          )
          .map((kind) => {
            const feed = animalProducts[kind].feed,
              price = (items[feed].sellPrice! + 2) * 3;
            return (
              <div className="shop-item" key={kind}>
                <img src={items[feed].image} alt="" />
                <div>
                  <b>{items[feed].name}</b>
                  <span>3 unidades · no celeiro: {farm.inventory[feed]}</span>
                </div>
                <button
                  className="primary"
                  disabled={
                    busy ||
                    farm.coins < price ||
                    barnUsed(farm) + 3 > storageCapacity(farm, "barn")
                  }
                  onClick={() => void act({ type: "buy-feed", kind })}
                >
                  {price} moedas
                </button>
              </div>
            );
          })}
      </div>
      <button
        className="secondary"
        onClick={() => (mill ? openMachine(mill.id) : onMachines())}
      >
        {mill
          ? "Fabricar na minha fábrica"
          : "Construir fábrica de ração · nível 2"}
      </button>
      <p className="subtle">
        Fabricar suas rações custa ingredientes da colheita. Os pacotes de
        reserva permitem cuidar dos animais enquanto a fábrica trabalha.
      </p>
    </>
  );
}
