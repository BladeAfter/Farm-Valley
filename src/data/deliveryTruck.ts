import type { OrderBoard } from "../types/orders";
export function deliveryTruckState(trip: OrderBoard["truck"], now: number) {
  if (!trip || now >= trip.returnsAt)
    return { phase: "idle" as const, progress: 0, visible: true };
  const elapsed = Math.max(0, now - trip.departedAt),
    remaining = trip.returnsAt - now;
  if (elapsed < 1500)
    return { phase: "loading" as const, progress: 0, visible: true };
  if (elapsed < 6500)
    return {
      phase: "departing" as const,
      progress: (elapsed - 1500) / 5000,
      visible: true,
    };
  if (remaining <= 6000)
    return {
      phase: "returning" as const,
      progress: remaining / 6000,
      visible: true,
    };
  return { phase: "away" as const, progress: 1, visible: false };
}
