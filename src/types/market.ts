import type { Item } from "./game";
export type MarketListing = {
  id: string;
  seller: string;
  item: Item;
  amount: number;
  price: number;
  status: "active" | "sold" | "cancelled";
  createdAt: number;
};
export type PublicListing = Omit<MarketListing, "seller"> & { mine: boolean };
export type MarketAction =
  | { type: "list"; id: string; item: Item; amount: number; price: number }
  | { type: "buy" | "cancel"; id: string };
