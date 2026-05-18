/**
 * Pagination utility for event lists.
 * Provides generic pagination with correct slicing, hasMore flag, and total count.
 */

/**
 * Result of paginating an array of items.
 */
export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Paginates an array of items, returning the correct slice for the given page.
 *
 * @param events - The full array of items to paginate
 * @param page - The page number (≥ 1)
 * @param pageSize - Number of items per page (default 20)
 * @returns An object with the paginated items, total count, page info, and hasMore flag
 */
export function paginateEvents<T>(
  events: T[],
  page: number,
  pageSize: number = 20
): PaginationResult<T> {
  const total = events.length;
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const items = events.slice(startIndex, endIndex);
  const hasMore = endIndex < total;

  return {
    items,
    total,
    page,
    pageSize,
    hasMore,
  };
}
