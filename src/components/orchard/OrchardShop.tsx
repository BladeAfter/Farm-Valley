import { fruitIds, fruitSpecies } from "../../types/orchard";
import { useFarm } from "../../store/useFarm";
import { playerLevel } from "../../types/game";
export function OrchardShop() {
  const { snapshot, startPlacement } = useFarm();
  if (!snapshot) return null;
  return (
    <div className="orchard-shop-grid">
      {fruitIds.map((id) => {
        const config = fruitSpecies[id],
          locked = playerLevel(snapshot.farm) < config.level;
        return (
          <article key={id}>
            <img
              src={"/assets/trees/orchard/" + id + "/portrait-v1.webp"}
              alt=""
            />
            <div>
              <b>{config.name}</b>
              <small>
                {config.yield} {config.fruit.toLocaleLowerCase("pt-BR")} ·{" "}
                {config.duration / 3_600_000} h
              </small>
              <small>
                Crescimento: {config.growth / 60_000} min · Nível {config.level}
              </small>
            </div>
            <button
              className="primary"
              aria-label={"Comprar " + config.name}
              disabled={locked || snapshot.farm.coins < config.price}
              onClick={() => startPlacement({ kind: "fruitTree", species: id })}
            >
              {locked ? "Nível " + config.level : config.price + " moedas"}
            </button>
          </article>
        );
      })}
    </div>
  );
}
