import { compareCards, rankStrength, sortCards } from "@/game/cards";
import { compareCombos, detectCombo } from "@/game/combos";
import type { AiDifficulty, Card, Combo, ComboType, GameState } from "@/game/types";

type AiAction =
  | { type: "play"; cards: Card[]; combo: Combo }
  | { type: "pass" }
  | { type: "none" };

function combinationsOfFive<T>(arr: T[]) {
  const res: T[][] = [];
  const n = arr.length;
  for (let a = 0; a < n - 4; a++) {
    for (let b = a + 1; b < n - 3; b++) {
      for (let c = b + 1; c < n - 2; c++) {
        for (let d = c + 1; d < n - 1; d++) {
          for (let e = d + 1; e < n; e++) {
            res.push([arr[a]!, arr[b]!, arr[c]!, arr[d]!, arr[e]!]);
          }
        }
      }
    }
  }
  return res;
}

function listSingles(hand: Card[]) {
  return hand.map((c) => [c]);
}

function listPairs(hand: Card[]) {
  const byRank = new Map<string, Card[]>();
  for (const c of hand) {
    const key = c.rank;
    byRank.set(key, [...(byRank.get(key) ?? []), c]);
  }
  const pairs: Card[][] = [];
  for (const cards of byRank.values()) {
    if (cards.length < 2) continue;
    for (let i = 0; i < cards.length - 1; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        pairs.push(sortCards([cards[i]!, cards[j]!]).slice());
      }
    }
  }
  return pairs;
}

function listFives(hand: Card[]) {
  const res: Card[][] = [];
  const combos = combinationsOfFive(hand);
  for (const cards of combos) {
    if (detectCombo(cards)) res.push(sortCards(cards));
  }
  return res;
}

function listAllCombos(hand: Card[]) {
  const all: { cards: Card[]; combo: Combo }[] = [];
  for (const cards of listSingles(hand)) {
    const combo = detectCombo(cards);
    if (combo) all.push({ cards, combo });
  }
  for (const cards of listPairs(hand)) {
    const combo = detectCombo(cards);
    if (combo) all.push({ cards, combo });
  }
  for (const cards of listFives(hand)) {
    const combo = detectCombo(cards);
    if (combo) all.push({ cards, combo });
  }
  return all;
}

function legalMoves(state: GameState, playerIndex: number) {
  const hand = state.players[playerIndex]!.hand;
  const all = listAllCombos(hand);
  if (!state.trick) {
    if (!state.firstMoveDone) {
      return all.filter((m) => m.cards.some((c) => c.id === "4D"));
    }
    return all;
  }
  const type: ComboType = state.trick.combo.type;
  const beating = all
    .filter((m) => m.combo.type === type)
    .filter((m) => compareCombos(state.trick!.combo, m.combo) < 0);
  return beating;
}

export function uiLegalMovesByType(state: GameState, playerIndex: number, limitPerType: number = 3) {
  const moves = legalMoves(state, playerIndex);
  const byType = new Map<ComboType, { cards: Card[]; combo: Combo }[]>();
  for (const m of moves) {
    byType.set(m.combo.type, [...(byType.get(m.combo.type) ?? []), m]);
  }
  const order: ComboType[] = ["single", "pair", "straight", "flush", "full_house", "four_kind", "straight_flush"];
  return order.map((type) => {
    const list = (byType.get(type) ?? []).slice().sort((a, b) => compareCombos(a.combo, b.combo));
    return { type, moves: list.slice(0, limitPerType).map((m) => m.cards) };
  });
}

function sumStrength(cards: Card[]) {
  let s = 0;
  for (const c of cards) s += rankStrength[c.rank];
  return s;
}

function keyPenalty(cards: Card[]) {
  let p = 0;
  for (const c of cards) {
    if (c.id === "AS" || c.id === "3S") p += 40;
    if (c.rank === "3" || c.rank === "2" || c.rank === "A") p += 4;
  }
  return p;
}

function moveScore(hand: Card[], move: { cards: Card[]; combo: Combo }, difficulty: AiDifficulty) {
  const remainingCount = hand.length - move.cards.length;
  const remainingStrength = sumStrength(hand) - sumStrength(move.cards);
  const base = remainingCount * 1000 + remainingStrength;
  const key = keyPenalty(move.cards);
  const sizeBias = move.cards.length === 5 ? (difficulty === "hard" ? -20 : 30) : 0;
  return base + key + sizeBias;
}

function pickMinMaxCard(moves: { cards: Card[]; combo: Combo }[]) {
  return [...moves].sort((a, b) => compareCards(a.combo.maxCard, b.combo.maxCard))[0]!;
}

export function aiThinkDelayMs(difficulty: AiDifficulty, rng: () => number = Math.random) {
  const r = rng();
  if (difficulty === "easy") return 1200 + Math.floor(r * 1400);
  if (difficulty === "normal") return 900 + Math.floor(r * 1100);
  return 700 + Math.floor(r * 900);
}

export function chooseAiAction(
  state: GameState,
  playerIndex: number,
  rng: () => number = Math.random,
  opts?: { allowHuman?: boolean },
): AiAction {
  if (state.phase !== "playing") return { type: "none" };
  const player = state.players[playerIndex]!;
  if (player.isHuman && !opts?.allowHuman) return { type: "none" };
  if (player.finishedRank) return { type: "none" };
  if (playerIndex !== state.turnIndex) return { type: "none" };

  const moves = legalMoves(state, playerIndex);
  if (moves.length === 0) {
    return state.trick ? { type: "pass" } : { type: "none" };
  }

  const difficulty = state.settings.difficulty;
  if (difficulty === "easy") {
    if (state.trick && rng() < 0.35) return { type: "pass" };
    const sorted = [...moves].sort((a, b) => compareCards(a.combo.maxCard, b.combo.maxCard));
    const pickFrom = sorted.slice(0, Math.min(3, sorted.length));
    const m = pickFrom[Math.floor(rng() * pickFrom.length)]!;
    return { type: "play", cards: m.cards, combo: m.combo };
  }

  if (difficulty === "normal") {
    if (state.trick) {
      const m = pickMinMaxCard(moves);
      return { type: "play", cards: m.cards, combo: m.combo };
    }
    const scored = moves
      .map((m) => ({ m, s: moveScore(player.hand, m, difficulty) }))
      .sort((a, b) => a.s - b.s);
    const top = scored.slice(0, Math.min(2, scored.length));
    const pick = top[Math.floor(rng() * top.length)]!.m;
    return { type: "play", cards: pick.cards, combo: pick.combo };
  }

  const scored = moves
    .map((m) => ({ m, s: moveScore(player.hand, m, difficulty) }))
    .sort((a, b) => a.s - b.s);
  const best = scored[0]!.m;
  return { type: "play", cards: best.cards, combo: best.combo };
}

export function suggestMove(state: GameState, playerIndex: number) {
  const action = chooseAiAction(state, playerIndex, Math.random, { allowHuman: true });
  if (action.type !== "play") return null;
  return action;
}
