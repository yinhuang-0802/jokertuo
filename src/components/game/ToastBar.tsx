import { cn } from "@/lib/utils";

export default function ToastBar({
  toast,
}: {
  toast: { id: number; tone: "info" | "error" | "success"; message: string } | null;
}) {
  if (!toast) return null;
  const tone =
    toast.tone === "error"
      ? "bg-rose-500/15 text-rose-100 ring-rose-500/25"
      : toast.tone === "success"
        ? "bg-emerald-500/15 text-emerald-100 ring-emerald-500/25"
        : "bg-sky-500/15 text-sky-100 ring-sky-500/25";

  return (
    <div key={toast.id} className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex justify-center px-4">
      <div
        className={cn(
          "a3-toast-in mt-3 max-w-xl rounded-2xl px-4 py-2 text-sm font-semibold ring-1 backdrop-blur",
          tone,
        )}
      >
        {toast.message}
      </div>
    </div>
  );
}

