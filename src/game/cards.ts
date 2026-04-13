import type { Card, Rank, Suit } from "@/game/types";

export const RANKS: Rank[] = ["3", "2", "A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4"];
export const SUITS: Suit[] = ["S", "H", "C", "D"];

export const rankStrength: Record<Rank, number> = {
  "4": 1,
  "5": 2,
  "6": 3,
  "7": 4,
  "8": 5,
  "9": 6,
  "10": 7,
  J: 8,
  Q: 9,
  K: 10,
  A: 11,
  "2": 12,
  "3": 13,
};

export const suitStrength: Record<Suit, number> = {
  D: 1,
  C: 2,
  H: 3,
  S: 4,
};

export const rankLowToHigh: Rank[] = ["4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2", "3"];

export function compareCards(a: Card, b: Card) {
  const ra = rankStrength[a.rank];
  const rb = rankStrength[b.rank];
  if (ra !== rb) return ra - rb;
  return suitStrength[a.suit] - suitStrength[b.suit];
}

export function sortCards(cards: Card[]) {
  return [...cards].sort(compareCards);
}

export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${rank}${suit}`, suit, rank });
    }
  }
  return deck;
}

export function shuffleInPlace<T>(arr: T[], rng: () => number = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function cardToLabel(card: Card) {
  const suit = card.suit === "S" ? "♠" : card.suit === "H" ? "♥" : card.suit === "C" ? "♣" : "♦";
  return `${suit}${card.rank}`;
}

