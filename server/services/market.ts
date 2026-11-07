import { z } from "zod";
import {
  items,
  cropIds,
  barnUsed,
  siloUsed,
  storageCapacity,
  type Farm,
  type Item,
} from "../../src/types/game.js";
import type {
  MarketListing,
  PublicListing,
  MarketAction,
} from "../../src/types/market.js";
export const marketSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("list"),
      id: z.uuid(),
      item: z.enum(Object.keys(items) as [Item, ...Item[]]),
      amount: z.number().int().min(1).max(100),
      price: z.number().int().min(1).max(1000000),
    })
    .strict(),
  z.object({ type: z.literal("buy"), id: z.uuid() }).strict(),
  z.object({ type: z.literal("cancel"), id: z.uuid() }).strict(),
]);
function room(farm: Farm, item: Item, amount: number) {
  const silo = (cropIds as readonly string[]).includes(item);
  if (
    (silo ? siloUsed(farm) : barnUsed(farm)) + amount >
    storageCapacity(farm, silo ? "silo" : "barn")
  )
    throw new Error(silo ? "Silo cheio" : "Celeiro cheio");
}
/** Mutates only transaction-owned clones. Stock is escrowed at listing creation. */
export function trade(
  farms: Record<string, Farm>,
  listings: MarketListing[],
  actor: string,
  action: MarketAction,
  now = Date.now(),
) {
  const farm = farms[actor];
  if (!farm) throw new Error("Sessão expirada");
  const listing = listings.find((l) => l.id === action.id);
  if (action.type === "list") {
    if (listing) throw new Error("Operação inválida");
    if (
      listings.filter((l) => l.seller === actor && l.status === "active")
        .length >= 10
    )
      throw new Error("Limite de anúncios atingido");
    if (
      action.price >
      Math.max(1, items[action.item].sellPrice ?? 1) * action.amount * 10
    )
      throw new Error("Preço acima do limite");
    if (farm.inventory[action.item] < action.amount)
      throw new Error("Estoque insuficiente");
    farm.inventory[action.item] -= action.amount;
    listings.push({
      id: action.id,
      seller: actor,
      item: action.item,
      amount: action.amount,
      price: action.price,
      status: "active",
      createdAt: now,
    });
  } else {
    if (!listing || listing.status !== "active")
      throw new Error("Anúncio indisponível");
    if (action.type === "cancel") {
      if (listing.seller !== actor) throw new Error("Operação inválida");
      room(farm, listing.item, listing.amount);
      farm.inventory[listing.item] += listing.amount;
      listing.status = "cancelled";
    } else {
      if (listing.seller === actor) throw new Error("Operação inválida");
      const seller = farms[listing.seller];
      if (!seller) throw new Error("Anúncio indisponível");
      if (farm.coins < listing.price) throw new Error("Moedas insuficientes");
      room(farm, listing.item, listing.amount);
      farm.coins -= listing.price;
      seller.coins += listing.price;
      farm.inventory[listing.item] += listing.amount;
      seller.revision++;
      listing.status = "sold";
    }
  }
  farm.revision++;
}
export const publicListings = (
  listings: MarketListing[],
  actor: string,
): PublicListing[] =>
  listings
    .filter((l) => l.status === "active")
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ seller, ...listing }) => ({ ...listing, mine: seller === actor }));
