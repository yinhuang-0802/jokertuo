import { Menu, MoreHorizontal, Settings } from "lucide-react";
import type { GameState } from "@/game/types";

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
        <div className="text-sm font-semibold text-white/80">A3</div>
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
