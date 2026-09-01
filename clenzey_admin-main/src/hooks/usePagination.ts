"use client";

import { useState, useCallback, useMemo, useEffect } from "react";

import {
  DEFAULT_PAGE_SIZE_OPTIONS,
  formatShowingLabel,
  getShowingRange,
} from "@/lib/pagination";

export interface UsePaginationOptions {
  totalCount: number;
  pageSize?: number;
  pageSizeOptions?: readonly number[];
}

export interface UsePaginationReturn {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  hasMultiplePages: boolean;
  canChangePageSize: boolean;
  pageSizeOptions: readonly number[];
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToFirst: () => void;
  goToLast: () => void;
  resetToFirst: () => void;
  displayText: string;
}

export function usePagination(options: UsePaginationOptions): UsePaginationReturn {
  const {
    totalCount,
    pageSize: initialPageSize = 10,
    pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  } = options;

  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalPages = useMemo(
    () => (totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize],
  );

  const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize]);
  const limit = pageSize;
  const { start: rangeStart, end: rangeEnd } = useMemo(
    () => getShowingRange(page, pageSize, totalCount),
    [page, pageSize, totalCount],
  );

  useEffect(() => {
    if (totalPages === 0) {
      if (page !== 1) setPageState(1);
      return;
    }
    if (page > totalPages) {
      setPageState(totalPages);
    }
  }, [page, totalPages]);

  const setPage = useCallback(
    (newPage: number) => {
      if (totalPages === 0) {
        setPageState(1);
        return;
      }
      const clamped = Math.min(Math.max(1, newPage), totalPages);
      setPageState(clamped);
    },
    [totalPages],
  );

  const setPageSize = useCallback((newPageSize: number) => {
    setPageSizeState(newPageSize);
    setPageState(1);
  }, []);

  const nextPage = useCallback(() => {
    setPageState((current) =>
      totalPages === 0 || current >= totalPages ? current : current + 1,
    );
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPageState((current) => (current > 1 ? current - 1 : current));
  }, []);

  const goToFirst = useCallback(() => {
    setPageState(1);
  }, []);

  const goToLast = useCallback(() => {
    setPageState(totalPages > 0 ? totalPages : 1);
  }, [totalPages]);

  const resetToFirst = useCallback(() => {
    setPageState(1);
  }, []);

  const displayText = useMemo(
    () => formatShowingLabel(page, pageSize, totalCount).toUpperCase(),
    [page, pageSize, totalCount],
  );

  return {
    page,
    pageSize,
    offset,
    limit,
    totalPages: totalPages || 1,
    rangeStart,
    rangeEnd,
    hasMultiplePages: totalPages > 1,
    canChangePageSize: pageSizeOptions.length > 1,
    pageSizeOptions,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    goToFirst,
    goToLast,
    resetToFirst,
    displayText,
  };
}
