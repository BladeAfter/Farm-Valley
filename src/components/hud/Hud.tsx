import { t, number as formatNumber } from "../../i18n/core";
import { Settings, Plus, Minus, LocateFixed, Maximize } from "lucide-react";
import { useFarm } from "../../store/useFarm";
import { ResourceCounter } from "../ui/ResourceCounter";
export function Hud() {
  const { snapshot, open } = useFarm();
  const farm = snapshot?.farm,
    level = 1 + Math.floor((farm?.xp ?? 0) / 50);
  const zoom = (delta: number) =>
    window.dispatchEvent(new CustomEvent("farm-zoom", { detail: delta }));
  return (
    <>
      <header className="hud">
        <div className="player-card">
          <div className="level-badge">
            <img src="/assets/ui/star.svg" alt="" />
            <b>{formatNumber(level)}</b>
          </div>
          <div className="player-info">
            <b>{t("farm.title")}</b>
            <div className="xp">
              <span style={{ width: ((farm?.xp ?? 0) % 50) * 2 + "%" }} />
            </div>
            <small>
              {t("common.level",{level})}
              <span>{formatNumber((farm?.xp ?? 0)%50)} / {formatNumber(50)} {t("common.xp")}</span>
            </small>
          </div>
        </div>
        <div className="game-logo">
          FARM<span>VALLEY</span>
        </div>
        <div className="wallet">
          <ResourceCounter
            value={farm?.coins ?? 0}
            image="/assets/ui/coin.svg"
            label={t("common.coins")}
          />
          <ResourceCounter
            value={farm?.diamonds ?? 0}
            image="/assets/ui/diamond.svg"
            label={t("common.diamonds")}
          />
          <button
            className="square-button"
            onClick={() => open("settings")}
            aria-label={t("common.settings")}
          >
            <Settings size={22} />
          </button>
        </div>
      </header>
      {farm && farm.xp === 0 && (
        <aside className="quest">
          <img src="/assets/ui/sickle.svg" alt="" />
          <div>
            <b>{t("tutorial.firstHarvest")}</b>
            <span>{t("tutorial.sickle")}</span>
          </div>
        </aside>
      )}
      <aside className="camera-tools">
        <button aria-label={t("common.zoomIn")} onClick={() => zoom(0.12)}>
          <Plus />
        </button>
        <button aria-label={t("common.zoomOut")} onClick={() => zoom(-0.12)}>
          <Minus />
        </button>
        <button
          aria-label={t("common.center")}
          onClick={() => window.dispatchEvent(new Event("farm-home"))}
        >
          <LocateFixed size={20} />
        </button>
        <button
          aria-label={t("common.fullscreen")}
          onClick={() => {
            void document.documentElement.requestFullscreen?.().catch(() => {});
          }}
        >
          <Maximize size={18} />
        </button>
      </aside>
    </>
  );
}
