import { useEffect, useMemo, useState } from "react";

export function useTurnCountdown({
  turnKey,
  active,
  durationMs,
}: {
  turnKey: string;
  active: boolean;
  durationMs: number;
}) {
  const [deadline, setDeadline] = useState<number>(() => Date.now() + durationMs);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    setDeadline(Date.now() + durationMs);
    setNow(Date.now());
  }, [turnKey, durationMs]);

  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), 120);
    return () => window.clearInterval(t);
  }, [active]);

  const msLeft = useMemo(() => Math.max(0, deadline - now), [deadline, now]);
  const progress = useMemo(() => {
    if (!active) return 0;
    return Math.min(1, Math.max(0, msLeft / durationMs));
  }, [active, durationMs, msLeft]);

  return { msLeft, progress };
}

