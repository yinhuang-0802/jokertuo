import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { comboLabel } from "@/game/combos";
import { uiLegalMovesByType } from "@/game/ai";
import type { GameState } from "@/game/types";

type ComboTypeKey = "single" | "pair" | "straight" | "flush" | "full_house" | "four_kind" | "straight_flush";

export default function MoveChipsBar({
  game,
  playerIndex,
  disabled,
  onPick,
}: {
  game: GameState;
  playerIndex: number;
  disabled: boolean;
  onPick: (cardIds: string[]) => void;
}) {
  const groups = useMemo(() => uiLegalMovesByType(game, playerIndex, 4), [game, playerIndex]);
  const [cycle, setCycle] = useState<Record<string, number>>({});

  if (!groups.some((g) => g.moves.length > 0)) return null;

  return (
    <div className="mt-3 overflow-x-auto pb-2">
      <div className="flex w-max items-center gap-2 pr-6">
        {groups.map((g) => {
          const type = g.type as ComboTypeKey;
          const moves = g.moves;
          const usable = moves.length > 0;
          const idx = usable ? (cycle[type] ?? 0) % moves.length : 0;
          return (
            <button
              key={g.type}
              type="button"
              disabled={!usable || disabled}
              onClick={() => {
                if (!usable) return;
                const next = (cycle[type] ?? 0) + 1;
                setCycle((s) => ({ ...s, [type]: next }));
                const pick = moves[idx] ?? moves[0]!;
                onPick(pick.map((c) => c.id));
              }}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 transition",
                usable && !disabled
                  ? "bg-white/5 text-white ring-white/10 hover:bg-white/10"
                  : "bg-white/5 text-white/30 ring-white/5",
              )}
            >
              {comboLabel(g.type)}
              {usable && moves.length > 1 ? <span className="ml-1 text-white/50">{moves.length}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

