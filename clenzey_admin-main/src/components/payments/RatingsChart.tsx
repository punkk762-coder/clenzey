"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";

import { computeRatingDistribution, reviewsApi } from "@/lib/api/reviews";
import { API_MAX_PAGE_SIZE } from "@/lib/api/params";

const STAR_LABELS = ["5 Stars", "4 Stars", "3 Stars", "2 Stars", "1 Star"] as const;

export function RatingsChart() {
  const {
    data: reviewsResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["rating-distribution"],
    queryFn: () => reviewsApi.list({ limit: API_MAX_PAGE_SIZE, offset: 0 }),
  });

  const distributionData = useMemo(() => {
    const reviews = Array.isArray(reviewsResponse?.data)
      ? reviewsResponse.data
      : [];
    return computeRatingDistribution(reviews);
  }, [reviewsResponse]);

  const bars = useMemo(() => {
    if (!distributionData || distributionData.total === 0) return [];
    const keys = ["star5", "star4", "star3", "star2", "star1"] as const;
    return keys.map((key, idx) => {
      const count = distributionData[key];
      const percentage = Math.round((count / distributionData.total) * 100);
      return { label: STAR_LABELS[idx], percentage, count };
    });
  }, [distributionData]);

  return (
    <div className="card admin-table-card">
      <div className="border-b border-base-300 px-5 py-4">
        <h3 className="text-lg font-semibold">Ratings Analysis</h3>
        <p className="text-xs opacity-60">
          Star distribution computed from review listings
        </p>
      </div>

      <div className="px-5 py-4">
        {isLoading && (
          <div className="flex h-[200px] items-center justify-center">
            <span className="loading loading-spinner loading-sm" />
          </div>
        )}

        {isError && (
          <div className="flex h-[200px] flex-col items-center justify-center gap-3">
            <p className="text-sm text-error">Ratings data is unavailable.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="btn btn-outline btn-xs"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && distributionData.total === 0 && (
          <p className="py-8 text-center text-sm opacity-60">No reviews yet</p>
        )}

        {!isLoading && !isError && distributionData.total > 0 && (
          <>
            <div className="space-y-3">
              {bars.map((bar) => (
                <div key={bar.label} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 font-mono text-[11px] opacity-60">
                    {bar.label}
                  </span>
                  <div className="relative h-5 flex-1 overflow-hidden rounded-sm bg-base-200">
                    <div
                      className="absolute inset-y-0 left-0 rounded-sm bg-primary/70 transition-all duration-500"
                      style={{ width: `${bar.percentage}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right font-mono text-[11px]">
                    {bar.percentage}%
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-box border border-base-300 bg-base-200/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" strokeWidth={1.5} />
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                  Average rating
                </span>
              </div>
              <p className="mt-2 text-sm">
                <span className="font-mono font-medium">
                  {distributionData.averageRating.toFixed(1)}
                </span>{" "}
                across {distributionData.total} review
                {distributionData.total === 1 ? "" : "s"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
