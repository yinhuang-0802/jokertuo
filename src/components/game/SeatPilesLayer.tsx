import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { comboLabel } from "@/game/combos";
import { cardToLabel } from "@/game/cards";
import { seatForPlayerIndex } from "@/game/ui";
import type { GameState } from "@/game/types";
import type { SeatPos } from "@/game/ui";

const pilePosClass: Record<SeatPos, string> = {
  bottom: "left-1/2 top-[78%] -translate-x-1/2 -translate-y-1/2",
  left: "left-[20%] top-[56%] -translate-x-1/2 -translate-y-1/2",
  top: "left-1/2 top-[22%] -translate-x-1/2 -translate-y-1/2",
  right: "left-[80%] top-[56%] -translate-x-1/2 -translate-y-1/2",
};

export default function SeatPilesLayer({ game, baseIndex }: { game: GameState; baseIndex: number }) {
  const trick = game.trick;
  const view = useMemo(() => {
    if (!trick) return null;
    const byIndex = game.players.findIndex((p) => p.id === trick.byPlayerId);
    if (byIndex < 0) return null;
    const seat = seatForPlayerIndex(byIndex, baseIndex);
    return {
      seat,
      byName: game.players[byIndex]!.name,
      comboText: comboLabel(trick.combo.type),
      cards: trick.combo.cards,
    };
  }, [baseIndex, game.players, trick]);

  if (!view) return null;

  return (
    <div className={cn("pointer-events-none absolute z-10", pilePosClass[view.seat])}>
      <div className="mb-1 text-center text-[11px] font-semibold text-white/70">
        {view.byName} · {view.comboText}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {view.cards.map((c) => (
          <div
            key={c.id}
            className="rounded-xl bg-black/20 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/10"
          >
            {cardToLabel(c)}
          </div>
        ))}
      </div>
    </div>
  );
}
