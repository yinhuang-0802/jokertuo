import { describe, expect, it } from "vitest";
import type { Card, GameState } from "@/game/types";
import { canPlay, passTurn, playCards } from "@/game/state";

function c(id: string): Card {
  const rank = id.slice(0, -1) as Card["rank"];
  const suit = id.slice(-1) as Card["suit"];
  return { id, rank, suit };
}

function makeState(): GameState {
  return {
    settings: { mode: "solo", difficulty: "normal" },
    phase: "playing",
    players: [
      { id: "p1", name: "玩家1", isHuman: true, hand: [c("4D"), c("6D"), c("7D")], revealed: { spadeA: false, spade3: false } },
      { id: "p2", name: "AI2", isHuman: false, hand: [c("5D")], revealed: { spadeA: false, spade3: false } },
      { id: "p3", name: "AI3", isHuman: false, hand: [c("8D")], revealed: { spadeA: false, spade3: false } },
      { id: "p4", name: "AI4", isHuman: false, hand: [c("9D")], revealed: { spadeA: false, spade3: false } },
    ],
    turnIndex: 0,
    leaderIndex: 0,
    trick: null,
    passCount: 0,
    finishedOrder: [],
    firstMoveDone: false,
    revealedSpades: { A: false, "3": false },
  };
}

describe("A3 state", () => {
  it("首手必须包含♦4", () => {
    const s = makeState();
    const res1 = canPlay(s, 0, [c("6D")]);
    expect(res1.ok).toBe(false);
    const res2 = canPlay(s, 0, [c("4D")]);
    expect(res2.ok).toBe(true);
  });

  it("跟牌必须同型且能压过", () => {
    const s = makeState();
    playCards(s, 0, [c("4D")]);
    s.trick = { byPlayerId: "p2", combo: { type: "single", cards: [c("5D")], maxCard: c("5D") } };
    s.turnIndex = 0;
    s.firstMoveDone = true;
    const bad = canPlay(s, 0, [c("4D")]);
    expect(bad.ok).toBe(false);
    const ok = canPlay(s, 0, [c("6D")]);
    expect(ok.ok).toBe(true);
  });

  it("三家pass后接风清空上一手", () => {
    const s = makeState();
    s.firstMoveDone = true;
    s.trick = { byPlayerId: "p1", combo: { type: "single", cards: [c("6D")], maxCard: c("6D") } };
    s.leaderIndex = 0;
    s.turnIndex = 1;
    passTurn(s, 1);
    passTurn(s, 2);
    const res = passTurn(s, 3);
    expect(res.ok).toBe(true);
    expect(res.reset).toBe(true);
    expect(s.trick).toBe(null);
    expect(s.turnIndex).toBe(0);
  });
});

