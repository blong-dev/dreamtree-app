'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { LifeDashboard, LifeDashboardData } from '@/components/tools';
import { useToolSave } from '@/hooks/useToolSave';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

export const LifeDashboardWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function LifeDashboardWrapper({
  stemId,
  connectionId,
  onComplete,
  initialData,
  readOnly = false,
}, ref) { // code_id:375
  const [data, setData] = useState<LifeDashboardData>({
    work: null,
    play: null,
    love: null,
    health: null,
  });

  // BUG-380: Load initialData for read-only mode
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        setData({ work: null, play: null, love: null, health: null, ...parsed });
      } catch (err) {
        console.error('[LifeDashboardWrapper] Failed to parse initialData:', err);
      }
    }
  }, [initialData]);

  // BUG-427: Fetch connected data (prior life dashboard scores)
  useEffect(() => {
    if (!connectionId || readOnly || initialData) return;

    fetch(`/api/data/connection?connectionId=${connectionId}`)
      .then(res => res.json())
      .then(result => {
        if (result.isEmpty || !result.data) return;
        // Connection data could be prior life dashboard scores
        const connData = result.data;
        if (connData && typeof connData === 'object') {
          setData(prev => ({ ...prev, ...connData }));
        }
      })
      .catch(err => console.error('[LifeDashboardWrapper] Failed to load connection data:', err));
  }, [connectionId, readOnly, initialData]);

  const getData = useCallback(() => data, [data]);

  const { isLoading, error, save } = useToolSave({
    stemId,
    getData,
    onComplete,
  });

  // Expose save method to parent via ref
  useImperativeHandle(ref, () => ({
    save: async () => {
      await save();
    }
  }), [save]);

  if (readOnly) {
    return (
      <div className="tool-completed-view">
        <LifeDashboard data={data} onChange={() => {}} />
      </div>
    );
  }

  return (
    <>
      <LifeDashboard data={data} onChange={setData} />
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isLoading && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
