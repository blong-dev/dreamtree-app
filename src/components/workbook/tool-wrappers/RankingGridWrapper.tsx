'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { RankingGrid, RankingItem, Comparison } from '@/components/tools';
import { useToolSave } from '@/hooks/useToolSave';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

export const RankingGridWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function RankingGridWrapper({
  stemId,
  connectionId,
  onComplete,
  initialData,
  readOnly = false,
  refreshTrigger,
  onDataChange,
}, ref) { // code_id:379
  const [items, setItems] = useState<RankingItem[]>([]);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);

  // Track the last refreshTrigger we fetched for (to detect changes)
  const lastRefreshRef = useRef<number | undefined>(refreshTrigger);
  // Store current items and comparisons for preserving on refresh
  const itemsRef = useRef<RankingItem[]>(items);
  const comparisonsRef = useRef<Comparison[]>(comparisons);
  itemsRef.current = items;
  comparisonsRef.current = comparisons;

  // BUG-380: Load initialData for read-only mode
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        if (parsed.items) setItems(parsed.items);
        if (parsed.comparisons) setComparisons(parsed.comparisons);
      } catch (err) {
        console.error('[RankingGridWrapper] Failed to parse initialData:', err);
      }
    }
  }, [initialData]);

  // Fetch connected data if provided - with refresh support
  useEffect(() => {
    if (!connectionId || initialData) return;

    const shouldRefetch = refreshTrigger !== undefined && refreshTrigger !== lastRefreshRef.current;

    // Update ref if we're going to refetch
    if (shouldRefetch) {
      lastRefreshRef.current = refreshTrigger;
    }

    // Skip fetch for read-only unless it's a refresh
    if (readOnly && !shouldRefetch) return;

    // Fetch fresh data from connection
    const fetchConnectionData = async () => {
      try {
        const res = await fetch(`/api/data/connection?connectionId=${connectionId}&_t=${Date.now()}`, {
          cache: 'no-store',
        });
        const result = await res.json();
        if (result.isEmpty || !result.data || !Array.isArray(result.data)) return;

        const freshItems = result.data.map((item: { id?: string; value?: string; name?: string; rank?: number }, i: number) => ({
          id: item.id || `connected-${i}`,
          value: item.value || item.name || '',
          rank: undefined as number | undefined, // Fresh items start unranked
        }));

        // If this is a refresh, preserve ranks for items that still exist
        if (shouldRefetch) {
          const existingRankMap = new Map(itemsRef.current.map(item => [item.id, item.rank]));
          const existingValueRankMap = new Map(itemsRef.current.map(item => [item.value, item.rank]));

          const mergedItems = freshItems.map((item: RankingItem) => ({
            ...item,
            // Try to preserve rank by ID first, then by value
            rank: existingRankMap.get(item.id) ?? existingValueRankMap.get(item.value) ?? item.rank,
          }));

          // Filter comparisons to only include items that still exist
          const freshItemIds = new Set(freshItems.map((item: RankingItem) => item.id));
          const validComparisons = comparisonsRef.current.filter(
            comp => freshItemIds.has(comp.winnerId) && freshItemIds.has(comp.loserId)
          );

          setItems(mergedItems);
          setComparisons(validComparisons);
        } else {
          setItems(freshItems);
        }
      } catch (err) {
        console.error('[RankingGridWrapper] Failed to load connection data:', err);
      }
    };

    fetchConnectionData();
  }, [connectionId, readOnly, initialData, refreshTrigger]);

  const handleCompare = useCallback((winnerId: string, loserId: string) => {
    setComparisons(prev => [...prev, { winnerId, loserId }]);
  }, []);

  const handleComplete = useCallback((ranked: RankingItem[]) => {
    setItems(ranked);
  }, []);

  const getData = useCallback(() => ({ items, comparisons }), [items, comparisons]);

  const { isLoading, error, save } = useToolSave({
    stemId,
    getData,
    onComplete,
    onDataChange,
  });

  // Check if tool has valid input (items exist and have been ranked)
  const isValid = useCallback(() => {
    // Valid if there are items and they have ranks assigned
    return items.length > 0 && items.every(item => item.rank !== undefined && item.rank !== null);
  }, [items]);

  // Expose save and isValid methods to parent via ref
  useImperativeHandle(ref, () => ({
    save: async () => {
      await save();
    },
    isValid,
  }), [save, isValid]);

  if (readOnly) {
    return (
      <div className="tool-completed-view">
        <RankingGrid
          items={items}
          comparisons={comparisons}
          onCompare={() => {}}
          onComplete={() => {}}
          label="Ranked items"
        />
      </div>
    );
  }

  return (
    <>
      <RankingGrid
        items={items}
        comparisons={comparisons}
        onCompare={handleCompare}
        onComplete={handleComplete}
        label="Rank these items"
      />
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isLoading && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
