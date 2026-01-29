'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { BucketingTool, BucketingToolData } from '@/components/tools';
import { useToolSave } from '@/hooks/useToolSave';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

const DEFAULT_DATA: BucketingToolData = {
  items: [],
  bucketLabels: ['Most Used', 'Often Used', 'Sometimes', 'Rarely', 'Least Used'],
};

export const BucketingToolWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function BucketingToolWrapper({
  stemId,
  connectionId,
  onComplete,
  initialData,
  readOnly = false,
}, ref) { // code_id:367
  const [data, setData] = useState<BucketingToolData>(DEFAULT_DATA);

  // BUG-380: Load initialData for read-only mode
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        setData({ ...DEFAULT_DATA, ...parsed });
      } catch (err) {
        console.error('[BucketingToolWrapper] Failed to parse initialData:', err);
      }
    }
  }, [initialData]);

  // BUG-427: Fetch connected data (items to bucket)
  useEffect(() => {
    if (!connectionId || readOnly || initialData) return;

    fetch(`/api/data/connection?connectionId=${connectionId}`)
      .then(res => res.json())
      .then(result => {
        if (result.isEmpty || !result.data) return;
        // Connection data could be items to bucket (e.g., skills, activities)
        const items = Array.isArray(result.data)
          ? result.data.map((item: { id?: string; name?: string; value?: string }, i: number) => ({
              id: item.id || `item-${i}`,
              value: item.name || item.value || '',
              bucket: null,
            }))
          : [];
        if (items.length > 0) {
          setData(prev => ({ ...prev, items }));
        }
      })
      .catch(err => console.error('[BucketingToolWrapper] Failed to load connection data:', err));
  }, [connectionId, readOnly, initialData]);

  const getData = useCallback(() => data, [data]);

  const { isLoading, error, save } = useToolSave({
    stemId,
    getData,
    onComplete,
  });

  // Check if tool has valid input (all items have been placed in buckets)
  const isValid = useCallback(() => {
    return data.items.length > 0 && data.items.every(item => item.bucketIndex !== null);
  }, [data.items]);

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
        <BucketingTool data={data} onChange={() => {}} />
      </div>
    );
  }

  return (
    <>
      <BucketingTool data={data} onChange={setData} />
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isLoading && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
