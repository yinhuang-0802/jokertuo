import { PropsWithChildren } from "react";

export default function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#0B1220] text-zinc-50">
      <div className="mx-auto w-full max-w-6xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">{children}</div>
    </div>
  );
}

