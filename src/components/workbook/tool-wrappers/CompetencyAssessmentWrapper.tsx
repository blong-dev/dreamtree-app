'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { CompetencyAssessment, CompetencyAssessmentData, Competency } from '@/components/tools';
import { useToolSave } from '@/hooks/useToolSave';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

const DEFAULT_DATA: CompetencyAssessmentData = { scores: [] };

export const CompetencyAssessmentWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function CompetencyAssessmentWrapper({
  stemId,
  connectionId,
  onComplete,
  initialData,
  readOnly = false,
}, ref) { // code_id:371
  const [data, setData] = useState<CompetencyAssessmentData>(DEFAULT_DATA);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // BUG-380: Load initialData for read-only mode
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        setData({ ...DEFAULT_DATA, ...parsed });
      } catch (err) {
        console.error('[CompetencyAssessmentWrapper] Failed to parse initialData:', err);
      }
    }
  }, [initialData]);

  // BUG-427: Fetch connected data (prior competency scores)
  useEffect(() => {
    if (!connectionId || readOnly || initialData) return;

    fetch(`/api/data/connection?connectionId=${connectionId}`)
      .then(res => res.json())
      .then(result => {
        if (result.isEmpty || !result.data) return;
        // Connection data could be prior competency scores
        const connData = result.data;
        if (connData?.scores && Array.isArray(connData.scores)) {
          setData(prev => ({ ...prev, scores: connData.scores }));
        }
      })
      .catch(err => console.error('[CompetencyAssessmentWrapper] Failed to load connection data:', err));
  }, [connectionId, readOnly, initialData]);

  // Fetch competencies (skip in read-only mode if we have initialData)
  useEffect(() => {
    if (competencies.length > 0) return;
    if (readOnly) return; // Don't fetch competencies list for read-only display

    setDataLoading(true);
    setDataError(null);
    fetch('/api/data/competencies')
      .then(res => res.json())
      .then(result => {
        if (result.competencies) setCompetencies(result.competencies);
      })
      .catch(err => {
        console.error('[CompetencyAssessmentWrapper] Failed to load competencies:', err);
        setDataError('Failed to load competencies. Tap to retry.');
      })
      .finally(() => setDataLoading(false));
  }, [competencies.length, readOnly]);

  const getData = useCallback(() => data, [data]);

  const { isLoading, error, save } = useToolSave({
    stemId,
    getData,
    onComplete,
  });

  // Check if tool has valid input (at least one competency scored)
  const isValid = useCallback(() => data.scores.length > 0, [data.scores]);

  // Expose save and isValid methods to parent via ref
  useImperativeHandle(ref, () => ({
    save: async () => {
      await save();
    },
    isValid,
  }), [save, isValid]);

  const handleRetry = useCallback(() => {
    setDataError(null);
    setCompetencies([]);
  }, []);

  if (readOnly) {
    return (
      <div className="tool-completed-view">
        <CompetencyAssessment data={data} onChange={() => {}} competencies={[]} />
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="tool-embed-error-state">
        <p>{dataError}</p>
        <button className="button button-secondary" onClick={handleRetry}>Retry</button>
      </div>
    );
  }

  if (dataLoading) {
    return <div className="tool-embed-loading">Loading competencies...</div>;
  }

  return (
    <>
      <CompetencyAssessment
        data={data}
        onChange={setData}
        competencies={competencies}
      />
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isLoading && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
