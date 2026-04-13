import { compareCards, rankLowToHigh, sortCards } from "@/game/cards";
import type { Card, Combo, ComboType, Rank } from "@/game/types";

function maxCardOf(cards: Card[]) {
  return sortCards(cards).at(-1)!;
}

function countByRank(cards: Card[]) {
  const map = new Map<Rank, number>();
  for (const c of cards) map.set(c.rank, (map.get(c.rank) ?? 0) + 1);
  return map;
}

function isFlush(cards: Card[]) {
  return cards.every((c) => c.suit === cards[0]!.suit);
}

function isStraightByRank(cards: Card[]) {
  const unique = new Set(cards.map((c) => c.rank));
  if (unique.size !== 5) return false;

  const target = new Set(cards.map((c) => rankLowToHigh.indexOf(c.rank)));
  if ([...target].some((i) => i < 0)) return false;

  for (let start = 0; start < rankLowToHigh.length; start++) {
    const seq = new Set<number>();
    for (let k = 0; k < 5; k++) seq.add((start + k) % rankLowToHigh.length);
    let ok = true;
    for (const i of target) {
      if (!seq.has(i)) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

function fiveCardType(cards: Card[]): ComboType | null {
  const flush = isFlush(cards);
  const straight = isStraightByRank(cards);
  const counts = [...countByRank(cards).values()].sort((a, b) => b - a);

  if (straight && flush) return "straight_flush";
  if (counts[0] === 4) return "four_kind";
  if (counts[0] === 3 && counts[1] === 2) return "full_house";
  if (flush) return "flush";
  if (straight) return "straight";
  return null;
}

export function detectCombo(cards: Card[]): Combo | null {
  if (cards.length === 1) {
    return { type: "single", cards: sortCards(cards), maxCard: cards[0]! };
  }
  if (cards.length === 2) {
    if (cards[0]!.rank !== cards[1]!.rank) return null;
    const sorted = sortCards(cards);
    return { type: "pair", cards: sorted, maxCard: sorted[1]! };
  }
  if (cards.length === 5) {
    const type = fiveCardType(cards);
    if (!type) return null;
    const sorted = sortCards(cards);
    return { type, cards: sorted, maxCard: maxCardOf(sorted) };
  }
  return null;
}

export function compareCombos(a: Combo, b: Combo) {
  if (a.type !== b.type) return NaN;
  return compareCards(a.maxCard, b.maxCard);
}

export function comboLabel(type: ComboType) {
  switch (type) {
    case "single":
      return "单张";
    case "pair":
      return "对子";
    case "straight_flush":
      return "同花顺";
    case "four_kind":
      return "四条";
    case "full_house":
      return "葫芦";
    case "flush":
      return "同花";
    case "straight":
      return "顺子";
  }
}

