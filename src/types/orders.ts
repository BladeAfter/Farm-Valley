import type { Item } from "./game";

export type CustomerId =
  "rosa" | "bento" | "clara" | "miguel" | "teresa" | "pedro";
export type DeliveryOrder = {
  id: string;
  number: number;
  customer: CustomerId;
  customerName?: string;
  products: { item: Item; amount: number }[];
  coins: number;
  xp: number;
  createdAt: number;
  legacyNumber?: number;
};
export type OrderSlot = {
  id: string;
  generation: number;
  order: DeliveryOrder | null;
  refillAt: number | null;
};
export type OrderBoard = {
  truck?: { orderId:string; departedAt:number; returnsAt:number };
  schema: 1;
  nextNumber: number;
  slots: OrderSlot[];
  position?: { x: number; y: number } | null;
};

export const customers: Record<
  CustomerId,
  { name: string; role: string; thanks: string }
> = {
  rosa: {
    name: "Dona Rosa",
    role: "Padaria da vila",
    thanks: "Vai sair uma fornada especial! Obrigada!",
  },
  bento: {
    name: "Seu Bento",
    role: "Leiteria da serra",
    thanks: "Fresquinho e caprichado, como sempre!",
  },
  clara: {
    name: "Clara",
    role: "Pomar e sucos",
    thanks: "As frutas do seu vale são uma delícia!",
  },
  miguel: {
    name: "Miguel",
    role: "Horta da vila",
    thanks: "Colheita boa assim merece aplausos!",
  },
  teresa: {
    name: "Vovó Teresa",
    role: "Doces de família",
    thanks: "Minha próxima receita vai ter seu carinho!",
  },
  pedro: {
    name: "Pedro",
    role: "Mercado do vale",
    thanks: "A vila agradece sua entrega!",
  },
};
export const orderRules = {
  truckTravelMs: 45_000,
  deliveryDelayMs: 45_000,
  discardDelayMs: 120_000,
  maxProducts: 2,
  unlocks: [
    { level: 1, slots: 2 },
    { level: 3, slots: 3 },
    { level: 6, slots: 4 },
    { level: 10, slots: 5 },
    { level: 15, slots: 6 },
  ],
};
export const orderSlotCount = (level: number) =>
  [...orderRules.unlocks].reverse().find((rule) => level >= rule.level)
    ?.slots ?? 2;
export const customerImage = (id: CustomerId) =>
  `/assets/ui/customers/${id}-v1.${id === "clara" ? "svg" : "webp"}`;
export const orderReady = (
  order: DeliveryOrder,
  inventory: Record<Item, number>,
) => order.products.every((p) => inventory[p.item] >= p.amount);
