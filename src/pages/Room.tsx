import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { getOrCreateDisplayName, getOrCreatePlayerId } from "@/lib/playerIdentity";
import { getRoomById, joinRoomById, listRoomPlayers, type RoomPlayerRow, type RoomRow } from "@/lib/rooms";
import { cn } from "@/lib/utils";
import { mulberry32 } from "@/game/rng";
import { createRoomGame } from "@/game/roomGame";

function coerceDifficulty(value: string | null | undefined): "easy" | "normal" | "hard" {
  if (value === "easy" || value === "normal" || value === "hard") return value;
  return "normal";
}

export default function Room() {
  const nav = useNavigate();
  const { roomId } = useParams();
  const playerId = useMemo(() => getOrCreatePlayerId(), []);
  const displayName = useMemo(() => getOrCreateDisplayName(), []);

  const [room, setRoom] = useState<RoomRow | null>(null);
  const [players, setPlayers] = useState<RoomPlayerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!roomId) return;
    let alive = true;

    (async () => {
      setError(null);
      const joined = await joinRoomById({ roomId, playerId, displayName });
      if (!alive) return;
      if (joined.error) {
        setError(joined.error.message);
      }
      setRoom(joined.room);
      setPlayers(joined.players ?? []);
    })();

    return () => {
      alive = false;
    };
  }, [displayName, playerId, roomId]);

  useEffect(() => {
    if (!roomId) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const ch = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
        async () => {
          const res = await listRoomPlayers(roomId);
          if (!res.error) setPlayers(res.data);
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, async () => {
        const res = await getRoomById(roomId);
        if (res.error) return;
        setRoom(res.data);
      })
      .subscribe();

    channelRef.current = ch;
    const poll = window.setInterval(async () => {
      const [r, p] = await Promise.all([getRoomById(roomId), listRoomPlayers(roomId)]);
      if (!r.error) setRoom(r.data);
      if (!p.error) setPlayers(p.data);
    }, 2000);
    return () => {
      window.clearInterval(poll);
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !room) return;
    if (room.status === "in_game") {
      nav(`/game/${roomId}`);
    }
  }, [nav, room, roomId]);

  const isOwner = !!room && room.owner_player_id === playerId;
  const humanCount = players.filter((p) => !p.is_ai).length;
  const canStart = !!room && room.status === "waiting" && isOwner && humanCount >= 1;

  const inviteLink = useMemo(() => {
    if (!roomId) return "";
    return `${window.location.origin}/room/${roomId}`;
  }, [roomId]);

  const slots = useMemo(() => {
    const out: Array<RoomPlayerRow | null> = [null, null, null, null];
    for (const p of players) out[p.seat_index] = p;
    return out;
  }, [players]);

  const startGame = async () => {
    if (!roomId || !room) return;
    if (!canStart) return;
    setStarting(true);
    setError(null);

    const seed = Math.floor(Math.random() * 2 ** 31);

    const lockRes = await supabase
      .from("rooms")
      .update({ status: "locked", seed, updated_at: new Date().toISOString() })
      .eq("id", roomId)
      .eq("status", "waiting")
      .select("*")
      .single<RoomRow>();

    if (lockRes.error) {
      setStarting(false);
      setError(lockRes.error.message);
      return;
    }

    const currentPlayers = await listRoomPlayers(roomId);
    if (currentPlayers.error) {
      setStarting(false);
      setError(currentPlayers.error.message);
      return;
    }

    const used = new Set(currentPlayers.data.map((p) => p.seat_index));
    const aiInserts: Array<Partial<RoomPlayerRow>> = [];
    for (const seat of [0, 1, 2, 3]) {
      if (used.has(seat)) continue;
      aiInserts.push({
        room_id: roomId,
        player_id: `ai-${roomId}-${seat}`,
        display_name: `AI${seat + 1}`,
        is_owner: false,
        is_ai: true,
        seat_index: seat,
      });
    }
    if (aiInserts.length) {
      const ins = await supabase.from("room_players").insert(aiInserts);
      if (ins.error) {
        setStarting(false);
        setError(ins.error.message);
        return;
      }
    }

    const allPlayersRes = await listRoomPlayers(roomId);
    if (allPlayersRes.error) {
      setStarting(false);
      setError(allPlayersRes.error.message);
      return;
    }
    const seatPlayers = allPlayersRes.data.slice().sort((a, b) => a.seat_index - b.seat_index);

    const gamePlayers = seatPlayers.map((p) => ({ id: p.player_id, name: p.display_name, isAi: p.is_ai }));
    const rng = mulberry32(seed);
    const game = createRoomGame({ players: gamePlayers, difficulty: coerceDifficulty(lockRes.data.difficulty), rng });

    const startRes = await supabase
      .from("rooms")
      .update({ status: "in_game", game_state: game as unknown, game_version: 1, updated_at: new Date().toISOString() })
      .eq("id", roomId)
      .select("*")
      .single<RoomRow>();

    if (startRes.error) {
      setStarting(false);
      setError(startRes.error.message);
      return;
    }

    nav(`/game/${roomId}`);
  };

  return (
    <AppShell>
      <div className="grid gap-4">
        <div className="rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-zinc-400">房间</div>
              <div className="mt-1 text-lg font-extrabold text-white">{room?.invite_code ?? "…"}</div>
              <div className="mt-1 text-xs text-zinc-400">状态：{room?.status ?? "…"} · 真人：{humanCount}/4</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                }}
                className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/10 hover:bg-white/10"
              >
                复制邀请链接
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!room?.invite_code) return;
                  navigator.clipboard.writeText(room.invite_code);
                }}
                className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/10 hover:bg-white/10"
              >
                复制邀请码
              </button>
            </div>
          </div>
          {error ? <div className="mt-3 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-200 ring-1 ring-rose-400/20">{error}</div> : null}
        </div>

        <div className="rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800">
          <div className="text-sm font-semibold text-white">成员（4 个座位）</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {slots.map((p, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-2xl bg-zinc-950/40 p-3 ring-1",
                  p ? "ring-zinc-800" : "ring-zinc-900",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs text-zinc-400">座位 {idx + 1}</div>
                  {p?.is_owner ? <div className="rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-extrabold text-zinc-950">房主</div> : null}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className={cn("h-9 w-9 rounded-full ring-1", p ? "bg-white/5 ring-white/10" : "bg-white/0 ring-white/5")} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{p ? p.display_name : "空位"}</div>
                    <div className="mt-0.5 text-xs text-zinc-400">{p ? (p.is_ai ? "AI" : "真人") : "等待加入"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-400">
              {humanCount === 0 ? "至少 1 名玩家才能开始" : humanCount < 4 ? "将由 AI 补齐至 4 人" : "已满员，可直接开始"}
            </div>
            <button
              type="button"
              disabled={!canStart || starting}
              onClick={startGame}
              className={cn(
                "rounded-xl px-5 py-3 text-sm font-extrabold transition",
                canStart && !starting ? "bg-amber-400 text-zinc-950 hover:bg-amber-300" : "bg-white/5 text-white/40",
              )}
            >
              {starting ? "开局中…" : isOwner ? "开始" : "等待房主开始"}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => nav("/")}
            className="rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/10 hover:bg-white/10"
          >
            返回大厅
          </button>
          <div className="text-xs text-zinc-400">你的身份：{displayName}</div>
        </div>
      </div>
    </AppShell>
  );
}
