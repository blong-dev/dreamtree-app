'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Options for the useConnectionData hook
 */
export interface UseConnectionDataOptions<T> {
  /** Connection ID for fetching data from the connection endpoint */
  connectionId: number | null;
  /** Pre-populated data for completed tools in history */
  initialData?: string;
  /** Read-only mode for completed tools in history */
  readOnly?: boolean;
  /** Counter to trigger data refetch (for Part B responsiveness to Part A edits) */
  refreshTrigger?: number;
  /** Parse initialData JSON string to the data type */
  parseInitialData: (json: string) => T | null;
  /** Transform raw connection API response data to the expected type */
  transformConnectionData: (data: unknown[]) => T;
  /** Optional fallback fetch when connection is empty or not provided */
  fallbackFetch?: () => Promise<T | null>;
  /** Merge fresh data with existing data to preserve user's work-in-progress */
  mergeWithExisting?: (existing: T, fresh: T) => T;
  /** Default value when no data is available */
  defaultValue: T;
}

/**
 * Result from the useConnectionData hook
 */
export interface UseConnectionDataResult<T> {
  /** The current data */
  data: T;
  /** Set the data (for user modifications) */
  setData: (data: T | ((prev: T) => T)) => void;
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Trigger a manual refresh */
  refresh: () => void;
}

/**
 * Shared hook for fetching and refreshing connection data with cache-busting
 * and preservation of user's work-in-progress.
 *
 * This hook encapsulates the refresh pattern used by consumer tools (Part B)
 * that depend on source tools (Part A). When refreshTrigger changes, it refetches
 * data while preserving any work the user has done in the current tool.
 *
 * @example
 * ```tsx
 * const { data, setData, isLoading } = useConnectionData({
 *   connectionId,
 *   initialData,
 *   readOnly,
 *   refreshTrigger,
 *   parseInitialData: (json) => {
 *     const parsed = JSON.parse(json);
 *     return parsed.items ?? null;
 *   },
 *   transformConnectionData: (data) => data.map(item => ({ ...item, selected: false })),
 *   mergeWithExisting: (existing, fresh) => {
 *     const existingMap = new Map(existing.map(e => [e.id, e]));
 *     return fresh.map(f => existingMap.get(f.id) ?? f);
 *   },
 *   defaultValue: [],
 * });
 * ```
 */
export function useConnectionData<T>({
  connectionId,
  initialData,
  readOnly = false,
  refreshTrigger,
  parseInitialData,
  transformConnectionData,
  fallbackFetch,
  mergeWithExisting,
  defaultValue,
}: UseConnectionDataOptions<T>): UseConnectionDataResult<T> {
  const [data, setData] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  // Track the last refreshTrigger we fetched for (to detect changes)
  const lastRefreshRef = useRef<number | undefined>(refreshTrigger);
  // Store current data for preserving user work on refresh
  const dataRef = useRef<T>(data);
  dataRef.current = data;
  // Track if we've done initial load
  const hasLoadedRef = useRef(false);

  // Fetch data from connection endpoint with cache-busting
  const fetchConnectionData = useCallback(async (): Promise<T | null> => {
    if (!connectionId) return null;

    try {
      const res = await fetch(`/api/data/connection?connectionId=${connectionId}&_t=${Date.now()}`, {
        cache: 'no-store',
      });
      const result = await res.json();

      if (!result.isEmpty && result.data && Array.isArray(result.data)) {
        return transformConnectionData(result.data);
      }
    } catch (err) {
      console.error('[useConnectionData] Failed to fetch connection data:', err);
    }

    return null;
  }, [connectionId, transformConnectionData]);

  // Main data loading effect
  useEffect(() => {
    const shouldRefetch = refreshTrigger !== undefined && refreshTrigger !== lastRefreshRef.current;

    // Update ref if we're going to refetch
    if (shouldRefetch) {
      lastRefreshRef.current = refreshTrigger;
    }

    // Use initialData on first load (not a refresh)
    if (initialData && !shouldRefetch && !hasLoadedRef.current) {
      try {
        const parsed = parseInitialData(initialData);
        if (parsed !== null) {
          setData(parsed);
          hasLoadedRef.current = true;
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error('[useConnectionData] Failed to parse initialData:', err);
      }
    }

    // Skip fetching for read-only mode on initial load
    if (readOnly && !shouldRefetch) {
      hasLoadedRef.current = true;
      setIsLoading(false);
      return;
    }

    // Fetch fresh data
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Try connection first
        let freshData = await fetchConnectionData();

        // Try fallback if connection didn't return data
        if (freshData === null && fallbackFetch) {
          freshData = await fallbackFetch();
        }

        if (freshData !== null) {
          // Merge with existing data to preserve user's work-in-progress
          if (mergeWithExisting && hasLoadedRef.current) {
            const merged = mergeWithExisting(dataRef.current, freshData);
            setData(merged);
          } else {
            setData(freshData);
          }
        }

        hasLoadedRef.current = true;
      } catch (err) {
        console.error('[useConnectionData] Failed to load data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch on initial load or when refresh is triggered
    if (!hasLoadedRef.current || shouldRefetch) {
      fetchData();
    }
  }, [connectionId, initialData, readOnly, refreshTrigger, parseInitialData, fetchConnectionData, fallbackFetch, mergeWithExisting]);

  // Manual refresh function
  const refresh = useCallback(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        let freshData = await fetchConnectionData();

        if (freshData === null && fallbackFetch) {
          freshData = await fallbackFetch();
        }

        if (freshData !== null) {
          if (mergeWithExisting) {
            const merged = mergeWithExisting(dataRef.current, freshData);
            setData(merged);
          } else {
            setData(freshData);
          }
        }
      } catch (err) {
        console.error('[useConnectionData] Failed to refresh data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [fetchConnectionData, fallbackFetch, mergeWithExisting]);

  return { data, setData, isLoading, refresh };
}
