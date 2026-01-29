'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { CareerAssessment, CareerAssessmentData } from '@/components/tools';
import { useToolSave } from '@/hooks/useToolSave';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

const DEFAULT_DATA: CareerAssessmentData = { options: [] };

export const CareerAssessmentWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function CareerAssessmentWrapper({
  stemId,
  connectionId,
  onComplete,
  initialData,
  readOnly = false,
}, ref) { // code_id:369
  const [data, setData] = useState<CareerAssessmentData>(DEFAULT_DATA);

  // BUG-380: Load initialData for read-only mode
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        setData({ ...DEFAULT_DATA, ...parsed });
      } catch (err) {
        console.error('[CareerAssessmentWrapper] Failed to parse initialData:', err);
      }
    }
  }, [initialData]);

  // BUG-427: Fetch connected data (career options from prior exercises)
  useEffect(() => {
    if (!connectionId || readOnly || initialData) return;

    fetch(`/api/data/connection?connectionId=${connectionId}`)
      .then(res => res.json())
      .then(result => {
        if (result.isEmpty || !result.data) return;
        // Connection data could be career options from prior list/ranking exercises
        const options = Array.isArray(result.data)
          ? result.data.map((item: { id?: string; name?: string; value?: string }, i: number) => ({
              id: item.id || `option-${i}`,
              name: item.name || item.value || '',
              coherence: 3,
              workNeeds: 3,
              lifeNeeds: 3,
              unknowns: 3,
              rank: null,
              notes: '',
            }))
          : [];
        if (options.length > 0) {
          setData({ options });
        }
      })
      .catch(err => console.error('[CareerAssessmentWrapper] Failed to load connection data:', err));
  }, [connectionId, readOnly, initialData]);

  const getData = useCallback(() => data, [data]);

  const { isLoading, error, save } = useToolSave({
    stemId,
    getData,
    onComplete,
  });

  // Check if tool has valid input (at least one career option assessed)
  const isValid = useCallback(() => data.options.length > 0, [data.options]);

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
        <CareerAssessment data={data} onChange={() => {}} />
      </div>
    );
  }

  return (
    <>
      <CareerAssessment data={data} onChange={setData} />
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isLoading && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
