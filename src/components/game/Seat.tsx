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

  return (
    <div
      className={cn(
        frame,
        "rounded-2xl bg-[#111B2E]/80 p-3 ring-1 backdrop-blur",
        active ? "ring-sky-400/60" : "ring-white/10",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className={cn("h-9 w-9 rounded-full ring-1", active ? "bg-sky-500/20 ring-sky-400/50" : "bg-white/5 ring-white/10")} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{player.name}</div>
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
            <div className="a3-tabular text-2xl font-extrabold text-white">{player.hand.length}</div>
          </div>
        </div>
      </div>

      {variant === "full" ? (
        <div className="mt-2 hidden items-center gap-2 text-xs sm:flex">
          <div className={cn("rounded-md px-2 py-0.5 ring-1", player.revealed.spadeA ? "bg-white/10 text-white ring-white/10" : "bg-white/5 text-white/40 ring-white/10")}>
            {player.revealed.spadeA ? "A♠" : "?"}
          </div>
          <div className={cn("rounded-md px-2 py-0.5 ring-1", player.revealed.spade3 ? "bg-white/10 text-white ring-white/10" : "bg-white/5 text-white/40 ring-white/10")}>
            {player.revealed.spade3 ? "3♠" : "?"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
