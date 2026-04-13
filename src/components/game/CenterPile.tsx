import { useMemo } from "react";
import { comboLabel } from "@/game/combos";
import { cardToLabel } from "@/game/cards";
import type { GameState } from "@/game/types";

export default function CenterPile({
  game,
}: {
  game: GameState;
}) {
  const trick = game.trick;
  const trickText = useMemo(() => {
    if (!trick) return "接风中：可自由出牌";
    const name = game.players.find((p) => p.id === trick.byPlayerId)?.name ?? trick.byPlayerId;
    return `${name} · ${comboLabel(trick.combo.type)}`;
  }, [game.players, trick]);

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="w-full max-w-md rounded-3xl bg-[#111B2E]/60 p-4 ring-1 ring-white/10 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/70">出牌阶段</div>
          <div className="text-xs text-white/70">连续 pass：{game.passCount}</div>
        </div>
        <div className="mt-1 text-sm font-semibold text-white">{trickText}</div>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {trick ? (
            trick.combo.cards.map((c) => (
              <div
                key={c.id}
                className="rounded-xl bg-black/20 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/10"
              >
                {cardToLabel(c)}
              </div>
            ))
          ) : (
            <div className="text-sm text-white/70">等待出牌…</div>
          )}
        </div>
      </div>
    </div>
  );
}
