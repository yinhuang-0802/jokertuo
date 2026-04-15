import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Sparkles } from "lucide-react";
import AppShell from "@/components/AppShell";
import { createRoom, getRoomByCode, joinRoomById } from "@/lib/rooms";
import { getOrCreateDisplayName, getOrCreatePlayerId } from "@/lib/playerIdentity";

type LobbyMode = "solo" | "duo";
type AiDifficulty = "easy" | "normal" | "hard";

const difficultyLabel: Record<AiDifficulty, string> = {
  easy: "简单",
  normal: "普通",
  hard: "困难",
};

const modeLabel: Record<LobbyMode, string> = {
  solo: "单人开局（你 + 3 AI）",
  duo: "双人开局（2 人 + 2 AI）",
};

export default function Lobby() {
  const nav = useNavigate();
  const [mode, setMode] = useState<LobbyMode>("solo");
  const [difficulty, setDifficulty] = useState<AiDifficulty>("normal");
  const [showRules, setShowRules] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [roomError, setRoomError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const playerId = useMemo(() => getOrCreatePlayerId(), []);
  const displayName = useMemo(() => getOrCreateDisplayName(), []);

  const subtitle = useMemo(() => {
    return `${modeLabel[mode]} · AI难度：${difficultyLabel[difficulty]}`;
  }, [mode, difficulty]);

  const errMsg = (e: unknown) => {
    if (!e) return "";
    if (e instanceof Error) return e.message;
    if (typeof e === "string") return e;
    if (typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
    return "操作失败";
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 ring-1 ring-zinc-800">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">A3</h1>
              <p className="text-sm text-zinc-300">真人 + AI补位，可单人开局</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800">
          <div className="text-sm font-medium text-zinc-100">模式</div>
          <div className="mt-3 grid gap-2">
            {(["solo", "duo"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={
                  "flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition " +
                  (mode === m
                    ? "bg-zinc-800 ring-1 ring-zinc-700"
                    : "bg-zinc-950/40 ring-1 ring-zinc-800 hover:bg-zinc-900")
                }
              >
                <div>
                  <div className="text-sm font-medium">{modeLabel[m]}</div>
                  <div className="text-xs text-zinc-400">不足座位自动由AI补齐</div>
                </div>
                <div
                  className={
                    "h-2.5 w-2.5 rounded-full " +
                    (mode === m ? "bg-emerald-400" : "bg-zinc-700")
                  }
                />
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800">
          <div className="text-sm font-medium text-zinc-100">AI 难度</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["easy", "normal", "hard"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={
                  "rounded-xl px-3 py-3 text-sm font-medium ring-1 transition " +
                  (difficulty === d
                    ? "bg-amber-300 text-zinc-950 ring-amber-200"
                    : "bg-zinc-950/40 text-zinc-100 ring-zinc-800 hover:bg-zinc-900")
                }
              >
                {difficultyLabel[d]}
              </button>
            ))}
          </div>
          <div className="mt-3 text-xs text-zinc-400">
            难度会影响 AI 的出牌策略与保留强牌倾向。
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800">
          <div className="text-sm font-medium text-zinc-100">创建房间</div>
          <div className="mt-3 text-xs text-zinc-400">邀请好友加入后由房主开始；≥1 人即可开局，不足席位 AI 补齐。</div>
          <button
            type="button"
            disabled={creating}
            onClick={async () => {
              setRoomError(null);
              setCreating(true);
              const res = await createRoom({ ownerPlayerId: playerId, ownerName: displayName, mode, difficulty });
              setCreating(false);
              if (res.error || !res.data) {
                setRoomError(errMsg(res.error) || "创建失败");
                return;
              }
              nav(`/room/${res.data.id}`);
            }}
            className={
              "mt-3 w-full rounded-xl px-5 py-3 text-sm font-semibold transition " +
              (creating ? "bg-white/5 text-white/40" : "bg-amber-300 text-zinc-950 hover:bg-amber-200")
            }
          >
            {creating ? "创建中…" : "创建并邀请"}
          </button>
        </div>

        <div className="rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800">
          <div className="text-sm font-medium text-zinc-100">加入房间</div>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="输入邀请码"
              className="w-full rounded-xl bg-zinc-950/40 px-3 py-3 text-sm text-white ring-1 ring-zinc-800 outline-none focus:ring-amber-200"
            />
            <button
              type="button"
              disabled={joining || inviteCode.trim().length === 0}
              onClick={async () => {
                setRoomError(null);
                setJoining(true);
                const code = inviteCode.trim().toUpperCase();
                const room = await getRoomByCode(code);
                if (room.error || !room.data) {
                  setJoining(false);
                  setRoomError("邀请码无效或已过期");
                  return;
                }
                const joined = await joinRoomById({ roomId: room.data.id, playerId, displayName });
                setJoining(false);
                if (joined.error) {
                  setRoomError(joined.error.message);
                  return;
                }
                nav(`/room/${room.data.id}`);
              }}
              className={
                "shrink-0 rounded-xl px-4 py-3 text-sm font-semibold transition " +
                (joining || inviteCode.trim().length === 0
                  ? "bg-white/5 text-white/40"
                  : "bg-emerald-400 text-zinc-950 hover:bg-emerald-300")
              }
            >
              {joining ? "加入中…" : "加入"}
            </button>
          </div>
          <div className="mt-3 text-xs text-zinc-400">也可以直接打开好友分享的邀请链接。</div>
        </div>
      </div>

      {roomError ? (
        <div className="mt-4 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-200 ring-1 ring-rose-400/20">
          {roomError}
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800">
        <button
          type="button"
          onClick={() => setShowRules((v) => !v)}
          className="flex w-full items-center justify-between"
        >
          <div className="text-sm font-medium">A3 规则速览</div>
          <ChevronDown
            className={
              "h-4 w-4 text-zinc-300 transition " +
              (showRules ? "rotate-180" : "")
            }
          />
        </button>
        {showRules ? (
          <div className="mt-3 grid gap-2 text-sm text-zinc-200">
            <div className="rounded-xl bg-zinc-950/40 p-3 ring-1 ring-zinc-800">
              <div className="text-xs text-zinc-400">点数大小</div>
              <div className="mt-1">3 &gt; 2 &gt; A &gt; K &gt; Q &gt; J &gt; 10 … &gt; 4</div>
            </div>
            <div className="rounded-xl bg-zinc-950/40 p-3 ring-1 ring-zinc-800">
              <div className="text-xs text-zinc-400">开局</div>
              <div className="mt-1">持有 ♦4 的玩家先出，第一手必须包含 ♦4</div>
            </div>
            <div className="rounded-xl bg-zinc-950/40 p-3 ring-1 ring-zinc-800">
              <div className="text-xs text-zinc-400">阵营</div>
              <div className="mt-1">♠A 与 ♠3 为一队；打出后身份暴露</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-zinc-300">{subtitle}</div>
        <button
          type="button"
          onClick={() =>
            nav("/game", {
              state: {
                mode,
                difficulty,
              },
            })
          }
          className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300"
        >
          开始游戏
        </button>
      </div>
    </AppShell>
  );
}

