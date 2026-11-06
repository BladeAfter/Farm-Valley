import { useEffect, useState } from "react";
import { Hand, Leaf, MoreHorizontal, X, Lock } from "lucide-react";
import { useFarm } from "../../store/useFarm";
import { items, crops, cropIds, playerLevel } from "../../types/game";
import { storageImage } from "../../data/buildings";

export function FarmControls() {
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
            aria-label="Explorar mapa"
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
            aria-label="Modo plantar"
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
            aria-label="Colher com foice"
            title="Colher"
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
            aria-label="Trocar semente"
            onClick={() => setSeedsOpen(true)}
          >
            <img src={items[selected].image} alt="" />
            <span>
              {items[selected].name}
              <small>{snapshot?.farm.inventory[selected] ?? 0} no silo</small>
            </span>
          </button>
        )}
        {seedsOpen && (
          <section className="seed-picker" aria-label="Sementes">
            <header>
              <div>
                <b>Sementes</b>
                <small>Escolha e arraste sobre os canteiros</small>
              </div>
              <button
                aria-label="Fechar sementes"
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
                    aria-label={"Plantar " + items[crop].name}
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
                          <Lock size={11} /> Nível {crops[crop].level}
                        </>
                      ) : (
                        crops[crop].duration / 60000 + " min"
                      )}
                    </small>
                    <em>{snapshot?.farm.inventory[crop] ?? 0}</em>
                  </button>
                );
              })}
            </div>
            <p>Sementes de reserva disponíveis na loja.</p>
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
          <span>Loja</span>
        </button>
        <button
          aria-current={panel === "inventory" ? "page" : undefined}
          onClick={() => open("inventory")}
        >
          <img
            src={storageImage("barn", snapshot?.farm.storage.barn ?? 1)}
            alt=""
          />
          <span>Inventário</span>
        </button>
        <button
          aria-label="Pedidos"
          aria-current={panel === "orders" ? "page" : undefined}
          onClick={() => open("orders")}
        >
          <img src="/assets/ui/orders.svg" alt="" />
          <span>Pedidos</span>
        </button>
        <button
          aria-label="Mais opções"
          aria-expanded={moreOpen}
          onClick={() => {
            setMoreOpen(!moreOpen);
            setSeedsOpen(false);
          }}
        >
          <MoreHorizontal />
          <span>Mais</span>
        </button>
        {moreOpen && (
          <div className="farm-more-menu">
            <button
              aria-label="Construções"
              onClick={() => {
                openShop("factories");
                setMoreOpen(false);
              }}
            >
              <img src="/assets/buildings/farmhouse/house-v3.webp" alt="" />
              <span>Construções</span>
            </button>
            <button
              onClick={() => {
                open("animals");
                setMoreOpen(false);
              }}
            >
              <img src="/assets/animals/cow/portrait-v4.webp" alt="" />
              <span>Animais</span>
            </button>
          </div>
        )}
      </nav>
    </footer>
  );
}
