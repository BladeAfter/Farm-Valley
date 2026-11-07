import { useLabels } from "../../i18n/labels";
import { t } from "../../i18n/core";
import { duration } from "../../i18n/core";
import { useState } from "react";
import { useFarm, type ShopCategory } from "../../store/useFarm";
import { BuildingCard, LevelLock, RewardBadge } from "../ui/GameComponents";
import {
  animalProducts,
  barnUsed,
  cropIds,
  crops,
  items,
  playerLevel,
  siloUsed,
  storageCapacity,
  type AnimalKind,
} from "../../types/game";
import { machineIds, machineImage, machineKinds } from "../../data/production";
import { fruitIds, fruitSpecies } from "../../types/orchard";
import { storageImage } from "../../data/buildings";
import { animalPortrait } from "../../data/animals";
import { pens } from "../../data/pens";
const categories: {
  id: ShopCategory;
  label: string;
  image: string;
}[] = [
  {
    id: "agriculture",
    get label() {
      return t("farm.agriculture");
    },
    image: "/assets/crops/wheat/ready-v2.webp",
  },
  {
    id: "animals",
    get label() {
      return t("farm.animals");
    },
    image: animalPortrait("cow"),
  },
  {
    id: "factories",
    get label() {
      return t("farm.factories");
    },
    image: machineImage("bakery"),
  },
  {
    id: "trees",
    get label() {
      return t("farm.trees");
    },
    image: "/assets/trees/orchard/apple/portrait-v1.webp",
  },
  {
    id: "decorations",
    get label() {
      return t("farm.decorations");
    },
    image: "/assets/decorations/flowers-v2.webp",
  },
  {
    id: "storage",
    get label() {
      return t("farm.storage");
    },
    image: storageImage("barn", 1),
  },
  {
    id: "supplies",
    get label() {
      return t("farm.supplies");
    },
    image: "/assets/products/feed.svg",
  },
];
type Entry = {
  id: string;
  name: string;
  image: string;
  description: string;
  level: number;
  price?: number;
  owned?: boolean;
  disabled?: boolean;
  reason?: string;
  action: string;
  run: () => void | Promise<unknown>;
};
export function FarmShop() {
  const { crops, fruitSpecies, items, machineKinds, pens } = useLabels();
  const {
    snapshot,
    shopCategory,
    setShopCategory,
    startPlacement,
    act,
    busy,
    openStorage,
    openAnimals,
    openMachine,
  } = useFarm();
  const [selection, setSelection] = useState("");
  if (!snapshot) return null;
  const farm = snapshot.farm,
    level = playerLevel(farm);
  let entries: Entry[] = [];
  if (shopCategory === "agriculture")
    entries = [
      {
        id: "field",
        name: t("farm.field"),
        image: "/assets/ui/field.svg",
        level: 1,
        price: 5,
        description: t("shop.fieldDescription",{count:farm.plots.length}),
        action: t("common.actionNamed",{action:t("common.place"),name:t("farm.field")}),
        run: () => startPlacement({ kind: "field" }),
      },
      ...cropIds.map((crop) => ({
        id: crop,
        name: t("shop.seedName",{name:items[crop].name}),
        image: items[crop].image,
        level: crops[crop].level,
        price: crops[crop].seedPrice,
        description: t("shop.seedsDescription",{count:farm.inventory[crop],time:duration(crops[crop].duration)}),
        disabled: siloUsed(farm) + 3 > storageCapacity(farm, "silo"),
        reason: t("errors.silo"),
        action: t("common.buyNamed",{name:t("farm.seeds")}),
        run: () => act({ type: "buy-seed", crop }),
      })),
    ];
  if (shopCategory === "factories")
    entries = machineIds.map((kind) => {
      const config = machineKinds[kind],
        owned = farm.machines.find((m) => m.kind === kind);
      return {
        id: kind,
        name: config.name,
        image: machineImage(kind),
        level: config.level,
        price: config.price,
        owned: !!owned,
        description: owned
          ? t("shop.machineOwned",{slots:owned.slots,queued:owned.jobs.length})
          : t("shop.machineDescription"),
        action: t(owned?"common.openNamed":"common.buyNamed",{name:config.name}),
        run: () =>
          owned
            ? openMachine(owned.id)
            : startPlacement({ kind: "machine", machineKind: kind }),
      };
    });
  if (shopCategory === "animals")
    entries = (Object.keys(animalProducts) as AnimalKind[]).map((kind) => {
      const config = animalProducts[kind],
        owned = farm.animals.some((a) => a.kind === kind),
        purchasable = kind === "sheep";
      return {
        id: kind,
        name: pens[kind].title,
        image: animalPortrait(kind),
        level: owned ? 1 : config.level,
        owned,
        price: purchasable ? 120 : undefined,
        disabled: !owned && !purchasable,
        reason: t("shop.unavailable"),
        description: t("shop.animalDescription",{name:config.name,product:items[config.product].name,feed:items[config.feed].name}),
        action: owned?t("common.visit"):t("common.buyNamed",{name:pens[kind].title}),
        run: () =>
          owned ? openAnimals(kind) : startPlacement({ kind: "sheep" }),
      };
    });
  if (shopCategory === "trees")
    entries = fruitIds.map((species) => {
      const config = fruitSpecies[species];
      return {
        id: species,
        name: config.name,
        image: `/assets/trees/orchard/${species}/portrait-v1.webp`,
        level: config.level,
        price: config.price,
        description: t("shop.fruitDescription",{count:config.yield,cycle:duration(config.duration),growth:duration(config.growth)}),
        action: t("common.buyNamed",{name:config.name}),
        run: () => startPlacement({ kind: "fruitTree", species }),
      };
    });
  if (shopCategory === "decorations")
    entries = [
      {
        id: "flowers",
        name: t("farm.flowers"),
        image: "/assets/decorations/flowers-v2.webp",
        level: 1,
        price: 8,
        description: t("shop.flowersDescription"),
        action: t("common.actionNamed",{action:t("common.place"),name:t("farm.flowers")}),
        run: () => startPlacement({ kind: "decoration" }),
      },
    ];
  if (shopCategory === "storage")
    entries = (["silo", "barn"] as const).map((kind) => ({
      id: kind,
      name: kind === "silo" ? t("farm.silo") : t("farm.barn"),
      image: storageImage(kind, farm.storage[kind]),
      level: 1,
      owned: true,
      description: t("shop.storageDescription",{count:storageCapacity(farm,kind)}),
      action: t("farm.storage"),
      run: () => openStorage(kind),
    }));
  if (shopCategory === "supplies")
    entries = (Object.keys(animalProducts) as AnimalKind[]).map((kind) => {
      const config = animalProducts[kind],
        feed = config.feed;
      return {
        id: kind,
        name: items[feed].name,
        image: items[feed].image,
        level: farm.animals.some((a) => a.kind === kind) ? 1 : config.level,
        price: (items[feed].sellPrice! + 2) * 3,
        description: t("shop.feedDescription",{count:farm.inventory[feed]}),
        disabled: barnUsed(farm) + 3 > storageCapacity(farm, "barn"),
        reason: t("errors.barn"),
        action: t("common.buyNamed",{name:items[feed].name}),
        run: () => act({ type: "buy-feed", kind }),
      };
    });
  const selected =
    entries.find((entry) => entry.id === selection) ?? entries[0];
  const locked = selected && level < selected.level;
  const affordable =
    !selected?.price || selected.owned || farm.coins >= selected.price;
  return (
    <div className="farm-shop">
      <nav className="catalog-categories" aria-label={t("common.shop")}>
        {categories.map((category) => (
          <button
            key={category.id}
            aria-pressed={shopCategory === category.id}
            className={shopCategory === category.id ? "active" : ""}
            onClick={() => {
              setShopCategory(category.id);
              setSelection("");
            }}
          >
            <img src={category.image} alt="" />
            <span>{category.label}</span>
          </button>
        ))}
      </nav>
      <div className="catalog-content">
        <div className="catalog-heading">
          <b>{categories.find((c) => c.id === shopCategory)?.label}</b>
          <small>{t("common.options",{count:entries.length})}</small>
        </div>
        <div className="catalog-grid">
          {entries.map((entry) => (
            <BuildingCard
              key={entry.id}
              name={entry.name}
              image={entry.image}
              price={entry.price}
              level={entry.level}
              locked={level < entry.level}
              owned={entry.owned}
              selected={entry.id === selected?.id}
              onClick={() => setSelection(entry.id)}
            />
          ))}
        </div>
        {selected && (
          <section className="catalog-detail" aria-label={t("farm.buildings")}>
            <img src={selected.image} alt="" />
            <div>
              <h3>{selected.name}</h3>
              <p>{selected.description}</p>
              {locked ? (
                <LevelLock level={selected.level} />
              ) : selected.disabled ? (
                <small className="catalog-warning">{selected.reason}</small>
              ) : !affordable ? (
                <small className="catalog-warning">{t("errors.coins")}</small>
              ) : (
                <small className="catalog-hint">
                  {selected.owned
                    ? t("common.owned")
                    : t("common.available")}
                </small>
              )}
            </div>
            <div className="catalog-action">
              {selected.price !== undefined && !selected.owned && (
                <RewardBadge kind="coins" value={selected.price} />
              )}
              <button
                className="primary"
                aria-label={selected.action}
                disabled={busy || locked || selected.disabled || !affordable}
                onClick={() => void selected.run()}
              >
                {selected.owned
                  ? t("common.open")
                  : shopCategory === "supplies" ||
                      cropIds.some((c) => c === selected.id)
                    ? t("common.buy")
                    : t("common.place")}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
