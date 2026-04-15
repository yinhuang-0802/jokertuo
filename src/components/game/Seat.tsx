import { cn } from "@/lib/utils";
import TurnTimer from "@/components/game/TurnTimer";
import type { Player } from "@/game/types";

export default function Seat({
  player,
  active,
  pos,
  timer,
  variant = "full",
}: {
  player: Player;
  active: boolean;
  pos: "left" | "top" | "right" | "bottom";
  timer?: { msLeft: number; progress: number };
  variant?: "full" | "compact";
}) {
  const frame =
    pos === "bottom"
      ? "w-full max-w-[560px]"
      : "w-full max-w-[220px]";

  const baseCard =
    variant === "compact"
      ? "rounded-3xl bg-[#0B2441]/55 p-3 ring-1 backdrop-blur"
      : "rounded-3xl bg-[#0B2441]/55 p-4 ring-1 backdrop-blur";

  return (
    <div
      className={cn(
        frame,
        baseCard,
        active ? "ring-sky-400/55" : "ring-white/15",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className={cn("relative h-9 w-9 rounded-full ring-1", active ? "bg-sky-500/20 ring-sky-400/45" : "bg-white/10 ring-white/15")}>
              {player.revealed.spadeA ? (
                <div className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-black text-zinc-950 ring-1 ring-white/50">
                  A
                </div>
              ) : null}
              {player.revealed.spade3 ? (
                <div className="absolute -top-2 left-3 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-black text-zinc-950 ring-1 ring-white/50">
                  3
                </div>
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{player.name}</div>
              {variant === "full" ? (
                <div className="mt-0.5 flex items-center gap-2 text-xs text-white/70">
                  <span>{player.isHuman ? "真人" : "AI"}</span>
                  {player.finishedRank ? <span>#{player.finishedRank}</span> : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {timer ? <TurnTimer msLeft={timer.msLeft} progress={timer.progress} /> : null}
          <div className="text-right">
            <div className="a3-tabular text-xs text-white/70">剩余</div>
            <div className="a3-tabular text-3xl font-extrabold text-white">{player.hand.length}</div>
          </div>
        </div>
      </div>

      {variant === "full" && (player.revealed.spadeA || player.revealed.spade3) ? (
        <div className="mt-2 flex items-center gap-2 text-xs text-white/70">
          <span>已亮牌</span>
        </div>
      ) : null}
    </div>
  );
}
