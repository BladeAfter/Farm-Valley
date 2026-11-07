import { number as formatNumber } from "../../i18n/core";
import { useLabels } from "../../i18n/labels";
import { t } from "../../i18n/core";
import { useEffect, useState } from "react";
import { X, Clock } from "lucide-react";
import { useFarm, farmNow } from "../../store/useFarm";
import { crops, cropIds, items, playerLevel } from "../../types/game";
import { formatTime } from "../../utils/time";
export function PlotPopover() {
  const { crops, items } = useLabels();
  const {
    focus,
    setFocus,
    snapshot,
    act,
    selected,
    select,
    busy,
    startPlacement,
  } = useFarm();
  const [now, setNow] = useState(farmNow());
  useEffect(() => {
    const id = window.setInterval(() => setNow(farmNow()), 500);
    return () => clearInterval(id);
  }, []);
  const plot = snapshot?.farm.plots.find(
    (p) => p.x === focus?.x && p.y === focus?.y,
  );
  if (!plot) return null;
  const remaining = plot.crop
    ? Math.max(0, crops[plot.crop].duration - (now - plot.plantedAt))
    : 0;
  return (
    <div className="plot-context" role="region" aria-label={t("farm.field")}>
      <div className="plot-popover">
        <button
          className="close"
          aria-label={t("common.close")}
          onClick={() => setFocus(null)}
        >
          <X size={17} />
        </button>
        <img src={items[plot.crop ?? selected].image} alt="" />
        <div>
          <b>{plot.crop ? crops[plot.crop].name : t("farm.readySoil")}</b>
          <small>
            {plot.crop
              ? remaining
                ? t("farm.harvestIn",{time:formatTime(remaining)})
                : t("farm.readyReward",{yield:crops[plot.crop].yield,xp:crops[plot.crop].xp})
              : t("farm.seedYield")}
          </small>
        </div>
        <button
          className="secondary"
          disabled={busy}
          onClick={() =>
            startPlacement({
              kind: "moveField",
              from: { x: plot.x, y: plot.y },
            })
          }
        >
          {t("common.move")}
        </button>
        <button
          className="primary"
          disabled={
            busy ||
            !!remaining ||
            (!plot.crop &&
              (snapshot!.farm.inventory[selected] < crops[selected].seed ||
                playerLevel(snapshot!.farm) < crops[selected].level))
          }
          onClick={() =>
            void act(
              plot.crop
                ? { type: "harvest", x: plot.x, y: plot.y }
                : { type: "plant", x: plot.x, y: plot.y, crop: selected },
            )
          }
        >
          {plot.crop ? (
            remaining ? (
              <Clock size={18} />
            ) : (
              t("farm.harvest")
            )
          ) : (
            t("farm.plant")
          )}
        </button>
      </div>
      {!plot.crop && (
        <div className="plot-seeds" aria-label={t("farm.seeds")}>
          {cropIds.map((crop) => (
            <button
              key={crop}
              aria-label={t("common.chooseNamed",{name:items[crop].name})}
              aria-pressed={selected === crop}
              disabled={playerLevel(snapshot!.farm) < crops[crop].level}
              onClick={() => select(crop)}
            >
              <img src={items[crop].image} alt="" />
              <span>{items[crop].name}</span>
              <small>{formatNumber(snapshot!.farm.inventory[crop])}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
