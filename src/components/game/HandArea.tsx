import { useMemo, useRef, useState, type ReactNode } from "react";
import CardView from "@/components/CardView";
import type { Card, Player } from "@/game/types";
import type { GameState } from "@/game/types";
import MoveChipsBar from "@/components/game/MoveChipsBar";

export default function HandArea({
  player,
  game,
  playerIndex,
  dealId,
  selectedCardIds,
  disabled,
  onToggle,
  onSetSelection,
  onClear,
  headerRight,
}: {
  player: Player;
  game: GameState;
  playerIndex: number;
  dealId: number;
  selectedCardIds: string[];
  disabled: boolean;
  onToggle: (id: string) => void;
  onSetSelection: (ids: string[]) => void;
  onClear: () => void;
  headerRight?: ReactNode;
}) {
  const ids = useMemo(() => new Set(selectedCardIds), [selectedCardIds]);
  const [drag, setDrag] = useState<{ start: number; end: number } | null>(null);
  const downRef = useRef(false);

  const rangeIds = (start: number, end: number) => {
    const a = Math.min(start, end);
    const b = Math.max(start, end);
    return player.hand.slice(a, b + 1).map((c) => c.id);
  };

  const applyRange = (start: number, end: number) => {
    const next = new Set(selectedCardIds);
    for (const id of rangeIds(start, end)) next.add(id);
    onSetSelection([...next]);
  };

  return (
    <div
      className="rounded-3xl bg-[#111B2E]/80 p-3 ring-1 ring-white/10 sm:p-4"
      onPointerUp={() => {
        downRef.current = false;
        if (drag) {
          applyRange(drag.start, drag.end);
          setDrag(null);
        }
      }}
      onPointerLeave={() => {
        downRef.current = false;
        setDrag(null);
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-white/70">你的手牌</div>
          <div className="mt-1 text-sm font-semibold text-white">{player.name}</div>
        </div>
        <div className="flex items-center gap-3">
          {headerRight}
          <button
            type="button"
            onClick={onClear}
            className="rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 ring-1 ring-white/10 hover:bg-white/10"
          >
            重选
          </button>
          <div className="a3-tabular text-sm font-semibold text-white/80">{player.hand.length} 张</div>
        </div>
      </div>

      <MoveChipsBar
        game={game}
        playerIndex={playerIndex}
        disabled={disabled}
        onPick={(ids) => onSetSelection(ids)}
      />

      <div className="mt-3 overflow-x-auto pb-2">
        <div className="flex w-max items-end pr-8">
          {player.hand.map((card: Card, idx: number) => {
          const inDrag = drag ? idx >= Math.min(drag.start, drag.end) && idx <= Math.max(drag.start, drag.end) : false;
          const selected = ids.has(card.id) || inDrag;
          const appearDelayMs = dealId > 0 ? Math.min(1200, idx * 60) : undefined;
          return (
            <div
              key={`${dealId}-${card.id}`}
              className="relative"
              style={{ marginLeft: idx === 0 ? 0 : -28, zIndex: selected ? 1000 : idx }}
            >
              <CardView
                card={card}
                selected={selected}
                disabled={disabled}
                appearDelayMs={appearDelayMs}
                onClick={() => onToggle(card.id)}
                onPointerDown={() => {
                  if (disabled) return;
                  downRef.current = true;
                  setDrag({ start: idx, end: idx });
                }}
                onPointerEnter={() => {
                  if (disabled) return;
                  if (!downRef.current) return;
                  setDrag((d) => (d ? { ...d, end: idx } : { start: idx, end: idx }));
                }}
              />
            </div>
          );
          })}
        </div>
      </div>
    </div>
  );
}
