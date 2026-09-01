export type PaginationItem = number | "ellipsis";

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

export function getPaginationItems(
  current: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 0) return [];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages]);
  for (let page = current - 1; page <= current + 1; page += 1) {
    if (page >= 1 && page <= totalPages) pages.add(page);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const items: PaginationItem[] = [];
  let previous = 0;

  for (const page of sorted) {
    if (previous > 0 && page - previous > 1) {
      items.push("ellipsis");
    }
    items.push(page);
    previous = page;
  }

  return items;
}

export function getShowingRange(
  page: number,
  pageSize: number,
  totalCount: number,
): { start: number; end: number } {
  if (totalCount === 0) {
    return { start: 0, end: 0 };
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  return { start, end };
}

function singularLabel(label: string): string {
  if (label === "entries") return "entry";
  if (label.endsWith("ies")) return `${label.slice(0, -3)}y`;
  if (label.endsWith("s")) return label.slice(0, -1);
  return label;
}

export function formatShowingLabel(
  page: number,
  pageSize: number,
  totalCount: number,
  itemLabel = "entries",
): string {
  const { start, end } = getShowingRange(page, pageSize, totalCount);
  const noun = totalCount === 1 ? singularLabel(itemLabel) : itemLabel;
  return `Showing ${start}–${end} of ${totalCount} ${noun}`;
}
