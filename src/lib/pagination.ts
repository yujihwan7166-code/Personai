export function buildPageNumbers(page: number, totalPages: number, maxVisible = 5) {
  const safeTotal = Math.max(1, Math.floor(totalPages));
  const safeMax = Math.max(1, Math.floor(maxVisible));
  const safePage = Math.min(safeTotal, Math.max(1, Math.floor(page)));
  const visibleCount = Math.min(safeMax, safeTotal);
  const halfWindow = Math.floor(visibleCount / 2);
  const start = Math.min(
    Math.max(1, safePage - halfWindow),
    Math.max(1, safeTotal - visibleCount + 1),
  );

  return Array.from({ length: visibleCount }, (_, index) => start + index);
}
