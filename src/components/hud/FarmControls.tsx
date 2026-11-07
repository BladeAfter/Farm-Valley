import { number as formatNumber } from "../../i18n/core";
import { useLabels } from "../../i18n/labels";
import { t } from "../../i18n/core";
import { duration } from "../../i18n/core";
import { useEffect, useState } from "react";
import { Hand, Leaf, MoreHorizontal, X, Lock } from "lucide-react";
import { useFarm } from "../../store/useFarm";
import { items, crops, cropIds, playerLevel } from "../../types/game";
import { storageImage } from "../../data/buildings";
export function FarmControls() {
  const { crops, items } = useLabels();
  const { tool, setTool, selected, select, open, openShop, snapshot, panel } =
    useFarm();
  const [seedsOpen, setSeedsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => {
    if (panel) {
      setSeedsOpen(false);
      setMoreOpen(false);
    }
  }, [panel]);
  useEffect(() => {
    const close = () => setSeedsOpen(false);
    window.addEventListener("farm-seed-picked", close);
    return () => window.removeEventListener("farm-seed-picked", close);
  }, []);
  const level = snapshot ? playerLevel(snapshot.farm) : 1;
  return (
    <footer className="farm-controls compact-controls">
      <div className="field-tools">
        <div className="toolbox">
          <button
            className={tool === "hand" ? "active" : ""}
            aria-label={t("common.explore")}
            title="Explorar"
            onClick={() => {
              setTool("hand");
              setSeedsOpen(false);
            }}
          >
            <Hand />
          </button>
          <button
            className={tool === "plant" ? "active" : ""}
            aria-label={t("farm.plant")}
            aria-expanded={seedsOpen}
            title="Escolher sementes"
            onClick={() => {
              setSeedsOpen(!seedsOpen);
              setMoreOpen(false);
            }}
          >
            <Leaf />
          </button>
          <button
            data-farm-harvest
            className={tool === "harvest" ? "active" : ""}
            aria-label={t("farm.harvest")}
            title={t("farm.harvest")}
            onClick={() => {
              setTool("harvest");
              setSeedsOpen(false);
            }}
          >
            <img src="/assets/ui/sickle.svg" alt="" />
          </button>
        </div>
        {tool === "plant" && !seedsOpen && (
          <button
            className="selected-seed"
            aria-label={t("common.changeSeed")}
            onClick={() => setSeedsOpen(true)}
          >
            <img src={items[selected].image} alt="" />
            <span>
              {items[selected].name}
              <small>{t("farm.inSilo",{count:snapshot?.farm.inventory[selected]??0})}</small>
            </span>
          </button>
        )}
        {seedsOpen && (
          <section className="seed-picker" aria-label={t("farm.seeds")}>
            <header>
              <div>
                <b>{t("farm.seeds")}</b>
                <small>{t("tutorial.seeds")}</small>
              </div>
              <button
                aria-label={t("common.close")}
                onClick={() => setSeedsOpen(false)}
              >
                <X size={18} />
              </button>
            </header>
            <div className="seed-grid">
              {cropIds.map((crop) => {
                const locked = level < crops[crop].level;
                return (
                  <button
                    key={crop}
                    data-farm-seed={locked ? undefined : crop}
                    aria-label={t("common.actionNamed",{action:t("farm.plant"),name:items[crop].name})}
                    disabled={locked}
                    className={selected === crop ? "selected" : ""}
                    onClick={() => {
                      select(crop);
                      setSeedsOpen(false);
                    }}
                  >
                    <img draggable={false} src={items[crop].image} alt="" />
                    <b>{items[crop].name}</b>
                    <small>
                      {locked ? (
                        <>
                          <Lock size={11} />{t("common.level",{level:crops[crop].level})}
                        </>
                      ) : (
                        duration(crops[crop].duration)
                      )}
                    </small>
                    <em>{formatNumber(snapshot?.farm.inventory[crop] ?? 0)}</em>
                  </button>
                );
              })}
            </div>
            <p>{t("common.shop")}</p>
          </section>
        )}
      </div>
      <nav className="farm-nav">
        <button
          aria-current={
            panel === "shop" || panel === "buildings" ? "page" : undefined
          }
          onClick={() => openShop()}
        >
          <img src="/assets/buildings/farmhouse/house-v3.webp" alt="" />
          <span>{t("common.shop")}</span>
        </button>
        <button
          aria-current={panel === "inventory" ? "page" : undefined}
          onClick={() => open("inventory")}
        >
          <img
            src={storageImage("barn", snapshot?.farm.storage.barn ?? 1)}
            alt=""
          />
          <span>{t("common.inventory")}</span>
        </button>
        <button
          aria-label={t("common.orders")}
          aria-current={panel === "orders" ? "page" : undefined}
          onClick={() => open("orders")}
        >
          <img src="/assets/ui/orders.svg" alt="" />
          <span>{t("common.orders")}</span>
        </button>
        <button
          aria-label={t("common.moreOptions")}
          aria-expanded={moreOpen}
          onClick={() => {
            setMoreOpen(!moreOpen);
            setSeedsOpen(false);
          }}
        >
          <MoreHorizontal />
          <span>{t("common.more")}</span>
        </button>
        {moreOpen && (
          <div className="farm-more-menu">
            <button
              aria-label={t("farm.buildings")}
              onClick={() => {
                openShop("factories");
                setMoreOpen(false);
              }}
            >
              <img src="/assets/buildings/farmhouse/house-v3.webp" alt="" />
              <span>{t("farm.buildings")}</span>
            </button>
            <button
              onClick={() => {
                open("animals");
                setMoreOpen(false);
              }}
            >
              <img src="/assets/animals/cow/portrait-v4.webp" alt="" />
              <span>{t("farm.animals")}</span>
            </button>
          </div>
        )}
      </nav>
    </footer>
  );
}
