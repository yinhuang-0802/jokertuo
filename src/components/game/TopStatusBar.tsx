import { Menu, MoreHorizontal, Settings } from "lucide-react";
import { comboLabel } from "@/game/combos";
import type { GameState } from "@/game/types";

function titleFor(game: GameState) {
  if (!game.trick) return "自由出牌";
  return "跟牌";
}

function sublineFor(game: GameState) {
  if (!game.trick) return "接风中：可重新出任意牌型";
  const name = game.players.find((p) => p.id === game.trick!.byPlayerId)?.name ?? game.trick.byPlayerId;
  return `${name} · ${comboLabel(game.trick.combo.type)} · 连续不要 ${game.passCount}`;
}

export default function TopStatusBar({
  game,
  onBack,
}: {
  game: GameState;
  onBack: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-2xl bg-white/5 p-2 text-white/80 ring-1 ring-white/10 hover:bg-white/10"
          aria-label="返回大厅"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:block">
          <div className="text-xs text-white/60">A3</div>
          <div className="text-sm font-semibold text-white">出牌中</div>
        </div>
      </div>

      <div className="min-w-0 flex-1 text-center hidden sm:block">
        <div className="truncate text-2xl font-black text-white">{titleFor(game)}</div>
        <div className="mt-1 truncate text-xs font-semibold text-white/70">{sublineFor(game)}</div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-2xl bg-white/5 p-2 text-white/80 ring-1 ring-white/10 hover:bg-white/10"
          aria-label="设置"
        >
          <Settings className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="rounded-2xl bg-white/5 p-2 text-white/80 ring-1 ring-white/10 hover:bg-white/10"
          aria-label="更多"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
