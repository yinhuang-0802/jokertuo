import { useNavigate, useParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { useGameStore } from "@/store/gameStore";
import { supabase } from "@/lib/supabase";
import { getOrCreatePlayerId } from "@/lib/playerIdentity";
import { getRoomById } from "@/lib/rooms";

export default function Result() {
  const nav = useNavigate();
  const { roomId } = useParams();
  const game = useGameStore((s) => s.game);
  const result = useGameStore((s) => s.result);
  const startNewGame = useGameStore((s) => s.startNewGame);

  const backToRoom = async () => {
    if (!roomId) return;
    const playerId = getOrCreatePlayerId();
    const room = await getRoomById(roomId);
    if (room.data && room.data.owner_player_id === playerId) {
      await supabase.from("room_players").delete().eq("room_id", roomId).eq("is_ai", true);
      await supabase
        .from("rooms")
        .update({ status: "waiting", seed: null, game_state: null, game_version: 0, updated_at: new Date().toISOString() })
        .eq("id", roomId);
    }
    nav(`/room/${roomId}`);
  };

  const title = (() => {
    if (!result) return "结果生成中";
    if (result.type === "solo") {
      return result.soloOutcome === "win" ? "独食胜利" : "独食未达成";
    }
    if (result.winner === "draw") return "平局";
    return result.winner === "teamA" ? "♠A/♠3 阵营胜" : "对方阵营胜";
  })();

  const nameOf = (id: string) => game?.players.find((p) => p.id === id)?.name ?? id;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-zinc-400">结算</div>
          <div className="mt-1 text-lg font-semibold">{title}</div>
        </div>
        <button
          type="button"
          onClick={() => nav("/")}
          className="rounded-xl bg-zinc-900 px-4 py-2 text-sm ring-1 ring-zinc-800 hover:bg-zinc-800"
        >
          返回大厅
        </button>
      </div>

      <div className="mt-6 rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800">
        {game ? (
          <div className="grid gap-3">
            <div className="rounded-xl bg-zinc-950/40 p-3 ring-1 ring-zinc-800">
              <div className="text-xs text-zinc-400">名次</div>
              <div className="mt-2 grid gap-2">
                {[...game.players]
                  .slice()
                  .sort((a, b) => (a.finishedRank ?? 99) - (b.finishedRank ?? 99))
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg bg-zinc-900 p-2 ring-1 ring-zinc-800">
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-zinc-300">#{p.finishedRank ?? "-"}</div>
                    </div>
                  ))}
              </div>
            </div>

            {result ? (
              <div className="rounded-xl bg-zinc-950/40 p-3 ring-1 ring-zinc-800">
                <div className="text-xs text-zinc-400">阵营结论</div>
                <div className="mt-2 text-sm text-zinc-200">
                  {result.type === "solo" ? (
                    <div>
                      <div>独食玩家：{game.players.find((p) => p.id === result.soloId)?.name ?? result.soloId}</div>
                      <div className="mt-1 text-xs text-zinc-400">独食规则：第1名胜，第4名负</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs text-zinc-400">♠A 持有者：{result.teamASpades.aHolderId}</div>
                      <div className="text-xs text-zinc-400">♠A 持有者：{nameOf(result.teamASpades.aHolderId)}</div>
                      <div className="text-xs text-zinc-400">♠3 持有者：{nameOf(result.teamASpades.threeHolderId)}</div>
                      <div className="mt-2">胜负按阵营名次总和判定（总和更小更靠前）。</div>
                      <div className="mt-1 text-xs text-zinc-400">A3阵营：{result.teamAScore}，对方阵营：{result.teamBScore}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              {roomId ? (
                <button
                  type="button"
                  onClick={() => void backToRoom()}
                  className="flex-1 rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-amber-200"
                >
                  返回房间
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!game) return;
                    startNewGame(game.settings);
                    nav("/game", { state: game.settings });
                  }}
                  className="flex-1 rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-300"
                >
                  再来一局（沿用设置）
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  nav("/");
                }}
                className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-100 ring-1 ring-zinc-800 hover:bg-zinc-800"
              >
                回大厅
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-zinc-200">未找到对局数据。</div>
        )}
      </div>
    </AppShell>
  );
}

