import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { usePagination } from "./usePagination";

describe("usePagination", () => {
  it("initializes with page 1 and correct defaults", () => {
    const { result } = renderHook(() =>
      usePagination({ totalCount: 50 })
    );

    expect(result.current.page).toBe(1);
    expect(result.current.offset).toBe(0);
    expect(result.current.limit).toBe(10);
    expect(result.current.totalPages).toBe(5);
  });

  it("computes offset as (page - 1) * pageSize", () => {
    const { result } = renderHook(() =>
      usePagination({ totalCount: 100, pageSize: 10 })
    );

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.offset).toBe(20);
  });

  it("computes totalPages with Math.ceil and minimum 1", () => {
    const { result: r1 } = renderHook(() =>
      usePagination({ totalCount: 0 })
    );
    expect(r1.current.totalPages).toBe(1);

    const { result: r2 } = renderHook(() =>
      usePagination({ totalCount: 15, pageSize: 10 })
    );
    expect(r2.current.totalPages).toBe(2);

    const { result: r3 } = renderHook(() =>
      usePagination({ totalCount: 10, pageSize: 10 })
    );
    expect(r3.current.totalPages).toBe(1);
  });

  it("clamps setPage to [1, totalPages]", () => {
    const { result } = renderHook(() =>
      usePagination({ totalCount: 30, pageSize: 10 })
    );

    act(() => {
      result.current.setPage(0);
    });
    expect(result.current.page).toBe(1);

    act(() => {
      result.current.setPage(99);
    });
    expect(result.current.page).toBe(3);
  });

  it("nextPage increments when not on last page", () => {
    const { result } = renderHook(() =>
      usePagination({ totalCount: 30, pageSize: 10 })
    );

    act(() => {
      result.current.nextPage();
    });
    expect(result.current.page).toBe(2);

    act(() => {
      result.current.nextPage();
    });
    expect(result.current.page).toBe(3);

    // On last page, should not increment
    act(() => {
      result.current.nextPage();
    });
    expect(result.current.page).toBe(3);
  });

  it("prevPage decrements when not on first page", () => {
    const { result } = renderHook(() =>
      usePagination({ totalCount: 30, pageSize: 10 })
    );

    act(() => {
      result.current.setPage(3);
    });

    act(() => {
      result.current.prevPage();
    });
    expect(result.current.page).toBe(2);

    act(() => {
      result.current.prevPage();
    });
    expect(result.current.page).toBe(1);

    // On first page, should not decrement
    act(() => {
      result.current.prevPage();
    });
    expect(result.current.page).toBe(1);
  });

  it("resetToFirst sets page to 1", () => {
    const { result } = renderHook(() =>
      usePagination({ totalCount: 50, pageSize: 10 })
    );

    act(() => {
      result.current.setPage(4);
    });
    expect(result.current.page).toBe(4);

    act(() => {
      result.current.resetToFirst();
    });
    expect(result.current.page).toBe(1);
  });

  it("displays correct text for page 1", () => {
    const { result } = renderHook(() =>
      usePagination({ totalCount: 25, pageSize: 10 })
    );

    expect(result.current.displayText).toBe("SHOWING 1–10 OF 25 ENTRIES");
  });

  it("displays correct text for last page with partial results", () => {
    const { result } = renderHook(() =>
      usePagination({ totalCount: 25, pageSize: 10 })
    );

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.displayText).toBe("SHOWING 21–25 OF 25 ENTRIES");
  });

  it("displays 0 TO 0 OF 0 ENTRIES when totalCount is 0", () => {
    const { result } = renderHook(() =>
      usePagination({ totalCount: 0, pageSize: 10 })
    );

    expect(result.current.displayText).toBe("SHOWING 0–0 OF 0 ENTRIES");
  });

  it("uses custom pageSize", () => {
    const { result } = renderHook(() =>
      usePagination({ totalCount: 100, pageSize: 25 })
    );

    expect(result.current.limit).toBe(25);
    expect(result.current.pageSize).toBe(25);
    expect(result.current.totalPages).toBe(4);
    expect(result.current.displayText).toBe("SHOWING 1–25 OF 100 ENTRIES");
  });

  it("updates page size and resets to page 1", () => {
    const { result } = renderHook(() =>
      usePagination({ totalCount: 100, pageSize: 10 })
    );

    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.page).toBe(3);

    act(() => {
      result.current.setPageSize(25);
    });

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(25);
    expect(result.current.limit).toBe(25);
  });

  it("jumps to first and last pages", () => {
    const { result } = renderHook(() =>
      usePagination({ totalCount: 100, pageSize: 10 })
    );

    act(() => {
      result.current.goToLast();
    });
    expect(result.current.page).toBe(10);

    act(() => {
      result.current.goToFirst();
    });
    expect(result.current.page).toBe(1);
  });

  it("exposes range metadata", () => {
    const { result } = renderHook(() =>
      usePagination({ totalCount: 25, pageSize: 10 })
    );

    expect(result.current.rangeStart).toBe(1);
    expect(result.current.rangeEnd).toBe(10);
    expect(result.current.hasMultiplePages).toBe(true);
  });
});
