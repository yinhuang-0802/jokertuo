import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { aiThinkDelayMs, chooseAiAction } from "@/game/ai";
import { useGameStore } from "@/store/gameStore";
import ToastBar from "@/components/game/ToastBar";
import Seat from "@/components/game/Seat";
import HandArea from "@/components/game/HandArea";
import ActionDock from "@/components/game/ActionDock";
import { useTurnCountdown } from "@/hooks/useTurnCountdown";
import { playerIndexForSeat } from "@/game/ui";
import PlayAnimLayer from "@/components/game/PlayAnimLayer";
import TopStatusBar from "@/components/game/TopStatusBar";
import SeatMoveBubble from "@/components/game/SeatMoveBubble";
import type { Card } from "@/game/types";
import { supabase } from "@/lib/supabase";
import { getOrCreatePlayerId } from "@/lib/playerIdentity";
import { getRoomById, listRoomPlayers, type RoomRow } from "@/lib/rooms";
import { computeResult } from "@/game/state";
import type { GameState } from "@/game/types";

type LobbyMode = "solo" | "duo";
type AiDifficulty = "easy" | "normal" | "hard";

type LobbyState = {
  mode: LobbyMode;
  difficulty: AiDifficulty;
};

export default function Game() {
  const nav = useNavigate();
  const location = useLocation();
  const { roomId } = useParams();
  const state = (location.state ?? { mode: "solo", difficulty: "normal" }) as LobbyState;

  const game = useGameStore((s) => s.game);
  const selectedCardIds = useGameStore((s) => s.selectedCardIds);
  const ui = useGameStore((s) => s.ui);
  const toast = useGameStore((s) => s.toast);
  const anim = useGameStore((s) => s.anim);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const setHumanViewIndex = useGameStore((s) => s.setHumanViewIndex);
  const toggleCard = useGameStore((s) => s.toggleCard);
  const clearSelection = useGameStore((s) => s.clearSelection);
  const setSelectedCardIds = useGameStore((s) => s.setSelectedCardIds);
  const applyPlay = useGameStore((s) => s.applyPlay);
  const applyPass = useGameStore((s) => s.applyPass);
  const hint = useGameStore((s) => s.hint);

  const aiTimer = useRef<number | null>(null);
  const roomRef = useRef<{ roomId: string; playerId: string; seatIndex: number; isHost: boolean; version: number } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => useGameStore.setState({ toast: null }), 1500);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (roomId) return;
    if (!game || game.settings.mode !== state.mode || game.settings.difficulty !== state.difficulty) {
      startNewGame({ mode: state.mode, difficulty: state.difficulty });
    }
  }, [game, roomId, startNewGame, state.difficulty, state.mode]);

  useEffect(() => {
    if (!game) return;
    if (game.phase === "finished") {
      nav(roomId ? `/result/${roomId}` : "/result");
    }
  }, [game, nav, roomId]);

  useEffect(() => {
    if (!roomId) {
      roomRef.current = null;
      return;
    }

    const playerId = getOrCreatePlayerId();

    let alive = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let poll: number | null = null;

    (async () => {
      const roomRes = await getRoomById(roomId);
      if (!alive) return;
      if (roomRes.error) {
        useGameStore.setState({ toast: { id: (useGameStore.getState().toast?.id ?? 0) + 1, tone: "error", message: roomRes.error.message } });
        return;
      }
      const room = roomRes.data;
      const playersRes = await listRoomPlayers(roomId);
      if (!alive) return;
      if (playersRes.error) {
        useGameStore.setState({ toast: { id: (useGameStore.getState().toast?.id ?? 0) + 1, tone: "error", message: playersRes.error.message } });
        return;
      }
      const me = playersRes.data.find((p) => p.player_id === playerId);
      if (!me) {
        useGameStore.setState({ toast: { id: (useGameStore.getState().toast?.id ?? 0) + 1, tone: "error", message: "你不在该房间成员列表中" } });
        nav(`/room/${roomId}`);
        return;
      }

      const isHost = room.owner_player_id === playerId;
      roomRef.current = { roomId, playerId, seatIndex: me.seat_index, isHost, version: room.game_version ?? 0 };
      setHumanViewIndex(me.seat_index);

      if (!room.game_state) {
        useGameStore.setState({ game: null, result: null, selectedCardIds: [], toast: { id: (useGameStore.getState().toast?.id ?? 0) + 1, tone: "info", message: "等待房主开始对局…" } });
      } else {
        const nextGame = room.game_state as unknown as GameState;
        useGameStore.setState({ game: nextGame, result: nextGame.phase === "finished" ? computeResult(nextGame) : null });
      }

      channel = supabase
        .channel(`game-${roomId}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, (payload) => {
          const next = payload.new as RoomRow;
          const ref = roomRef.current;
          if (!ref) return;
          if (typeof next.game_version === "number" && next.game_version <= ref.version) return;
          ref.version = next.game_version ?? ref.version;
          if (next.status === "in_game" && next.game_state) {
            const g = next.game_state as unknown as GameState;
            useGameStore.setState({ game: g, result: g.phase === "finished" ? computeResult(g) : null });
          }
        })
        .subscribe();

      poll = window.setInterval(async () => {
        const ref = roomRef.current;
        if (!ref) return;
        const fresh = await getRoomById(ref.roomId);
        if (fresh.error || !fresh.data) return;
        if (fresh.data.game_version <= ref.version) return;
        ref.version = fresh.data.game_version;
        if (fresh.data.status === "in_game" && fresh.data.game_state) {
          const g = fresh.data.game_state as unknown as GameState;
          useGameStore.setState({ game: g, result: g.phase === "finished" ? computeResult(g) : null });
        }
      }, 1500);
    })();

    return () => {
      alive = false;
      if (poll) window.clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
  }, [nav, roomId, setHumanViewIndex]);

  useEffect(() => {
    if (!game) return;
    if (aiTimer.current) {
      window.clearTimeout(aiTimer.current);
      aiTimer.current = null;
    }
    const current = game.players[game.turnIndex]!;
    if (game.phase !== "playing") return;
    if (current.isHuman) return;

    const roomCtx = roomRef.current;
    if (roomId && roomCtx && !roomCtx.isHost) return;

    const delay = aiThinkDelayMs(game.settings.difficulty);
    aiTimer.current = window.setTimeout(() => {
      const action = chooseAiAction(game, game.turnIndex);
      if (action.type === "play") {
        const res = applyPlay(game.turnIndex, action.cards);
        if (roomId && res.ok) {
          void (async () => {
            const ref = roomRef.current;
            const currentGame = useGameStore.getState().game;
            if (!ref || !currentGame) return;
            const update = await supabase
              .from("rooms")
              .update({ game_state: currentGame as unknown, game_version: ref.version + 1, updated_at: new Date().toISOString() })
              .eq("id", ref.roomId)
              .eq("game_version", ref.version)
              .select("game_version")
              .maybeSingle();
            if (update.error || !update.data) {
              useGameStore.setState({ toast: { id: (useGameStore.getState().toast?.id ?? 0) + 1, tone: "error", message: "同步失败，正在重试" } });
              const fresh = await getRoomById(ref.roomId);
              if (fresh.data?.game_state) {
                ref.version = fresh.data.game_version;
                const g = fresh.data.game_state as unknown as GameState;
                useGameStore.setState({ game: g, result: g.phase === "finished" ? computeResult(g) : null });
              }
              return;
            }
            ref.version = update.data.game_version;
          })();
        }
        return;
      }
      if (action.type === "pass") {
        const res = applyPass(game.turnIndex);
        if (roomId && res.ok) {
          void (async () => {
            const ref = roomRef.current;
            const currentGame = useGameStore.getState().game;
            if (!ref || !currentGame) return;
            const update = await supabase
              .from("rooms")
              .update({ game_state: currentGame as unknown, game_version: ref.version + 1, updated_at: new Date().toISOString() })
              .eq("id", ref.roomId)
              .eq("game_version", ref.version)
              .select("game_version")
              .maybeSingle();
            if (update.error || !update.data) {
              useGameStore.setState({ toast: { id: (useGameStore.getState().toast?.id ?? 0) + 1, tone: "error", message: "同步失败，正在重试" } });
              const fresh = await getRoomById(ref.roomId);
              if (fresh.data?.game_state) {
                ref.version = fresh.data.game_version;
                const g = fresh.data.game_state as unknown as GameState;
                useGameStore.setState({ game: g, result: g.phase === "finished" ? computeResult(g) : null });
              }
              return;
            }
            ref.version = update.data.game_version;
          })();
        }
      }
    }, delay);
    return () => {
      if (aiTimer.current) {
        window.clearTimeout(aiTimer.current);
        aiTimer.current = null;
      }
    };
  }, [applyPass, applyPlay, game, roomId]);

  const viewedPlayer = game ? game.players[ui.humanViewIndex] : null;

  const duoNeedSwitch = useMemo(() => {
    if (!game) return false;
    if (game.settings.mode !== "duo") return false;
    const current = game.players[game.turnIndex]!;
    if (!current.isHuman) return false;
    return game.turnIndex !== ui.humanViewIndex;
  }, [game, ui.humanViewIndex]);

  const seatIndices = useMemo(() => {
    const base = ui.humanViewIndex;
    return {
      bottom: base,
      left: playerIndexForSeat("left", base),
      top: playerIndexForSeat("top", base),
      right: playerIndexForSeat("right", base),
    };
  }, [ui.humanViewIndex]);

  const turnKey = useMemo(() => {
    if (!game) return "none";
    return `${game.turnIndex}-${game.passCount}-${game.trick?.combo.maxCard.id ?? "free"}-${game.finishedOrder.length}`;
  }, [game]);

  const countdown = useTurnCountdown({ turnKey, active: !!game && game.phase === "playing", durationMs: 15000 });

  const isViewedTurn = !!game && game.turnIndex === ui.humanViewIndex;
  const canPass = !!game && !!game.trick && isViewedTurn && !duoNeedSwitch;
  const canPlay = useMemo(() => {
    if (!game || !viewedPlayer) return { ok: false as const, reason: "未开始" };
    if (!viewedPlayer.isHuman) return { ok: false as const, reason: "当前视角不是真人" };
    if (!isViewedTurn) return { ok: false as const, reason: "未轮到你" };
    if (duoNeedSwitch) return { ok: false as const, reason: "请切换到正确玩家" };
    if (selectedCardIds.length === 0) return { ok: false as const, reason: "未选牌" };
    const res = useGameStore.getState().getCanPlaySelected();
    return res.ok ? { ok: true as const } : { ok: false as const, reason: res.reason ?? "不可出" };
  }, [duoNeedSwitch, game, isViewedTurn, selectedCardIds, viewedPlayer]);

  const autoPlayCards = (hand: Card[], mustDiamond4: boolean) => {
    if (mustDiamond4) {
      const c = hand.find((x) => x.id === "4D");
      return c ? [c] : [];
    }
    return hand.length ? [hand[0]!] : [];
  };

  useEffect(() => {
    if (!game) return;
    if (game.phase !== "playing") return;
    if (countdown.msLeft > 0) return;
    const idx = game.turnIndex;
    const p = game.players[idx]!;
    if (!p.isHuman) return;
    if (roomId && roomRef.current && idx !== roomRef.current.seatIndex) return;
    if (game.trick) {
      const res = applyPass(idx);
      if (roomId && res.ok) {
        void (async () => {
          const ref = roomRef.current;
          const currentGame = useGameStore.getState().game;
          if (!ref || !currentGame) return;
          const update = await supabase
            .from("rooms")
            .update({ game_state: currentGame as unknown, game_version: ref.version + 1, updated_at: new Date().toISOString() })
            .eq("id", ref.roomId)
            .eq("game_version", ref.version)
            .select("game_version")
            .maybeSingle();
          if (update.data?.game_version) ref.version = update.data.game_version;
        })();
      }
      return;
    }
    const cards = autoPlayCards(p.hand, !game.firstMoveDone);
    if (cards.length) {
      const res = applyPlay(idx, cards);
      if (roomId && res.ok) {
        void (async () => {
          const ref = roomRef.current;
          const currentGame = useGameStore.getState().game;
          if (!ref || !currentGame) return;
          const update = await supabase
            .from("rooms")
            .update({ game_state: currentGame as unknown, game_version: ref.version + 1, updated_at: new Date().toISOString() })
            .eq("id", ref.roomId)
            .eq("game_version", ref.version)
            .select("game_version")
            .maybeSingle();
          if (update.data?.game_version) ref.version = update.data.game_version;
        })();
      }
    }
  }, [applyPass, applyPlay, countdown.msLeft, game, roomId]);

  if (!game) {
    return (
      <AppShell>
        <div className="rounded-2xl bg-[#111B2E]/80 p-4 ring-1 ring-white/10">正在创建对局…</div>
      </AppShell>
    );
  }

  const timerFor = (playerIndex: number) => {
    if (game.turnIndex !== playerIndex) return undefined;
    return { msLeft: countdown.msLeft, progress: countdown.progress };
  };

  const disabledReason = !canPlay.ok ? canPlay.reason : undefined;

  const syncRoomGame = async () => {
    const ref = roomRef.current;
    const currentGame = useGameStore.getState().game;
    if (!roomId || !ref || !currentGame) return;
    const update = await supabase
      .from("rooms")
      .update({ game_state: currentGame as unknown, game_version: ref.version + 1, updated_at: new Date().toISOString() })
      .eq("id", ref.roomId)
      .eq("game_version", ref.version)
      .select("game_version")
      .maybeSingle();

    if (update.error || !update.data) {
      useGameStore.setState({ toast: { id: (useGameStore.getState().toast?.id ?? 0) + 1, tone: "error", message: "同步失败，正在重试" } });
      const fresh = await getRoomById(ref.roomId);
      if (fresh.data?.game_state) {
        ref.version = fresh.data.game_version;
        const g = fresh.data.game_state as unknown as GameState;
        useGameStore.setState({ game: g, result: g.phase === "finished" ? computeResult(g) : null });
      }
      return;
    }
    ref.version = update.data.game_version;
  };

  const viewSwitch = game.settings.mode === "duo" ? (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setHumanViewIndex(0)}
        className={
          "rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition " +
          (ui.humanViewIndex === 0
            ? "bg-sky-500 text-white ring-sky-400/60"
            : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10")
        }
      >
        玩家1
      </button>
      <button
        type="button"
        onClick={() => setHumanViewIndex(1)}
        className={
          "rounded-xl px-3 py-2 text-xs font-semibold ring-1 transition " +
          (ui.humanViewIndex === 1
            ? "bg-sky-500 text-white ring-sky-400/60"
            : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10")
        }
      >
        玩家2
      </button>
    </div>
  ) : null;

  return (
    <AppShell>
      <div className="relative">
        <ToastBar toast={toast} />

        <div className="grid gap-2">
          <TopStatusBar game={game} onBack={() => nav("/")} />
          <div className="flex items-center justify-end gap-3">{viewSwitch}</div>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-b from-[#0E1A2F] to-[#07101E] p-2 ring-1 ring-white/10 sm:p-4">
            <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: "radial-gradient(60% 55% at 50% 45%, rgba(255,255,255,0.10), rgba(0,0,0,0) 70%)" }} />
            <PlayAnimLayer playAnim={anim.play} />

            <div className="relative z-0 grid grid-cols-12 gap-4">
              <div className="col-span-3 flex items-center">
                <div className="relative z-20">
                  <Seat
                    player={game.players[seatIndices.left]!}
                    pos="left"
                    variant="compact"
                    active={game.turnIndex === seatIndices.left}
                    timer={timerFor(seatIndices.left)}
                  />
                  <SeatMoveBubble move={game.lastMoves[game.players[seatIndices.left]!.id]} side="right" />
                </div>
              </div>

              <div className="col-span-6 flex flex-col items-center gap-4">
                <div className="relative z-20">
                  <Seat
                    player={game.players[seatIndices.top]!}
                    pos="top"
                    variant="compact"
                    active={game.turnIndex === seatIndices.top}
                    timer={timerFor(seatIndices.top)}
                  />
                  <SeatMoveBubble move={game.lastMoves[game.players[seatIndices.top]!.id]} side="left" />
                </div>
                <div className="relative z-0 h-[180px] w-full sm:h-[260px]" />
              </div>

              <div className="col-span-3 flex items-center justify-end">
                <div className="relative z-20">
                  <Seat
                    player={game.players[seatIndices.right]!}
                    pos="right"
                    variant="compact"
                    active={game.turnIndex === seatIndices.right}
                    timer={timerFor(seatIndices.right)}
                  />
                  <SeatMoveBubble move={game.lastMoves[game.players[seatIndices.right]!.id]} side="left" />
                </div>
              </div>
            </div>
          </div>

          <div className="hidden justify-center sm:flex">
            <Seat
              player={game.players[seatIndices.bottom]!}
              pos="bottom"
              active={game.turnIndex === seatIndices.bottom}
              timer={timerFor(seatIndices.bottom)}
            />
          </div>

          {viewedPlayer ? (
            <div className="grid gap-3 lg:grid-cols-[1fr_260px] lg:items-end">
              <div className="relative pb-28 lg:pb-0">
                <SeatMoveBubble move={game.lastMoves[game.players[seatIndices.bottom]!.id]} side="above" />
                <HandArea
                  player={viewedPlayer}
                  game={game}
                  playerIndex={ui.humanViewIndex}
                  dealId={anim.dealId}
                  selectedCardIds={selectedCardIds}
                  disabled={!viewedPlayer.isHuman || duoNeedSwitch}
                  onToggle={toggleCard}
                  onSetSelection={setSelectedCardIds}
                  onClear={clearSelection}
                  headerRight={
                    viewedPlayer.isHuman ? (
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-white/70">轮到：{game.players[game.turnIndex]!.name}</div>
                      </div>
                    ) : null
                  }
                />

                {duoNeedSwitch ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/70 p-6">
                    <div className="w-full max-w-sm rounded-3xl bg-[#111B2E] p-4 ring-1 ring-white/10">
                      <div className="text-sm font-extrabold text-white">请交给 {game.players[game.turnIndex]!.name}</div>
                      <div className="mt-1 text-xs text-white/70">为保证同设备双人不偷看，当前手牌已遮罩。</div>
                      <button
                        type="button"
                        onClick={() => setHumanViewIndex(game.turnIndex)}
                        className="mt-4 w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-extrabold text-zinc-950 hover:bg-amber-400"
                      >
                        我已切换到正确玩家
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <ActionDock
                className="fixed bottom-2 left-4 right-4 z-40 lg:sticky lg:bottom-4 lg:left-auto lg:right-auto"
                canPlay={canPlay.ok}
                canPass={canPass}
                disabledReason={disabledReason}
                onPlay={() => {
                  useGameStore.getState().playSelected();
                  void syncRoomGame();
                }}
                onPass={() => {
                  useGameStore.getState().pass();
                  void syncRoomGame();
                }}
                onHint={() => hint()}
              />
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

