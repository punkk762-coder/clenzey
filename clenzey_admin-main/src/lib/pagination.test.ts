import { describe, expect, it } from "vitest";

import {
  formatShowingLabel,
  getPaginationItems,
  getShowingRange,
} from "./pagination";

describe("getPaginationItems", () => {
  it("returns empty array when there are no pages", () => {
    expect(getPaginationItems(1, 0)).toEqual([]);
  });

  it("returns all pages when total is seven or fewer", () => {
    expect(getPaginationItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("inserts ellipses for large page counts", () => {
    expect(getPaginationItems(8, 20)).toEqual([
      1,
      "ellipsis",
      7,
      8,
      9,
      "ellipsis",
      20,
    ]);
  });

  it("shows compact range near the start", () => {
    expect(getPaginationItems(2, 20)).toEqual([1, 2, 3, "ellipsis", 20]);
  });

  it("shows compact range near the end", () => {
    expect(getPaginationItems(19, 20)).toEqual([1, "ellipsis", 18, 19, 20]);
  });
});

describe("getShowingRange", () => {
  it("returns zero range for empty datasets", () => {
    expect(getShowingRange(1, 10, 0)).toEqual({ start: 0, end: 0 });
  });

  it("returns the correct range for middle pages", () => {
    expect(getShowingRange(3, 10, 45)).toEqual({ start: 21, end: 30 });
  });

  it("caps the end range on the final page", () => {
    expect(getShowingRange(5, 10, 45)).toEqual({ start: 41, end: 45 });
  });
});

describe("formatShowingLabel", () => {
  it("uses singular labels for one result", () => {
    expect(formatShowingLabel(1, 10, 1, "bookings")).toBe(
      "Showing 1–1 of 1 booking",
    );
  });

  it("uses plural labels for multiple results", () => {
    expect(formatShowingLabel(2, 10, 25, "reviews")).toBe(
      "Showing 11–20 of 25 reviews",
    );
  });
});
