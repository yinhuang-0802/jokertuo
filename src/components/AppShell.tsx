import { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export default function AppShell({
  children,
  variant = "default",
  className,
}: PropsWithChildren<{ variant?: "default" | "full"; className?: string }>) {
  return (
    <div className={cn("min-h-dvh overflow-x-hidden bg-[#0B1220] text-zinc-50", className)}>
      <div
        className={cn(
          "mx-auto w-full pb-[max(1.5rem,env(safe-area-inset-bottom))]",
          variant === "full" ? "max-w-none px-0 pt-0" : "max-w-6xl px-4 pt-6",
        )}
      >
        {children}
      </div>
    </div>
  );
}

