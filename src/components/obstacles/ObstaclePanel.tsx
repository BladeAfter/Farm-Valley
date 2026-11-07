import { t } from "../../i18n/core";
import { useLabels } from "../../i18n/labels";
import { useFarm } from "../../store/useFarm";
import { obstacleKinds, tools } from "../../types/land";
import { items } from "../../types/game";
export function ObstaclePanel() {
  const { items, obstacleKinds, tools } = useLabels();
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
        {t("farm.freeSpaces",{width:config.w,height:config.h})}
      </p>
      <div className="removal-tool">
        <img src={items[tool].image} alt="" />
        <div>
          <b>1 × {tools[tool].name}</b>
          <span>{t("inventory.available",{count:amount})}</span>
        </div>
      </div>
      {!unlocked ? (
        <p className="land-warning">{t("errors.locked")}</p>
      ) : amount < 1 ? (
        <p className="land-warning">{t("errors.stock")}</p>
      ) : (
        <p className="subtle">{t("farm.removeCost")}</p>
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
        {t("common.actionNamed",{action:t("common.remove"),name:config.name})}
      </button>
    </div>
  );
}
