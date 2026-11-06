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

const categories: { id: ShopCategory; label: string; image: string }[] = [
  {
    id: "agriculture",
    label: "Agricultura",
    image: "/assets/crops/wheat/ready-v2.webp",
  },
  { id: "animals", label: "Animais", image: animalPortrait("cow") },
  { id: "factories", label: "Fábricas", image: machineImage("bakery") },
  {
    id: "trees",
    label: "Árvores",
    image: "/assets/trees/orchard/apple/portrait-v1.webp",
  },
  {
    id: "decorations",
    label: "Decorações",
    image: "/assets/decorations/flowers-v2.webp",
  },
  { id: "storage", label: "Armazenamento", image: storageImage("barn", 1) },
  { id: "supplies", label: "Suprimentos", image: "/assets/products/feed.svg" },
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
        name: "Canteiro",
        image: "/assets/ui/field.svg",
        level: 1,
        price: 5,
        description: `${farm.plots.length} canteiros na fazenda. Um espaço de terra arada para cultivar e mover individualmente.`,
        action: "Posicionar canteiro",
        run: () => startPlacement({ kind: "field" }),
      },
      ...cropIds.map((crop) => ({
        id: crop,
        name: "Sementes de " + items[crop].name,
        image: items[crop].image,
        level: crops[crop].level,
        price: crops[crop].seedPrice,
        description: `Pacote com 3 sementes. Você possui ${farm.inventory[crop]} no silo. Cresce em ${crops[crop].duration / 60000} min.`,
        disabled: siloUsed(farm) + 3 > storageCapacity(farm, "silo"),
        reason: "Libere 3 espaços no silo.",
        action: "Comprar sementes",
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
          ? `Sua máquina tem ${owned.slots} espaços e ${owned.jobs.length} produtos na fila. Toque nela no mapa para fabricar.`
          : "Construção com 2 espaços de produção. Escolha o lugar no mapa antes de confirmar a compra.",
        action: owned ? "Abrir " + config.name : "Comprar " + config.name,
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
        reason: "Novas compras desta espécie ainda não estão disponíveis.",
        description: `${config.name} · produz ${items[config.product].name.toLocaleLowerCase("pt-BR")}. Alimentação: ${items[config.feed].name.toLocaleLowerCase("pt-BR")}.`,
        action: owned ? "Visitar cercado" : "Comprar aprisco",
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
        description: `${config.yield} ${config.fruit.toLocaleLowerCase("pt-BR")} por colheita, a cada ${config.duration / 3600000} h. Crescimento inicial: ${config.growth / 60000} min.`,
        action: "Comprar " + config.name,
        run: () => startPlacement({ kind: "fruitTree", species }),
      };
    });
  if (shopCategory === "decorations")
    entries = [
      {
        id: "flowers",
        name: "Floreira do vale",
        image: "/assets/decorations/flowers-v2.webp",
        level: 1,
        price: 8,
        description:
          "Um pequeno canteiro de flores para decorar o espaço que você escolher.",
        action: "Posicionar floreira",
        run: () => startPlacement({ kind: "decoration" }),
      },
    ];
  if (shopCategory === "storage")
    entries = (["silo", "barn"] as const).map((kind) => ({
      id: kind,
      name: kind === "silo" ? "Silo" : "Celeiro",
      image: storageImage(kind, farm.storage[kind]),
      level: 1,
      owned: true,
      description: `${storageCapacity(farm, kind)} espaços. Consulte os produtos e a próxima melhoria no seu armazém.`,
      action: "Consultar armazenamento",
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
        description: `3 rações de reserva. Você possui ${farm.inventory[feed]} no celeiro. Para fabricar sua própria ração, toque na fábrica no mapa.`,
        disabled: barnUsed(farm) + 3 > storageCapacity(farm, "barn"),
        reason: "Libere 3 espaços no celeiro.",
        action: "Comprar " + items[feed].name,
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
      <nav className="catalog-categories" aria-label="Categorias da loja">
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
          <small>{entries.length} opções</small>
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
          <section
            className="catalog-detail"
            aria-label="Detalhes da construção"
          >
            <img src={selected.image} alt="" />
            <div>
              <h3>{selected.name}</h3>
              <p>{selected.description}</p>
              {locked ? (
                <LevelLock level={selected.level} />
              ) : selected.disabled ? (
                <small className="catalog-warning">{selected.reason}</small>
              ) : !affordable ? (
                <small className="catalog-warning">Moedas insuficientes.</small>
              ) : (
                <small className="catalog-hint">
                  {selected.owned
                    ? "Já faz parte da sua fazenda"
                    : "Disponível para seu nível"}
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
                  ? "Abrir"
                  : shopCategory === "supplies" ||
                      cropIds.some((c) => c === selected.id)
                    ? "Comprar"
                    : "Posicionar"}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
