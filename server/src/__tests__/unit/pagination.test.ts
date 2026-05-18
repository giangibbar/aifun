import { describe, it, expect } from 'vitest';
import { paginateEvents } from '../../utils/pagination.js';

describe('paginateEvents', () => {
  const items = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));

  it('returns the first page with default pageSize of 20', () => {
    const result = paginateEvents(items, 1);
    expect(result.items).toHaveLength(20);
    expect(result.items[0]).toEqual({ id: 1 });
    expect(result.items[19]).toEqual({ id: 20 });
    expect(result.total).toBe(50);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.hasMore).toBe(true);
  });

  it('returns the second page correctly', () => {
    const result = paginateEvents(items, 2);
    expect(result.items).toHaveLength(20);
    expect(result.items[0]).toEqual({ id: 21 });
    expect(result.items[19]).toEqual({ id: 40 });
    expect(result.hasMore).toBe(true);
  });

  it('returns the last page with hasMore = false', () => {
    const result = paginateEvents(items, 3);
    expect(result.items).toHaveLength(10);
    expect(result.items[0]).toEqual({ id: 41 });
    expect(result.items[9]).toEqual({ id: 50 });
    expect(result.hasMore).toBe(false);
  });

  it('returns empty items for a page beyond available data', () => {
    const result = paginateEvents(items, 10);
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(50);
    expect(result.hasMore).toBe(false);
  });

  it('handles an empty array', () => {
    const result = paginateEvents([], 1);
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(result.hasMore).toBe(false);
  });

  it('uses custom pageSize', () => {
    const result = paginateEvents(items, 1, 10);
    expect(result.items).toHaveLength(10);
    expect(result.items[0]).toEqual({ id: 1 });
    expect(result.items[9]).toEqual({ id: 10 });
    expect(result.pageSize).toBe(10);
    expect(result.hasMore).toBe(true);
  });

  it('returns hasMore = false when items exactly fill the page', () => {
    const exactItems = Array.from({ length: 20 }, (_, i) => ({ id: i + 1 }));
    const result = paginateEvents(exactItems, 1);
    expect(result.items).toHaveLength(20);
    expect(result.hasMore).toBe(false);
  });

  it('works with generic types', () => {
    const strings = ['a', 'b', 'c', 'd', 'e'];
    const result = paginateEvents(strings, 1, 3);
    expect(result.items).toEqual(['a', 'b', 'c']);
    expect(result.hasMore).toBe(true);
    expect(result.total).toBe(5);
  });
});
