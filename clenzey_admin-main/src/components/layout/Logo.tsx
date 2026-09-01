import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";

export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href="/overview"
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <Image
        src="/icons/clenzey_branding.svg"
        alt="Clenzey"
        width={compact ? 87 : 108}
        height={compact ? 32 : 40}
        priority
      />
      {!compact && (
        <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-base-content/50">
          Operations
        </span>
      )}
    </Link>
  );
}
