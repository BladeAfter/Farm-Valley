import type { AnimalKind } from "../types/game";
export const animalPortrait = (kind: AnimalKind) =>
  ({
    cow: "/assets/animals/cow/portrait-v4.webp",
    chicken: "/assets/animals/chicken/portrait-v3.webp",
    goat: "/assets/animals/goat/portrait-v1.webp",
    sheep: "/assets/animals/sheep/portrait-v1.webp",
    pig: "/assets/animals/pig/portrait-v1.webp",
  })[kind];
