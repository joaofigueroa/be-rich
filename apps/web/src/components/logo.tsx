import { Gem } from "lucide-react";
import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 font-semibold tracking-[-0.03em]">
      <span className="grid size-9 place-items-center rounded-xl bg-emerald-700 text-white shadow-sm">
        <Gem className="size-4.5" />
      </span>
      {compact ? null : <span className="text-lg">Be Rich</span>}
    </Link>
  );
}
