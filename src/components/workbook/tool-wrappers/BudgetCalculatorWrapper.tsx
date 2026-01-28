'use client';

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { BudgetCalculator, BudgetCalculatorData, DEFAULT_EXPENSES } from '@/components/tools';
import { useToolSave } from '@/hooks/useToolSave';
import type { ToolWrapperProps, ToolWrapperRef } from './types';

const DEFAULT_DATA: BudgetCalculatorData = {
  grossMonthlyIncome: 0,
  grossYearlyIncome: 0,
  incomeInputMode: 'yearly',
  filingStatus: 'single',
  stateCode: null,
  expenses: DEFAULT_EXPENSES,
  notes: '',
};

export const BudgetCalculatorWrapper = forwardRef<ToolWrapperRef, ToolWrapperProps>(function BudgetCalculatorWrapper({
  stemId,
  onComplete,
  initialData,
  readOnly = false,
}, ref) { // code_id:368
  const [data, setData] = useState<BudgetCalculatorData>(DEFAULT_DATA);

  // BUG-380: Load initialData for read-only mode
  useEffect(() => {
    if (initialData) {
      try {
        const parsed = JSON.parse(initialData);
        setData({ ...DEFAULT_DATA, ...parsed });
      } catch (err) {
        console.error('[BudgetCalculatorWrapper] Failed to parse initialData:', err);
      }
    }
  }, [initialData]);

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
        <BudgetCalculator data={data} onChange={() => {}} />
      </div>
    );
  }

  return (
    <>
      <BudgetCalculator data={data} onChange={setData} />
      {error && <div className="tool-embed-error"><p>{error}</p></div>}
      {isLoading && <div className="tool-embed-saving">Saving...</div>}
    </>
  );
});
