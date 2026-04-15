import type { Card } from "@/game/types";
import { cn } from "@/lib/utils";

function suitText(suit: Card["suit"]) {
  if (suit === "S") return "♠";
  if (suit === "H") return "♥";
  if (suit === "C") return "♣";
  return "♦";
}

function suitColor(suit: Card["suit"]) {
  return suit === "H" || suit === "D" ? "text-rose-600" : "text-zinc-900";
}

export default function CardView({
  card,
  selected,
  disabled,
  onClick,
  appearDelayMs,
  onPointerDown,
  onPointerEnter,
}: {
  card: Card;
  selected: boolean;
  disabled?: boolean;
  onClick?: () => void;
  appearDelayMs?: number;
  onPointerDown?: () => void;
  onPointerEnter?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      disabled={disabled}
      style={
        appearDelayMs !== undefined
          ? {
              animationDelay: `${appearDelayMs}ms`,
            }
          : undefined
      }
      className={cn(
        "group relative flex h-20 w-14 touch-manipulation flex-col justify-between rounded-xl bg-white px-2 py-2 text-left text-zinc-950 ring-1 transition will-change-transform sm:h-24 sm:w-16",
        appearDelayMs !== undefined ? "a3-deal" : "",
        disabled ? "opacity-60" : "hover:-translate-y-1 hover:shadow-md",
        selected ? "-translate-y-2 ring-amber-400 shadow-md" : "ring-zinc-200",
      )}
    >
      <div className={cn("flex items-center gap-0.5 text-xs font-extrabold", suitColor(card.suit))}>
        <span>{card.rank}</span>
        <span>{suitText(card.suit)}</span>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className={cn("text-xl font-black sm:text-2xl", suitColor(card.suit))}>{card.rank}</div>
      </div>
      <div className={cn("absolute bottom-2 right-2 flex items-center gap-0.5 text-xs font-extrabold", suitColor(card.suit))}>
        <span>{card.rank}</span>
        <span>{suitText(card.suit)}</span>
      </div>
    </button>
  );
}
