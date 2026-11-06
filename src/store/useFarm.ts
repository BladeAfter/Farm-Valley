import { playFarmSound, setFarmSound } from "../services/farmAudio";
import { animalOutput } from "../types/game";
import { create } from "zustand";
import { connect, command, type Snapshot } from "../services/api";
import type {
  Command,
  Crop,
  Cell,
  AnimalKind,
  StorageKind,
} from "../types/game";
import type { Placement } from "../types/land";
export type Tool = "hand" | "plant" | "harvest";
export type Panel =
  | "inventory"
  | "shop"
  | "orders"
  | "settings"
  | "animals"
  | "buildings"
  | "obstacle"
  | "machine"
  | "fruitTree"
  | null;
type State = {
  snapshot: Snapshot | null;
  selected: Crop;
  tool: Tool;
  busy: boolean;
  soundEnabled: boolean;
  toggleSound: () => void;
  panel: Panel;
  storageKind: StorageKind;
  openStorage: (kind: StorageKind) => void;
  shopCategory: ShopCategory;
  openShop: (category?: ShopCategory) => void;
  setShopCategory: (category: ShopCategory) => void;
  focus: Cell | null;
  animalKind: AnimalKind | null;
  obstacleId: string | null;
  fruitTreeId: string | null;
  machineId: string | null;
  openMachine: (id: string) => void;
  openFruitTree: (id: string) => void;
  placement: Placement | null;
  placementTarget: Cell | null;
  setPlacementTarget: (cell: Cell | null) => void;
  openObstacle: (id: string) => void;
  startPlacement: (placement: Placement | null) => void;
  openAnimals: (kind: AnimalKind) => void;
  message: string;
  clockOffset: number;
  clockAnchor: { server: number; monotonic: number } | null;
  load: () => Promise<void>;
  act: (command: Command) => Promise<boolean>;
  select: (crop: Crop) => void;
  setTool: (tool: Tool) => void;
  open: (panel: Panel) => void;
  setFocus: (cell: Cell | null) => void;
  notice: (message: string) => void;
};
export type ShopCategory =
  | "agriculture"
  | "animals"
  | "factories"
  | "trees"
  | "decorations"
  | "storage"
  | "supplies";
const messages: Record<Command["type"], string> = {
  "buy-machine": "M\u00e1quina constru\u00edda!",
  "move-machine": "M\u00e1quina reposicionada.",
  "enqueue-production": "Ingredientes reservados. Receita na fila!",
  "collect-production": "Produto guardado no celeiro!",
  "cancel-production": "Ingredientes devolvidos.",
  "upgrade-machine": "Novo espa\u00e7o de produ\u00e7\u00e3o!",
  "animal-batch": "Animais cuidados!",
  "buy-sheep": "Nuvem chegou ao seu aprisco!",
  "sell-item": "Venda conclu\u00edda!",
  "move-pen": "Cercado reposicionado.",
  "move-field": "Canteiro reposicionado.",
  "plant-fruit-tree": "Muda plantada! Seu pomar está crescendo.",
  "harvest-fruit-tree": "Frutas fresquinhas guardadas no celeiro!",
  "remove-fruit-tree": "Árvore seca removida. O terreno está livre.",
  "remove-obstacle": "Terreno limpo! O espaço já está disponível.",
  "place-field": "Novo canteiro pronto para plantar.",
  "place-decoration": "Um novo detalhe para o seu vale.",
  "move-building": "Construção reposicionada.",
  plant: "Semente plantada. O vale está crescendo!",
  harvest: "Colheita guardada no silo!",
  "field-stroke": "Campo cuidado! Continue cultivando.",
  "feed-animal": "Barriguinha cheia! A produção começou.",
  "collect-animal": "Produto fresquinho guardado no celeiro!",
  "buy-feed": "Mais 3 rações no celeiro.",
  "buy-seed": "3 sementes de reserva guardadas no silo.",
  "make-feed": "3 rações preparadas com a sua colheita.",
  "deliver-order": "Entrega feita! Moedas e experiência recebidas.",
  "upgrade-storage":
    "Armazém melhorado! Mais espaço e uma nova forma para a sua fazenda.",
};
let loading: Promise<void> | null = null;
export const useFarm = create<State>((set, get) => ({
  snapshot: null,
  selected: "wheat",
  tool: "hand",
  busy: false,
  soundEnabled: true,
  toggleSound: () => {
    const enabled = !get().soundEnabled;
    setFarmSound(enabled);
    set({ soundEnabled: enabled });
  },
  panel: null,
  storageKind: "silo",
  openStorage: (storageKind) =>
    set({ panel: "inventory", storageKind, focus: null }),
  shopCategory: "agriculture",
  openShop: (shopCategory = "agriculture") =>
    set({ panel: "shop", shopCategory, focus: null }),
  setShopCategory: (shopCategory) => set({ shopCategory }),
  focus: null,
  animalKind: null,
  obstacleId: null,
  fruitTreeId: null,
  machineId: null,
  openMachine: (machineId) =>
    set({ panel: "machine", machineId, placement: null, focus: null }),
  openFruitTree: (fruitTreeId) =>
    set({ panel: "fruitTree", fruitTreeId, placement: null, focus: null }),
  placement: null,
  placementTarget: null,
  setPlacementTarget: (placementTarget) => set({ placementTarget }),
  clockOffset: 0,
  clockAnchor: null,
  message: "Sua fazenda está chegando…",
  select: (selected) => set({ selected, tool: "plant" }),
  setTool: (tool) => set({ tool, focus: null }),
  open: (panel) =>
    set({
      panel,
      focus: null,
      animalKind: null,
      ...(panel === "buildings"
        ? { shopCategory: "agriculture" as const }
        : {}),
    }),
  openObstacle: (obstacleId) =>
    set({ panel: "obstacle", obstacleId, focus: null, placement: null }),
  startPlacement: (placement) =>
    set({
      placement,
      placementTarget: null,
      panel: null,
      focus: null,
      tool: "hand",
    }),
  openAnimals: (animalKind) =>
    set({ panel: "animals", animalKind, focus: null }),
  setFocus: (focus) => set({ focus }),
  notice: (message) => set({ message }),
  load: () => {
    if (loading) return loading;
    loading = (async () => {
      try {
        const snapshot = await connect();
        set({
          snapshot,
          clockOffset: snapshot.serverTime - Date.now(),
          clockAnchor: {
            server: snapshot.serverTime,
            monotonic: performance.now(),
          },
          message: "Bem-vindo ao vale! Sua primeira colheita está pronta.",
        });
      } catch (e) {
        set({
          message: e instanceof Error ? e.message : "Servidor indisponível.",
        });
      } finally {
        loading = null;
      }
    })();
    return loading;
  },
  act: async (value) => {
    if (get().busy) return false;
    const before = get().snapshot?.farm;
    set({ busy: true });
    try {
      const snapshot = await command(value);
      set({
        snapshot,
        clockOffset: snapshot.serverTime - Date.now(),
        clockAnchor: {
          server: snapshot.serverTime,
          monotonic: performance.now(),
        },
        message: messages[value.type],
      });
      const collectedIds =
        value.type === "collect-animal"
          ? [value.animalId]
          : value.type === "animal-batch" && value.action === "collect"
            ? value.animalIds
            : [];
      const rewards = collectedIds
        .map((id) => {
          const animal = before?.animals.find((a) => a.id === id);
          return animal ? { id, item: animalOutput(animal) } : null;
        })
        .filter(Boolean);
      if (rewards.length)
        window.dispatchEvent(
          new CustomEvent("farm-animal-rewards", { detail: rewards }),
        );
      if (
        value.type === "collect-production" ||
        collectedIds.length ||
        value.type === "sell-item"
      )
        playFarmSound("collect");
      else if (value.type === "enqueue-production") playFarmSound("start");
      return true;
    } catch (e) {
      // A different tab may already have consumed the tool. Refresh without retrying the command.
      try {
        const snapshot = await connect();
        set({
          snapshot,
          clockOffset: snapshot.serverTime - Date.now(),
          clockAnchor: {
            server: snapshot.serverTime,
            monotonic: performance.now(),
          },
        });
      } catch {}
      set({ message: e instanceof Error ? e.message : "Falha na conexão." });
      return false;
    } finally {
      set({ busy: false });
    }
  },
}));
export const farmNow = () => {
  const anchor = useFarm.getState().clockAnchor;
  return anchor
    ? anchor.server + performance.now() - anchor.monotonic
    : Date.now();
};
