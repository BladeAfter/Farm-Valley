import { useState } from "react";
import { useFarm } from "../../store/useFarm";
import {
  barnUsed,
  cropIds,
  items,
  siloUsed,
  storageCapacity,
  type Crop,
  type Item,
  type StorageKind,
} from "../../types/game";
import { storageImage } from "../../data/buildings";
import { StorageUpgrades } from "../buildings/StorageUpgrades";
import {
  GameTabs,
  ItemCard,
  ProgressIndicator,
  UpgradePanel,
} from "../ui/GameComponents";

export function InventoryPanel() {
  const { snapshot, act, busy, storageKind: storage, openStorage } = useFarm();
  const [selected, setSelected] = useState<Item | null>(null);
  const [amount, setAmount] = useState(1);
  const [upgrades, setUpgrades] = useState(false);
  if (!snapshot) return null;
  const farm = snapshot.farm;
  const stock = (Object.keys(items) as Item[]).filter(
    (id) =>
      (cropIds.includes(id as Crop) ? "silo" : "barn") === storage &&
      farm.inventory[id] > 0,
  );
  const chooseStorage = (kind: StorageKind) => {
    openStorage(kind);
    setSelected(null);
    setUpgrades(false);
  };
  return (
    <div className="storage-browser">
      <GameTabs
        value={storage}
        onChange={chooseStorage}
        label="Armazenamento"
        options={[
          {
            id: "silo",
            label: "Silo",
            image: storageImage("silo", farm.storage.silo),
          },
          {
            id: "barn",
            label: "Celeiro",
            image: storageImage("barn", farm.storage.barn),
          },
        ]}
      />
      {upgrades ? (
        <UpgradePanel
          title={"Melhorar " + (storage === "silo" ? "silo" : "celeiro")}
          onBack={() => setUpgrades(false)}
        >
          <StorageUpgrades only={storage} />
        </UpgradePanel>
      ) : (
        <>
          <div className="storage-browser-summary">
            <ProgressIndicator
              value={storage === "silo" ? siloUsed(farm) : barnUsed(farm)}
              max={storageCapacity(farm, storage)}
              label="Espaços ocupados"
            />
            <button className="secondary" onClick={() => setUpgrades(true)}>
              Melhorar
            </button>
          </div>
          <div
            className="storage-product-grid"
            aria-label="Produtos armazenados"
          >
            {stock.map((id) => (
              <ItemCard
                key={id}
                name={items[id].name}
                image={items[id].image}
                quantity={farm.inventory[id]}
                selected={selected === id}
                onClick={() => {
                  setSelected(id);
                  setAmount(1);
                }}
              />
            ))}
            {!stock.length && (
              <p className="storage-empty">
                Ainda não há produtos aqui. Suas próximas colheitas e coletas
                aparecerão neste espaço.
              </p>
            )}
          </div>
          {selected && (
            <section
              className="storage-product-detail"
              aria-label={"Detalhes de " + items[selected].name}
            >
              <img src={items[selected].image} alt="" />
              <div>
                <b>{items[selected].name}</b>
                <small>{farm.inventory[selected]} disponíveis</small>
              </div>
              {items[selected].sellPrice ? (
                <>
                  <label className="sale-amount">
                    Quantidade
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={amount}
                      onChange={(event) =>
                        setAmount(
                          Math.max(
                            1,
                            Math.min(
                              99,
                              Math.trunc(Number(event.target.value) || 1),
                            ),
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    className="primary"
                    aria-label={"Vender " + items[selected].name}
                    disabled={busy || farm.inventory[selected] < amount}
                    onClick={() =>
                      void act({
                        type: "sell-item",
                        item: selected,
                        amount,
                        expectedRevision: farm.revision,
                      })
                    }
                  >
                    <img src="/assets/ui/coin.svg" alt="" /> Vender ·{" "}
                    {items[selected].sellPrice! * amount}
                  </button>
                </>
              ) : (
                <small>Reservado para os cuidados da fazenda.</small>
              )}
            </section>
          )}
          <p className="subtle">
            Toque em um produto para consultar ou vender. Guarde sementes para
            replantar.
          </p>
        </>
      )}
    </div>
  );
}
