import { cn } from "@/lib/utils";

export default function TurnTimer({
  msLeft,
  progress,
}: {
  msLeft: number;
  progress: number;
}) {
  const secs = Math.ceil(msLeft / 1000);
  const size = 44;
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = c * progress;
  const danger = secs <= 3;

  return (
    <div className="relative h-11 w-11">
      <svg width={size} height={size} className="absolute inset-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="transparent" stroke="rgba(255,255,255,0.12)" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="transparent"
          stroke={danger ? "#EF4444" : "#3B82F6"}
          strokeWidth={4}
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        className={cn(
          "a3-tabular absolute inset-0 flex items-center justify-center text-sm font-bold",
          danger ? "text-rose-200" : "text-zinc-100",
        )}
      >
        {secs}
      </div>
    </div>
  );
}

