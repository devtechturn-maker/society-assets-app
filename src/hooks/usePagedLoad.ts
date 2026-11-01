import { useCallback, useEffect, useRef, useState } from 'react';

export const PAGE_SIZE = 50;

/**
 * Loads a newest-first list one page at a time. `loadMore` appends the next page; rows are de-duplicated by `key`,
 * and when a page brings nothing new (or comes back short) there is nothing more to load.
 */
export function usePagedLoad<T>(loader: (page: number, size: number) => Promise<T[]>, key: (row: T) => string) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextPage = useRef(0);
  const rows = useRef<T[]>([]);

  const loadFirst = useCallback(async () => {
    setError(null);
    try {
      const page = await loader(0, PAGE_SIZE);
      rows.current = page;
      nextPage.current = 1;
      setData(page);
      setHasMore(page.length >= PAGE_SIZE);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    void loadFirst();
  }, [loadFirst]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await loader(nextPage.current, PAGE_SIZE);
      const seen = new Set(rows.current.map(key));
      const fresh = page.filter((row) => !seen.has(key(row)));
      rows.current = [...rows.current, ...fresh];
      nextPage.current += 1;
      setData(rows.current);
      setHasMore(page.length >= PAGE_SIZE && fresh.length > 0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, hasMore]);

  return { data, loading, refreshing, loadingMore, hasMore, error, refresh, loadMore };
}
