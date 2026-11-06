import { useEffect } from "react";
import { Leaf } from "lucide-react";
import { useState } from "react";
import { World } from "./components/World";
import { Hud } from "./components/hud/Hud";
import { FarmControls } from "./components/hud/FarmControls";
import { FarmPanels } from "./components/modals/FarmPanels";
import { PlotPopover } from "./components/modals/PlotPopover";
import { useFarm } from "./store/useFarm";
import { PlacementBar } from "./components/obstacles/PlacementBar";
export function App() {
  const { load, message, busy, snapshot } = useFarm();
  const [noticeVisible, setNoticeVisible] = useState(true);
  useEffect(() => {
    setNoticeVisible(true);
    const timer = window.setTimeout(() => setNoticeVisible(false), 4500);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <main>
      <World />
      <div className="world-vignette" />
      <Hud />
      <FarmControls />
      <PlotPopover />
      <FarmPanels />
      <PlacementBar />
      <div role="status" className="toast" data-visible={noticeVisible || busy}>
        {busy ? "Cuidando da fazenda…" : message}
      </div>
      <div className="build-status">
        <i className={snapshot ? "connected" : ""} />
        {snapshot
          ? snapshot.storage === "file"
            ? "Salvo neste servidor"
            : snapshot.persistent
              ? "Online · progresso salvo"
              : "Alpha · progresso temporário"
          : "Conectando ao vale…"}
      </div>
      {!snapshot && (
        <div className="loading-overlay">
          <Leaf size={42} />
          <h2>Abrindo as porteiras…</h2>
          <p>{message}</p>
          <button onClick={() => void load()}>Tentar conectar</button>
        </div>
      )}
      <div className="rotate">
        <Leaf size={48} />
        <h2>Um vale inteiro para explorar</h2>
        <p>Vire o celular na horizontal para jogar.</p>
      </div>
    </main>
  );
}
