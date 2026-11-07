import type { Animal, AnimalKind } from "../types/game";
export const feedingVisuals: Record<AnimalKind, { duration: number; approach: number; mouth: number }> = {
  cow: { duration: 15000, approach: 2500, mouth: 25 },
  goat: { duration: 12500, approach: 2500, mouth: 19 },
  chicken: { duration: 9500, approach: 2000, mouth: 12 },
  pig: { duration: 14000, approach: 2500, mouth: 18 },
  sheep: { duration: 13500, approach: 2500, mouth: 19 },
};
export function feedingStage(animal: Pick<Animal,"kind" | "fedAt">, now: number) {
  if (animal.fedAt === null) return 0;
  const config = feedingVisuals[animal.kind], age = now - animal.fedAt;
  if (age < 0 || age >= config.duration) return 0;
  return Math.max(1, Math.ceil(5 * (1 - Math.max(0, age - config.approach) / (config.duration - config.approach))));
}
