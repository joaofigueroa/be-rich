import { cn } from "./utils";

export function Progress({ value, className }: { value: number; className?: string }) {
  const normalized = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(normalized)}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${normalized}%` }}
      />
    </div>
  );
}
