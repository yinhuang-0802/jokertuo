import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { SeatPos } from "@/game/ui";

type PlayAnim = { id: number; from: SeatPos; cardIds: string[] };

const startClass: Record<SeatPos, string> = {
  bottom: "left-1/2 bottom-2 -translate-x-1/2",
  left: "left-[16%] top-[58%] -translate-x-1/2 -translate-y-1/2",
  top: "left-1/2 top-8 -translate-x-1/2",
  right: "left-[84%] top-[58%] -translate-x-1/2 -translate-y-1/2",
};

const endClass: Record<SeatPos, string> = {
  bottom: "left-1/2 top-[78%] -translate-x-1/2 -translate-y-1/2",
  left: "left-[20%] top-[56%] -translate-x-1/2 -translate-y-1/2",
  top: "left-1/2 top-[22%] -translate-x-1/2 -translate-y-1/2",
  right: "left-[80%] top-[56%] -translate-x-1/2 -translate-y-1/2",
};

function idToLabel(id: string) {
  const suit = id.slice(-1);
  const rank = id.slice(0, -1);
  const s = suit === "S" ? "♠" : suit === "H" ? "♥" : suit === "C" ? "♣" : "♦";
  return `${s}${rank}`;
}

export default function PlayAnimLayer({ playAnim }: { playAnim: PlayAnim | null }) {
  const [showAnim, setShowAnim] = useState<PlayAnim | null>(null);
  const [flyIn, setFlyIn] = useState(false);

  useEffect(() => {
    if (!playAnim) return;
    setShowAnim(playAnim);
    setFlyIn(false);
    const raf = window.requestAnimationFrame(() => setFlyIn(true));
    const t = window.setTimeout(() => {
      setShowAnim(null);
      setFlyIn(false);
    }, 360);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [playAnim]);

  if (!showAnim) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <div
        key={showAnim.id}
        className={cn(
          "absolute flex flex-wrap justify-center gap-2 transition-all duration-300 ease-out",
          flyIn ? endClass[showAnim.from] : startClass[showAnim.from],
        )}
      >
        {showAnim.cardIds.slice(0, 5).map((id) => (
          <div
            key={id}
            className={cn(
              "rounded-xl px-2 py-1 text-xs font-bold ring-1 ring-white/30",
              flyIn ? "bg-white px-3 py-2 text-sm text-zinc-950" : "bg-white/90 text-zinc-950",
            )}
          >
            {idToLabel(id)}
          </div>
        ))}
      </div>
    </div>
  );
}
