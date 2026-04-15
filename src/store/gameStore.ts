import { create } from "zustand";
import type { Card, GameResult, GameSettings, GameState } from "@/game/types";
import { createNewGame, playCards, passTurn, computeResult, canPlay } from "@/game/state";
import { seatForPlayerIndex, type SeatPos } from "@/game/ui";
import { suggestMove } from "@/game/ai";

type GameUi = {
  humanViewIndex: number;
  lastError: string | null;
};

type ToastTone = "info" | "error" | "success";

type Toast = {
  id: number;
  tone: ToastTone;
  message: string;
};

type PlayAnim = {
  id: number;
  from: SeatPos;
  cardIds: string[];
};

type AnimState = {
  dealId: number;
  play: PlayAnim | null;
};

type GameStoreState = {
  game: GameState | null;
  result: GameResult | null;
  selectedCardIds: string[];
  ui: GameUi;
  toast: Toast | null;
  anim: AnimState;
  startNewGame: (settings: GameSettings) => void;
  setHumanViewIndex: (idx: number) => void;
  toggleCard: (cardId: string) => void;
  setSelectedCardIds: (cardIds: string[]) => void;
  clearSelection: () => void;
  playSelected: () => void;
  pass: () => void;
  hint: () => void;
  applyPlay: (playerIndex: number, cards: Card[]) => { ok: boolean; reason?: string };
  applyPass: (playerIndex: number) => { ok: boolean; reason?: string; reset?: boolean };
  getSelectedCards: () => Card[];
  getCanPlaySelected: () => { ok: boolean; reason?: string };
};

export const useGameStore = create<GameStoreState>((set, get) => ({
  game: null,
  result: null,
  selectedCardIds: [],
  ui: { humanViewIndex: 0, lastError: null },
  toast: null,
  anim: { dealId: 0, play: null },

  startNewGame: (settings) => {
    const game = createNewGame(settings);
    set((s) => ({
      game,
      result: null,
      selectedCardIds: [],
      ui: { humanViewIndex: 0, lastError: null },
      anim: { ...s.anim, dealId: s.anim.dealId + 1, play: null },
      toast: null,
    }));
  },

  setHumanViewIndex: (idx) => {
    set((s) => ({ ui: { ...s.ui, humanViewIndex: idx, lastError: null }, selectedCardIds: [] }));
  },

  toggleCard: (cardId) => {
    const { selectedCardIds } = get();
    const has = selectedCardIds.includes(cardId);
    const next = has ? selectedCardIds.filter((id) => id !== cardId) : [...selectedCardIds, cardId];
    set((s) => ({ selectedCardIds: next, ui: { ...s.ui, lastError: null } }));
  },

  setSelectedCardIds: (cardIds) => set((s) => ({ selectedCardIds: [...cardIds], ui: { ...s.ui, lastError: null } })),

  clearSelection: () => set((s) => ({ selectedCardIds: [], ui: { ...s.ui, lastError: null } })),

  getSelectedCards: () => {
    const { game, selectedCardIds, ui } = get();
    if (!game) return [];
    const player = game.players[ui.humanViewIndex]!;
    const ids = new Set(selectedCardIds);
    return player.hand.filter((c) => ids.has(c.id));
  },

  getCanPlaySelected: () => {
    const { game, ui } = get();
    if (!game) return { ok: false, reason: "未开始" };
    const selected = get().getSelectedCards();
    if (selected.length === 0) return { ok: false, reason: "未选牌" };
    const res = canPlay(game, ui.humanViewIndex, selected);
    return res.ok ? { ok: true } : { ok: false, reason: res.reason };
  },

  applyPlay: (playerIndex, cards) => {
    const { game, ui } = get();
    if (!game) return { ok: false, reason: "未开始" };
    const check = canPlay(game, playerIndex, cards);
    if (!check.ok) {
      set((s) => ({ ui: { ...s.ui, lastError: check.reason }, toast: { id: (s.toast?.id ?? 0) + 1, tone: "error", message: check.reason } }));
      return { ok: false, reason: check.reason };
    }

    playCards(game, playerIndex, cards);

    const base = ui.humanViewIndex;
    const from = seatForPlayerIndex(playerIndex, base);

    set((s) => ({
      game: { ...game },
      selectedCardIds: playerIndex === ui.humanViewIndex ? [] : s.selectedCardIds,
      ui: { ...s.ui, lastError: null },
      anim: { ...s.anim, play: { id: s.anim.play ? s.anim.play.id + 1 : 1, from, cardIds: cards.map((c) => c.id) } },
      toast: null,
      result: game.phase === "finished" ? computeResult(game) : s.result,
    }));

    return { ok: true };
  },

  applyPass: (playerIndex) => {
    const { game } = get();
    if (!game) return { ok: false, reason: "未开始" };
    const res = passTurn(game, playerIndex);
    if (!res.ok) {
      set((s) => ({ ui: { ...s.ui, lastError: res.reason }, toast: { id: (s.toast?.id ?? 0) + 1, tone: "error", message: res.reason } }));
      return { ok: false, reason: res.reason };
    }
    set((s) => ({
      game: { ...game },
      selectedCardIds: playerIndex === s.ui.humanViewIndex ? [] : s.selectedCardIds,
      ui: { ...s.ui, lastError: null },
      toast: null,
    }));
    return { ok: true, reset: res.reset };
  },

  playSelected: () => {
    const { game, ui } = get();
    if (!game) return;
    const selected = get().getSelectedCards();
    if (selected.length === 0) {
      set((s) => ({ ui: { ...s.ui, lastError: "未选牌" }, toast: { id: (s.toast?.id ?? 0) + 1, tone: "error", message: "未选牌" } }));
      return;
    }
    get().applyPlay(ui.humanViewIndex, selected);
  },

  pass: () => {
    const { game, ui } = get();
    if (!game) return;
    get().applyPass(ui.humanViewIndex);
  },

  hint: () => {
    const { game, ui } = get();
    if (!game) return;
    const action = suggestMove(game, ui.humanViewIndex);
    if (!action) {
      set((s) => ({ toast: { id: (s.toast?.id ?? 0) + 1, tone: "error", message: "暂无可提示的走法" } }));
      return;
    }
    set((s) => ({ selectedCardIds: action.cards.map((c) => c.id), ui: { ...s.ui, lastError: null } }));
  },
}));
