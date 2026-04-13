import { makeDeck, shuffleInPlace, sortCards } from "@/game/cards";
import { detectCombo, compareCombos } from "@/game/combos";
import type { Card, GameResult, GameSettings, GameState, Player, Trick } from "@/game/types";

const DIAMOND_4_ID = "4D";
const SPADE_A_ID = "AS";
const SPADE_3_ID = "3S";

function nextActiveIndex(players: Player[], fromIndex: number) {
  const n = players.length;
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n;
    if (!players[idx]!.finishedRank) return idx;
  }
  return fromIndex;
}

function activeCount(players: Player[]) {
  return players.filter((p) => !p.finishedRank).length;
}

function removeCardsFromHand(hand: Card[], cards: Card[]) {
  const ids = new Set(cards.map((c) => c.id));
  return hand.filter((c) => !ids.has(c.id));
}

function assignFinishIfNeeded(state: GameState, playerIndex: number) {
  const p = state.players[playerIndex]!;
  if (p.finishedRank) return;
  if (p.hand.length > 0) return;
  const rank = state.finishedOrder.length + 1;
  p.finishedRank = rank;
  state.finishedOrder.push(p.id);
  if (state.finishedOrder.length === state.players.length) {
    state.phase = "finished";
  }
}

export function createNewGame(settings: GameSettings, rng: () => number = Math.random): GameState {
  const deck = makeDeck();
  shuffleInPlace(deck, rng);

  const humanCount = settings.mode === "solo" ? 1 : 2;
  const players: Player[] = Array.from({ length: 4 }).map((_, i) => {
    const isHuman = i < humanCount;
    return {
      id: `p${i + 1}`,
      name: isHuman ? `玩家${i + 1}` : `AI${i + 1}`,
      isHuman,
      hand: [],
      revealed: { spadeA: false, spade3: false },
    };
  });

  for (let i = 0; i < 4; i++) {
    players[i]!.hand = sortCards(deck.slice(i * 13, (i + 1) * 13));
  }

  const starterIndex = players.findIndex((p) => p.hand.some((c) => c.id === DIAMOND_4_ID));
  const start = starterIndex >= 0 ? starterIndex : 0;

  return {
    settings,
    phase: "playing",
    players,
    turnIndex: start,
    leaderIndex: start,
    trick: null,
    passCount: 0,
    finishedOrder: [],
    firstMoveDone: false,
    revealedSpades: { A: false, "3": false },
  };
}

export function canPlay(state: GameState, playerIndex: number, selected: Card[]) {
  if (state.phase !== "playing") return { ok: false as const, reason: "对局已结束" };
  if (playerIndex !== state.turnIndex) return { ok: false as const, reason: "未轮到你" };
  const player = state.players[playerIndex]!;
  if (player.finishedRank) return { ok: false as const, reason: "玩家已出完" };

  const combo = detectCombo(selected);
  if (!combo) return { ok: false as const, reason: "不合法牌型" };

  if (!state.firstMoveDone) {
    const hasDiamond4 = selected.some((c) => c.id === DIAMOND_4_ID);
    if (!hasDiamond4) return { ok: false as const, reason: "第一手必须包含♦4" };
  }

  if (!state.trick) return { ok: true as const, combo };
  if (combo.type !== state.trick.combo.type) {
    return { ok: false as const, reason: "必须出相同牌型" };
  }
  const cmp = compareCombos(state.trick.combo, combo);
  if (!(cmp < 0)) return { ok: false as const, reason: "无法压过上一手" };
  return { ok: true as const, combo };
}

export function playCards(state: GameState, playerIndex: number, selected: Card[]) {
  const check = canPlay(state, playerIndex, selected);
  if (!check.ok) return { ok: false as const, reason: check.reason };

  const player = state.players[playerIndex]!;
  player.hand = removeCardsFromHand(player.hand, selected);
  state.trick = { byPlayerId: player.id, combo: check.combo };
  state.leaderIndex = playerIndex;
  state.passCount = 0;
  state.firstMoveDone = true;

  if (selected.some((c) => c.id === SPADE_A_ID)) {
    player.revealed.spadeA = true;
    state.revealedSpades.A = true;
  }
  if (selected.some((c) => c.id === SPADE_3_ID)) {
    player.revealed.spade3 = true;
    state.revealedSpades["3"] = true;
  }

  assignFinishIfNeeded(state, playerIndex);

  if (state.phase !== "finished") {
    state.turnIndex = nextActiveIndex(state.players, playerIndex);
  }

  return { ok: true as const };
}

export function passTurn(state: GameState, playerIndex: number) {
  if (state.phase !== "playing") return { ok: false as const, reason: "对局已结束" };
  if (playerIndex !== state.turnIndex) return { ok: false as const, reason: "未轮到你" };
  if (!state.trick) return { ok: false as const, reason: "当前可自由出牌，不能pass" };

  state.passCount += 1;
  const remaining = activeCount(state.players);
  const needed = Math.max(0, remaining - 1);

  if (state.passCount >= needed) {
    state.trick = null;
    state.passCount = 0;
    const leader = state.leaderIndex;
    const next = state.players[leader]!.finishedRank ? nextActiveIndex(state.players, leader) : leader;
    state.turnIndex = next;
    return { ok: true as const, reset: true as const };
  }

  state.turnIndex = nextActiveIndex(state.players, playerIndex);
  return { ok: true as const, reset: false as const };
}

export function computeResult(state: GameState): GameResult {
  const players = state.players;

  const aHolder = players.find((p) => p.hand.some((c) => c.id === SPADE_A_ID) || p.revealed.spadeA);
  const threeHolder = players.find((p) => p.hand.some((c) => c.id === SPADE_3_ID) || p.revealed.spade3);
  const aId = aHolder?.id ?? "";
  const threeId = threeHolder?.id ?? "";
  if (aId && threeId && aId === threeId) {
    const solo = players.find((p) => p.id === aId)!;
    const soloRank = solo.finishedRank ?? 4;
    return {
      type: "solo",
      soloId: solo.id,
      soloRank,
      soloOutcome: soloRank === 1 ? "win" : "lose",
    };
  }

  const teamAIds: [string, string] = [aId, threeId];
  const teamBIds = players
    .map((p) => p.id)
    .filter((id) => id !== aId && id !== threeId) as [string, string];

  const rankOf = (id: string) => players.find((p) => p.id === id)?.finishedRank ?? 4;
  const teamAScore = rankOf(teamAIds[0]) + rankOf(teamAIds[1]);
  const teamBScore = rankOf(teamBIds[0]) + rankOf(teamBIds[1]);
  const winner = teamAScore === teamBScore ? "draw" : teamAScore < teamBScore ? "teamA" : "teamB";

  return {
    type: "2v2",
    teamASpades: { aHolderId: aId, threeHolderId: threeId },
    teamAIds,
    teamBIds,
    teamAScore,
    teamBScore,
    winner,
  };
}

export function trickSummary(trick: Trick | null) {
  if (!trick) return null;
  return {
    byPlayerId: trick.byPlayerId,
    type: trick.combo.type,
    maxCardId: trick.combo.maxCard.id,
    cardIds: trick.combo.cards.map((c) => c.id),
  };
}

