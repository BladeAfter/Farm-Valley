import { playFarmSound, setFarmSound } from "../services/farmAudio";
import { t } from "../i18n/core";
import { errorInfo } from "../i18n/errors";
import { acceptServerLocale } from "../i18n/loader";
import { ApiError } from "../services/api";
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
  messageCode: string;
  messageParams: Record<string,string|number>;
  messageVersion: number;
  clockOffset: number;
  clockAnchor: { server: number; monotonic: number } | null;
  load: () => Promise<void>;
  refresh: () => Promise<void>;
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
  "set-language": "common.languageSaved",
  "deliver-board-order": "notifications.delivery",
  "deliver-order": "notifications.delivery",
  "discard-order": "notifications.discarded",
  "buy-machine": "notifications.built",
  "move-machine": "notifications.moved",
  "enqueue-production": "notifications.queued",
  "collect-production": "notifications.collected",
  "cancel-production": "notifications.canceled",
  "upgrade-machine": "notifications.upgraded",
  "animal-batch": "notifications.animals",
  "buy-sheep": "notifications.built",
  "sell-item": "notifications.sold",
  "move-pen": "notifications.moved",
  "move-field": "notifications.moved",
  "plant-fruit-tree": "notifications.planted",
  "harvest-fruit-tree": "notifications.collected",
  "remove-fruit-tree": "notifications.removed",
  "remove-obstacle": "notifications.removed",
  "place-field": "notifications.built",
  "place-decoration": "notifications.built",
  "move-building": "notifications.moved",
  "plant": "notifications.planted",
  "harvest": "notifications.harvested",
  "field-stroke": "notifications.fieldStroke",
  "feed-animal": "notifications.fed",
  "collect-animal": "notifications.collected",
  "buy-feed": "notifications.bought",
  "buy-seed": "notifications.bought",
  "make-feed": "notifications.queued",
  "upgrade-storage": "notifications.upgraded"
};
let loading: Promise<void> | null = null;
let refreshing: Promise<void> | null = null;
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
  message: "",
  messageCode: "notifications.loading",
  messageParams: {},
  messageVersion: 0,
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
  notice: (message) => { const info=errorInfo(message); set({message,messageCode:info.code,messageParams:info.params,messageVersion:get().messageVersion+1}); },
  refresh: () => {
    if (get().busy) return Promise.resolve();
    if (refreshing) return refreshing;
    refreshing = (async () => {
      try {
        const snapshot = await connect();
        void acceptServerLocale(snapshot.farm.preferences?.locale);
        if (snapshot.farm.revision >= (get().snapshot?.farm.revision ?? -1)) set({ snapshot,
          clockOffset: snapshot.serverTime - Date.now(), clockAnchor: { server: snapshot.serverTime, monotonic: performance.now() } });
      } finally { refreshing = null; }
    })();
    return refreshing;
  },
  load: () => {
    if (loading) return loading;
    loading = (async () => {
      try {
        const snapshot = await connect();
        void acceptServerLocale(snapshot.farm.preferences?.locale);
        set({
          snapshot,
          clockOffset: snapshot.serverTime - Date.now(),
          clockAnchor: {
            server: snapshot.serverTime,
            monotonic: performance.now(),
          },
          message: t("notifications.welcome"),messageCode:"notifications.welcome",messageParams:{},messageVersion:get().messageVersion+1,
        });
      } catch (e) {
        set({
          message: "",messageCode:"errors.network",messageParams:{},messageVersion:get().messageVersion+1,
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
        message: t(messages[value.type]),messageCode:messages[value.type],messageParams:{},messageVersion:get().messageVersion+1,
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
        value.type === "sell-item" || value.type === "deliver-board-order"
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
      const info=e instanceof ApiError?{code:e.code,params:e.params}:errorInfo(e instanceof Error?e.message:"");
      set({message:"",messageCode:info.code,messageParams:info.params,messageVersion:get().messageVersion+1});
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
