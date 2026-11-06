import { useEffect, useState } from "react";
import { RotateCcw, Volume2, VolumeX } from "lucide-react";
import { MachinePanel } from "../buildings/MachinePanel";
import { InventoryPanel } from "../inventory/InventoryPanel";
import { AnimalProductionPanel } from "../animals/AnimalProductionPanel";
import { FarmShop } from "../shop/FarmShop";
import { OrdersPanel } from "../orders/OrdersPanel";
import { GameModal, GameBottomSheet } from "../ui/GameComponents";
import { machineKinds } from "../../data/production";
import { useFarm, farmNow } from "../../store/useFarm";
import { pens } from "../../data/pens";
import { ObstaclePanel } from "../obstacles/ObstaclePanel";
import { obstacleKinds } from "../../types/land";
import { fruitSpecies } from "../../types/orchard";
import { FruitTreePanel } from "../orchard/FruitTreePanel";

function useClock(enabled: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setTick((tick) => tick + 1), 1000);
    return () => clearInterval(id);
  }, [enabled]);
  return farmNow();
}
const closePanel = () => useFarm.getState().open(null);
export function FarmPanels() {
  const {
    soundEnabled,
    toggleSound,
    panel,
    snapshot,
    load,
    animalKind,
    obstacleId,
    fruitTreeId,
    machineId,
  } = useFarm();
  const now = useClock(
    panel === "machine" || panel === "animals" || panel === "fruitTree",
  );
  if (!panel) return null;
  const farm = snapshot?.farm,
    obstacle = farm?.obstacles.find((o) => o.id === obstacleId);
  const titles = {
    machine:
      machineKinds[
        farm?.machines.find((m) => m.id === machineId)?.kind ?? "feedMill"
      ].name,
    fruitTree:
      fruitSpecies[
        farm?.fruitTrees.find((t) => t.id === fruitTreeId)?.species ?? "apple"
      ].name,
    obstacle: obstacle ? obstacleKinds[obstacle.kind].name : "Limpar terreno",
    inventory: "Silo & celeiro",
    shop: "Loja do vale",
    orders: "Pedidos da vila",
    animals: animalKind ? pens[animalKind].title : "Cercados da fazenda",
    settings: "Seu cantinho",
    buildings: "Construções",
  };
  const small =
    ["fruitTree", "obstacle", "settings", "orders"].includes(panel) ||
    (panel === "animals" && !!animalKind);
  const Panel = small ? GameBottomSheet : GameModal;
  return (
    <Panel
      key={panel + (machineId ?? "")}
      title={titles[panel]}
      onClose={closePanel}
      size={
        small
          ? "small"
          : panel === "shop" || panel === "buildings"
            ? "large"
            : "medium"
      }
      className={
        "modal-" +
        panel +
        (panel === "animals" && animalKind ? " modal-pen" : "")
      }
    >
      {panel === "obstacle" && <ObstaclePanel />}
      {panel === "fruitTree" && <FruitTreePanel now={now} />}
      {panel === "machine" && <MachinePanel now={now} />}
      {panel === "inventory" && <InventoryPanel />}
      {(panel === "shop" || panel === "buildings") && <FarmShop />}
      {panel === "orders" && <OrdersPanel />}
      {panel === "animals" && <AnimalProductionPanel now={now} />}
      {panel === "settings" && (
        <div className="settings-content">
          <p>
            Toque nos objetos para cuidar da fazenda. Segure uma construção por
            1,2 s para mover. Arraste o chão para explorar.
          </p>
          <button
            className="settings-option"
            aria-pressed={soundEnabled}
            onClick={toggleSound}
          >
            {soundEnabled ? <Volume2 /> : <VolumeX />}
            <span>
              <b>Sons da fazenda</b>
              <small>{soundEnabled ? "Ativados" : "Desativados"}</small>
            </span>
          </button>
          <button className="settings-option" onClick={() => void load()}>
            <RotateCcw />
            <span>
              <b>Sincronizar progresso</b>
              <small>Buscar atualizações da fazenda</small>
            </span>
          </button>
          <div
            className={"connection " + (snapshot?.persistent ? "online" : "")}
          >
            <span />
            {snapshot?.persistent
              ? "Progresso salvo no servidor"
              : "Sessão temporária"}
          </div>
        </div>
      )}
    </Panel>
  );
}
