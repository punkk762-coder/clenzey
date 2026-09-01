"use client";

import { useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { dateShort } from "@/lib/utils/format";
import type { Review } from "@/types";

// ─── Sub-components ──────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < rating
              ? "fill-warning text-warning"
              : "fill-none opacity-30"
          }`}
        />
      ))}
      <span className="ml-1 font-mono text-xs opacity-60">
        {rating}
      </span>
    </div>
  );
}

function ReviewText({ text }: { text?: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const content = text?.trim() ?? "";
  const shouldTruncate = content.length > 200;

  if (!content) {
    return <span className="text-sm italic opacity-50">No review text</span>;
  }

  if (!shouldTruncate || expanded) {
    return (
      <div className="text-sm opacity-80">
        {content}
        {shouldTruncate && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="link link-primary ml-1 text-xs font-medium no-underline hover:underline"
          >
            Show less
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="text-sm opacity-80">
      {content.slice(0, 200)}…
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="link link-primary ml-1 text-xs font-medium no-underline hover:underline"
      >
        Show more
      </button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export interface ReviewsTableProps {
  reviews: Review[];
  isLoading?: boolean;
}

export function ReviewsTable({ reviews, isLoading }: ReviewsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-6 py-4">Consumer</TableHead>
          <TableHead className="px-6 py-4">Partner</TableHead>
          <TableHead className="px-6 py-4">Rating</TableHead>
          <TableHead className="min-w-[300px] px-6 py-4">Review</TableHead>
          <TableHead className="px-6 py-4">Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: 6 }, (_, i) => (
            <TableRow key={i}>
              {Array.from({ length: 5 }, (_, j) => (
                <TableCell key={j} className="px-6 py-4">
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : reviews.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={5}
              className="py-16 text-center opacity-60"
            >
              No reviews match the current filters.
            </TableCell>
          </TableRow>
        ) : (
          reviews.map((review) => (
            <TableRow key={review.id}>
              <TableCell className="px-6 py-4">
                {review.consumerName ? (
                  <Link
                    href={`/customers/${review.consumerId}`}
                    className="text-sm font-medium transition-colors hover:text-primary"
                  >
                    {review.consumerName}
                  </Link>
                ) : (
                  <span className="text-sm italic opacity-50">Unknown customer</span>
                )}
              </TableCell>
              <TableCell className="px-6 py-4">
                {review.partnerName ? (
                  <Link
                    href={`/partners/${review.partnerId}`}
                    className="text-sm transition-colors hover:text-primary"
                  >
                    {review.partnerName}
                  </Link>
                ) : (
                  <span className="text-sm italic opacity-50">Unknown partner</span>
                )}
              </TableCell>
              <TableCell className="px-6 py-4">
                <StarRating rating={review.rating} />
              </TableCell>
              <TableCell className="px-6 py-4">
                <ReviewText text={review.text} />
              </TableCell>
              <TableCell className="px-6 py-4">
                <span className="font-mono text-sm">
                  {dateShort(review.createdAt)}
                </span>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
