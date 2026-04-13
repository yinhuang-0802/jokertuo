import { BadgeCheck, HelpCircle } from "lucide-react";
import type { Player } from "@/game/types";
import { cn } from "@/lib/utils";

export default function PlayerStrip({
  players,
  turnIndex,
}: {
  players: Player[];
  turnIndex: number;
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {players.map((p, idx) => {
        const active = idx === turnIndex;
        return (
          <div
            key={p.id}
            className={cn(
              "flex items-center justify-between rounded-2xl bg-zinc-900/60 p-3 ring-1 ring-zinc-800",
              active ? "ring-emerald-400/70" : "",
            )}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                {p.isHuman ? (
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200">真人</span>
                ) : (
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200">AI</span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                <span>剩余 {p.hand.length}</span>
                {p.finishedRank ? <span>名次 #{p.finishedRank}</span> : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-zinc-200">
                {p.revealed.spadeA ? (
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5">A♠</span>
                ) : (
                  <span className="rounded-md bg-zinc-950/40 px-2 py-0.5 ring-1 ring-zinc-800">?</span>
                )}
                {p.revealed.spade3 ? (
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5">3♠</span>
                ) : (
                  <span className="rounded-md bg-zinc-950/40 px-2 py-0.5 ring-1 ring-zinc-800">?</span>
                )}
              </div>
              {active ? (
                <BadgeCheck className="h-4 w-4 text-emerald-300" />
              ) : (
                <HelpCircle className="h-4 w-4 text-zinc-600" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

