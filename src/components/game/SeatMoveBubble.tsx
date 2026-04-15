import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { comboLabel } from "@/game/combos";
import type { LastMove } from "@/game/types";

function idToLabel(id: string) {
  const suit = id.slice(-1);
  const rank = id.slice(0, -1);
  const s = suit === "S" ? "♠" : suit === "H" ? "♥" : suit === "C" ? "♣" : "♦";
  return `${rank}${s}`;
}

export default function SeatMoveBubble({
  move,
  side,
}: {
  move: LastMove | null | undefined;
  side: "left" | "right" | "top" | "above";
}) {
  const content = useMemo(() => {
    if (!move) return null;
    if (move.kind === "pass") return { title: "不出", cards: [] as string[] };
    return { title: comboLabel(move.comboType), cards: move.cardIds };
  }, [move]);

  if (!content) return null;

  const posClass =
    side === "right"
      ? "absolute left-full ml-2 top-1/2 -translate-y-1/2"
      : side === "left"
        ? "absolute right-full mr-2 top-1/2 -translate-y-1/2"
        : side === "top"
          ? "absolute right-full mr-2 top-1/2 -translate-y-1/2"
          : "absolute left-1/2 -translate-x-1/2 -top-3 -translate-y-full";

  return (
    <div className={cn("pointer-events-none", posClass)}>
      <div className="rounded-3xl bg-[#0B2441]/55 p-2 ring-1 ring-sky-400/20 backdrop-blur">
        <div className="inline-flex items-center rounded-2xl bg-black/30 px-3 py-1 text-[12px] font-extrabold text-white/90 ring-1 ring-white/10">
          {content.title}
        </div>
        {content.cards.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {content.cards.slice(0, 5).map((id) => (
              <div key={id} className="rounded-2xl bg-white px-3 py-2 text-[14px] font-black text-zinc-900 shadow-sm">
                {idToLabel(id)}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
