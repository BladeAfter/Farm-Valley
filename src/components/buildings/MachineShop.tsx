import { machineIds, machineImage, machineKinds } from "../../data/production";
import { playerLevel } from "../../types/game";
import { useFarm } from "../../store/useFarm";
export function MachineShop() {
  const { snapshot, startPlacement, openMachine } = useFarm();
  if (!snapshot) return null;
  const farm = snapshot.farm;
  return (
    <div className="machine-shop">
      {machineIds.map((kind) => {
        const config = machineKinds[kind],
          owned = farm.machines.find((m) => m.kind === kind),
          locked = playerLevel(farm) < config.level;
        return (
          <article key={kind}>
            <img loading="lazy" src={machineImage(kind)} alt="" />
            <div>
              <b>{config.name}</b>
              <small>Nível {config.level} · 2 espaços de produção</small>
            </div>
            <button
              className={owned ? "secondary" : "primary"}
              aria-label={(owned ? "Abrir " : "Comprar ") + config.name}
              disabled={!owned && (locked || farm.coins < config.price)}
              onClick={() =>
                owned
                  ? openMachine(owned.id)
                  : startPlacement({ kind: "machine", machineKind: kind })
              }
            >
              {owned
                ? "Abrir"
                : locked
                  ? "Nível " + config.level
                  : config.price + " moedas"}
            </button>
          </article>
        );
      })}
      <article>
        <img
          loading="lazy"
          src="/assets/animals/sheep/portrait-v1.webp"
          alt=""
        />
        <div>
          <b>Aprisco de ovelhas</b>
          <small>Nuvem produz lã · nível 18</small>
        </div>
        <button
          className="primary"
          disabled={
            playerLevel(farm) < 18 ||
            farm.coins < 120 ||
            farm.animals.some((a) => a.kind === "sheep")
          }
          onClick={() => startPlacement({ kind: "sheep" })}
        >
          {farm.animals.some((a) => a.kind === "sheep")
            ? "Construído"
            : "120 moedas"}
        </button>
      </article>
    </div>
  );
}
