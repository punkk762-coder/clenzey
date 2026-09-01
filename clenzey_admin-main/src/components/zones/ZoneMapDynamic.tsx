"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

export const ZoneMap = dynamic(
  () => import("./ZoneMap").then((m) => m.ZoneMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
  },
);
