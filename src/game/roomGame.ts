import { makeDeck, shuffleInPlace, sortCards } from "@/game/cards";
import type { GameSettings, GameState, Player } from "@/game/types";

const DIAMOND_4_ID = "4D";

export function createRoomGame(params: {
  players: Array<{ id: string; name: string; isAi: boolean }>;
  difficulty: GameSettings["difficulty"];
  rng: () => number;
}): GameState {
  const deck = makeDeck();
  shuffleInPlace(deck, params.rng);

  const players: Player[] = params.players.map((p) => ({
    id: p.id,
    name: p.name,
    isHuman: !p.isAi,
    hand: [],
    revealed: { spadeA: false, spade3: false },
  }));

  for (let i = 0; i < 4; i++) {
    players[i]!.hand = sortCards(deck.slice(i * 13, (i + 1) * 13));
  }

  const starterIndex = players.findIndex((p) => p.hand.some((c) => c.id === DIAMOND_4_ID));
  const start = starterIndex >= 0 ? starterIndex : 0;

  const settings: GameSettings = {
    mode: "solo",
    difficulty: params.difficulty,
  };

  const lastMoves: Record<string, null> = {};
  for (const p of players) lastMoves[p.id] = null;

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
    lastMoves,
    lastMoveSeq: 0,
  };
}
