"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";

type NavLinkProps = Omit<ComponentProps<typeof Link>, "prefetch"> & {
  children: ReactNode;
};

/**
 * Sidebar navigation link that avoids eager prefetching every route in the
 * viewport (which stalls the dev server and slows active navigations).
 * Prefetches on hover instead.
 */
export function NavLink({ href, children, onMouseEnter, ...props }: NavLinkProps) {
  const router = useRouter();

  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={(event) => {
        if (typeof href === "string") {
          router.prefetch(href);
        }
        onMouseEnter?.(event);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
