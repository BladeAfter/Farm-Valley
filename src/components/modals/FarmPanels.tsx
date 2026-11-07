import { useLabels } from "../../i18n/labels";
import { t } from "../../i18n/core";
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
import { LanguagePicker } from "../settings/LanguagePicker";
import { MarketPanel } from "../market/MarketPanel";
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
  const { fruitSpecies, machineKinds, obstacleKinds, pens } = useLabels();
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
    panel === "machine" ||
      panel === "animals" ||
      panel === "fruitTree" ||
      panel === "orders",
  );
  if (!panel) return null;
  const farm = snapshot?.farm,
    obstacle = farm?.obstacles.find((o) => o.id === obstacleId);
  const titles = {
    market:t("market.title"),
    machine:
      machineKinds[
        farm?.machines.find((m) => m.id === machineId)?.kind ?? "feedMill"
      ].name,
    fruitTree:
      fruitSpecies[
        farm?.fruitTrees.find((t) => t.id === fruitTreeId)?.species ?? "apple"
      ].name,
    obstacle: obstacle ? obstacleKinds[obstacle.kind].name : t("common.remove"),
    inventory: t("inventory.title"),
    shop: t("shop.title"),
    orders: t("orders.title"),
    animals: animalKind ? pens[animalKind].title : t("animals.title"),
    settings: t("common.settings"),
    buildings: t("farm.buildings"),
  };
  const small =
    ["fruitTree", "obstacle", "settings"].includes(panel) ||
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
          : panel === "shop" || panel === "buildings" || panel === "orders"
            ? "large"
            : "medium"
      }
      className={
        "modal-" +
        panel +
        (panel === "animals" && animalKind ? " modal-pen" : "")
      }
    >
      {panel === "market" && <MarketPanel />}
      {panel === "obstacle" && <ObstaclePanel />}
      {panel === "fruitTree" && <FruitTreePanel now={now} />}
      {panel === "machine" && <MachinePanel now={now} />}
      {panel === "inventory" && <InventoryPanel />}
      {(panel === "shop" || panel === "buildings") && <FarmShop />}
      {panel === "orders" && <OrdersPanel now={now} />}
      {panel === "animals" && <AnimalProductionPanel now={now} />}
      {panel === "settings" && (
        <div className="settings-content">
          <LanguagePicker />
          <p>{t("tutorial.help")}</p>
          <button
            className="settings-option"
            aria-pressed={soundEnabled}
            onClick={toggleSound}
          >
            {soundEnabled ? <Volume2 /> : <VolumeX />}
            <span>
              <b>{t("common.sound")}</b>
              <small>
                {soundEnabled ? t("common.enabled") : t("common.disabled")}
              </small>
            </span>
          </button>
          <button className="settings-option" onClick={() => void load()}>
            <RotateCcw />
            <span>
              <b>{t("common.sync")}</b>
              <small>{t("common.fetchUpdates")}</small>
            </span>
          </button>
          <div
            className={"connection " + (snapshot?.persistent ? "online" : "")}
          >
            <span />
            {snapshot?.persistent ? t("common.synced") : t("common.temporary")}
          </div>
        </div>
      )}
    </Panel>
  );
}
