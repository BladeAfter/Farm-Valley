import { useFarm } from "../../store/useFarm";
import { obstacleKinds, tools } from "../../types/land";
import { items } from "../../types/game";

export function ObstaclePanel() {
  const { snapshot, obstacleId, act, busy, open } = useFarm();
  const farm = snapshot?.farm,
    obstacle = farm?.obstacles.find((o) => o.id === obstacleId);
  if (!farm || !obstacle) return null;
  const config = obstacleKinds[obstacle.kind],
    tool = config.tool,
    amount = farm.inventory[tool];
  const unlocked = !!farm.areas.find((a) => a.id === obstacle.areaId)?.unlocked;
  const image =
    config.texture === "oak"
      ? "/assets/trees/oak-v2.webp"
      : "/assets/obstacles/" +
        config.texture.replace("obstacle-", "") +
        "-v1.webp";
  return (
    <div className="obstacle-content">
      <img className="obstacle-portrait" src={image} alt="" />
      <p>
        Libera {config.w} × {config.h} espaços no terreno.
      </p>
      <div className="removal-tool">
        <img src={items[tool].image} alt="" />
        <div>
          <b>1 × {tools[tool].name}</b>
          <span>Disponível no inventário: {amount}</span>
        </div>
      </div>
      {!unlocked ? (
        <p className="land-warning">Esta área ainda está bloqueada.</p>
      ) : amount < 1 ? (
        <p className="land-warning">Você precisa de mais ferramentas.</p>
      ) : (
        <p className="subtle">
          A remoção consome uma ferramenta e é permanente.
        </p>
      )}
      <button
        className="primary"
        disabled={
          busy || !unlocked || amount < 1 || obstacle.removedAt !== null
        }
        onClick={async () => {
          if (await act({ type: "remove-obstacle", obstacleId: obstacle.id }))
            open(null);
        }}
      >
        Remover {config.name.toLocaleLowerCase("pt-BR")}
      </button>
    </div>
  );
}
