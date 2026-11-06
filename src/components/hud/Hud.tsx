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
            <b>{level}</b>
          </div>
          <div className="player-info">
            <b>Vale de Alecrim</b>
            <div className="xp">
              <span style={{ width: ((farm?.xp ?? 0) % 50) * 2 + "%" }} />
            </div>
            <small>
              Nível {level}
              <span>{(farm?.xp ?? 0) % 50} / 50 XP</span>
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
            label="Moedas"
          />
          <ResourceCounter
            value={farm?.diamonds ?? 0}
            image="/assets/ui/diamond.svg"
            label="Diamantes"
          />
          <button
            className="square-button"
            onClick={() => open("settings")}
            aria-label="Configurações"
          >
            <Settings size={22} />
          </button>
        </div>
      </header>
      {farm && farm.xp === 0 && (
        <aside className="quest">
          <img src="/assets/ui/sickle.svg" alt="" />
          <div>
            <b>Sua primeira colheita</b>
            <span>Selecione a foice e arraste sobre o trigo.</span>
          </div>
        </aside>
      )}
      <aside className="camera-tools">
        <button aria-label="Aproximar" onClick={() => zoom(0.12)}>
          <Plus />
        </button>
        <button aria-label="Afastar" onClick={() => zoom(-0.12)}>
          <Minus />
        </button>
        <button
          aria-label="Centralizar fazenda"
          onClick={() => window.dispatchEvent(new Event("farm-home"))}
        >
          <LocateFixed size={20} />
        </button>
        <button
          aria-label="Tela cheia"
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
