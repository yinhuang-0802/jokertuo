import { cn } from "@/lib/utils";

export default function ActionDock({
  canPlay,
  canPass,
  disabledReason,
  onPlay,
  onPass,
  onHint,
  className,
}: {
  canPlay: boolean;
  canPass: boolean;
  disabledReason?: string;
  onPlay: () => void;
  onPass: () => void;
  onHint: () => void;
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <div className="rounded-3xl bg-[#111B2E]/85 p-3 ring-1 ring-white/10 backdrop-blur">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
          <button
            type="button"
            onClick={onPlay}
            disabled={!canPlay}
            className={cn(
              "col-span-1 rounded-2xl px-3 py-3 text-sm font-extrabold transition sm:col-span-1 sm:px-4",
              canPlay ? "bg-amber-500 text-zinc-950 hover:bg-amber-400" : "bg-white/5 text-white/40",
            )}
          >
            出牌
          </button>
          <button
            type="button"
            onClick={onPass}
            disabled={!canPass}
            className={cn(
              "col-span-1 rounded-2xl px-3 py-3 text-sm font-semibold ring-1 transition",
              canPass ? "bg-white/5 text-white ring-white/10 hover:bg-white/10" : "bg-white/5 text-white/30 ring-white/5",
            )}
          >
            不要
          </button>
          <button
            type="button"
            onClick={onHint}
            className="col-span-1 rounded-2xl bg-white/5 px-3 py-3 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/10"
          >
            提示
          </button>
        </div>
        {disabledReason ? <div className="mt-2 text-xs text-white/60">{disabledReason}</div> : null}
      </div>
    </div>
  );
}
