"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";

export const PartnerLiveMap = dynamic(
  () => import("./PartnerLiveMap").then((m) => m.PartnerLiveMap),
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
  },
);
