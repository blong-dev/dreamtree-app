'use client';

import { useState, useEffect, useCallback } from 'react';
import { BudgetCalculatorData, ExpenseItem, FilingStatus } from './types';
import { Select, Checkbox, TextArea } from '../forms';

interface BudgetCalculatorProps {
  data: BudgetCalculatorData;
  onChange: (data: BudgetCalculatorData) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'District of Columbia' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

const FILING_STATUS_OPTIONS = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married Filing Jointly' },
  { value: 'married_separate', label: 'Married Filing Separately' },
  { value: 'head_of_household', label: 'Head of Household' },
];

const DEFAULT_EXPENSES = [
  { id: 'housing', name: 'Housing', amount: 0, isEssential: true },
  { id: 'food', name: 'Food', amount: 0, isEssential: true },
  { id: 'utilities', name: 'Utilities', amount: 0, isEssential: true },
  { id: 'transportation', name: 'Transportation', amount: 0, isEssential: true },
  { id: 'insurance', name: 'Insurance', amount: 0, isEssential: true },
];

interface TaxBreakdown {
  federal: number;
  state: number;
  ficaSocialSecurity: number;
  ficaMedicare: number;
  totalTaxes: number;
  takeHome: number;
  effectiveRate: number;
  isLoading: boolean;
  error: string | null;
}

export function BudgetCalculator({
  data,
  onChange,
  disabled = false,
  readOnly = false,
}: BudgetCalculatorProps) { // code_id:83
  const [taxes, setTaxes] = useState<TaxBreakdown>({
    federal: 0,
    state: 0,
    ficaSocialSecurity: 0,
    ficaMedicare: 0,
    totalTaxes: 0,
    takeHome: 0,
    effectiveRate: 0,
    isLoading: false,
    error: null,
  });

  // Simple tax estimation (placeholder - would use API in production)
  const estimateTaxes = useCallback((yearlyIncome: number, filingStatus: FilingStatus, stateCode: string | null) => {
    if (!yearlyIncome) {
      setTaxes({
        federal: 0, state: 0, ficaSocialSecurity: 0, ficaMedicare: 0,
        totalTaxes: 0, takeHome: 0, effectiveRate: 0, isLoading: false, error: null,
      });
      return;
    }

    // Simplified tax brackets (2024 approximation)
    let federalRate = 0.12; // Default to 12% bracket
    if (yearlyIncome > 578125) federalRate = 0.37;
    else if (yearlyIncome > 231250) federalRate = 0.35;
    else if (yearlyIncome > 182100) federalRate = 0.32;
    else if (yearlyIncome > 95375) federalRate = 0.24;
    else if (yearlyIncome > 44725) federalRate = 0.22;
    else if (yearlyIncome > 11000) federalRate = 0.12;
    else federalRate = 0.10;

    // Adjust for filing status
    if (filingStatus === 'married' || filingStatus === 'married_separate') {
      federalRate *= 0.9; // Simplified joint benefit
    }

    const federal = yearlyIncome * federalRate;

    // State tax (simplified average)
    const stateRate = stateCode ? 0.05 : 0; // 5% average state tax
    const state = yearlyIncome * stateRate;

    // FICA
    const ficaSocialSecurity = Math.min(yearlyIncome * 0.062, 160200 * 0.062);
    const ficaMedicare = yearlyIncome * 0.0145;

    const totalTaxes = federal + state + ficaSocialSecurity + ficaMedicare;
    const takeHome = yearlyIncome - totalTaxes;
    const effectiveRate = yearlyIncome > 0 ? (totalTaxes / yearlyIncome) * 100 : 0;

    setTaxes({
      federal: federal / 12,
      state: state / 12,
      ficaSocialSecurity: ficaSocialSecurity / 12,
      ficaMedicare: ficaMedicare / 12,
      totalTaxes: totalTaxes / 12,
      takeHome: takeHome / 12,
      effectiveRate,
      isLoading: false,
      error: null,
    });
  }, []);

  // Update taxes when income changes
  useEffect(() => {
    const timer = setTimeout(() => {
      estimateTaxes(data.grossYearlyIncome, data.filingStatus, data.stateCode);
    }, 500);
    return () => clearTimeout(timer);
  }, [data.grossYearlyIncome, data.filingStatus, data.stateCode, estimateTaxes]);

  const updateIncome = (monthly: number) => { // code_id:293
    onChange({
      ...data,
      grossMonthlyIncome: monthly,
      grossYearlyIncome: monthly * 12,
    });
  };

  const updateYearlyIncome = (yearly: number) => { // code_id:294
    onChange({
      ...data,
      grossYearlyIncome: yearly,
      grossMonthlyIncome: yearly / 12,
    });
  };

  const updateExpense = (id: string, updates: Partial<ExpenseItem>) => { // code_id:295
    onChange({
      ...data,
      expenses: data.expenses.map((exp) =>
        exp.id === id ? { ...exp, ...updates } : exp
      ),
    });
  };

  const addExpense = () => { // code_id:296
    const newExpense: ExpenseItem = {
      id: `expense-${Date.now()}`,
      name: '',
      amount: 0,
      isEssential: false,
    };
    onChange({ ...data, expenses: [...data.expenses, newExpense] });
  };

  const removeExpense = (id: string) => { // code_id:297
    onChange({
      ...data,
      expenses: data.expenses.filter((exp) => exp.id !== id),
    });
  };

  const totalExpenses = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const essentialExpenses = data.expenses
    .filter((e) => e.isEssential)
    .reduce((sum, e) => sum + e.amount, 0);
  const netSavings = taxes.takeHome - totalExpenses;

  const formatCurrency = (amount: number) => { // code_id:298
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="budget-calculator" data-disabled={disabled}>
      <section className="budget-calculator-section">
        <h3 className="budget-calculator-section-title">Gross Income</h3>
        <div className="budget-calculator-income-row">
          <div className="budget-calculator-income-field">
            <label className="budget-calculator-label">Monthly</label>
            <div className="budget-calculator-input-wrapper">
              <span className="budget-calculator-prefix">$</span>
              <input
                type="number"
                className="budget-calculator-input"
                value={data.grossMonthlyIncome || ''}
                onChange={(e) => updateIncome(parseFloat(e.target.value) || 0)}
                disabled={disabled || readOnly}
              />
            </div>
          </div>
          <div className="budget-calculator-income-field">
            <label className="budget-calculator-label">Yearly</label>
            <div className="budget-calculator-input-wrapper">
              <span className="budget-calculator-prefix">$</span>
              <input
                type="number"
                className="budget-calculator-input"
                value={data.grossYearlyIncome || ''}
                onChange={(e) => updateYearlyIncome(parseFloat(e.target.value) || 0)}
                disabled={disabled || readOnly}
              />
            </div>
          </div>
        </div>

        <div className="budget-calculator-tax-inputs">
          <Select
            label="Filing Status"
            value={data.filingStatus}
            onChange={(v) => onChange({ ...data, filingStatus: v as FilingStatus })}
            options={FILING_STATUS_OPTIONS}
            disabled={disabled || readOnly}
          />
          <Select
            label="State"
            value={data.stateCode || ''}
            onChange={(v) => onChange({ ...data, stateCode: v || null })}
            options={[{ value: '', label: 'Select state...' }, ...US_STATES]}
            disabled={disabled || readOnly}
          />
        </div>
      </section>

      <section className="budget-calculator-section">
        <h3 className="budget-calculator-section-title">Tax Breakdown (Monthly)</h3>
        {taxes.isLoading ? (
          <p className="budget-calculator-loading">Calculating taxes...</p>
        ) : taxes.error ? (
          <p className="budget-calculator-error">{taxes.error}</p>
        ) : (
          <div className="budget-calculator-tax-breakdown">
            <div className="budget-calculator-tax-line">
              <span>Federal Tax</span>
              <span>{formatCurrency(taxes.federal)}</span>
            </div>
            <div className="budget-calculator-tax-line">
              <span>State Tax</span>
              <span>{formatCurrency(taxes.state)}</span>
            </div>
            <div className="budget-calculator-tax-line">
              <span>Social Security</span>
              <span>{formatCurrency(taxes.ficaSocialSecurity)}</span>
            </div>
            <div className="budget-calculator-tax-line">
              <span>Medicare</span>
              <span>{formatCurrency(taxes.ficaMedicare)}</span>
            </div>
            <div className="budget-calculator-tax-line budget-calculator-tax-total">
              <span>Estimated Take-Home</span>
              <span>{formatCurrency(taxes.takeHome)}</span>
            </div>
            <div className="budget-calculator-tax-line budget-calculator-effective-rate">
              <span>Effective Rate</span>
              <span>{taxes.effectiveRate.toFixed(1)}%</span>
            </div>
          </div>
        )}
      </section>

      <section className="budget-calculator-section">
        <h3 className="budget-calculator-section-title">Monthly Expenses</h3>
        <div className="budget-calculator-expenses">
          {data.expenses.map((expense) => (
            <div key={expense.id} className="budget-calculator-expense-row">
              <input
                type="text"
                className="budget-calculator-input"
                value={expense.name}
                onChange={(e) => updateExpense(expense.id, { name: e.target.value })}
                placeholder="Expense name"
                disabled={disabled || readOnly}
              />
              <div className="budget-calculator-input-wrapper">
                <span className="budget-calculator-prefix">$</span>
                <input
                  type="number"
                  className="budget-calculator-input"
                  value={expense.amount || ''}
                  onChange={(e) => updateExpense(expense.id, { amount: parseFloat(e.target.value) || 0 })}
                  disabled={disabled || readOnly}
                />
              </div>
              <Checkbox
                checked={expense.isEssential}
                onChange={(v) => updateExpense(expense.id, { isEssential: v })}
                label="Essential"
                disabled={disabled || readOnly}
              />
              {!disabled && !readOnly && !DEFAULT_EXPENSES.find((d) => d.id === expense.id) && (
                <button
                  type="button"
                  className="budget-calculator-remove-expense"
                  onClick={() => removeExpense(expense.id)}
                  aria-label="Remove expense"
                >
                  <XIcon />
                </button>
              )}
            </div>
          ))}
        </div>
        {!disabled && !readOnly && (
          <button
            type="button"
            className="budget-calculator-add-expense"
            onClick={addExpense}
          >
            + Add Expense
          </button>
        )}
      </section>

      <section className="budget-calculator-section budget-calculator-summary">
        <h3 className="budget-calculator-section-title">Summary</h3>
        <div className="budget-calculator-summary-lines">
          <div className="budget-calculator-summary-line">
            <span>Estimated Take-Home</span>
            <span>{formatCurrency(taxes.takeHome)}</span>
          </div>
          <div className="budget-calculator-summary-line">
            <span>Total Expenses</span>
            <span>- {formatCurrency(totalExpenses)}</span>
          </div>
          <div className="budget-calculator-summary-line budget-calculator-summary-subline">
            <span>Essential Only</span>
            <span>- {formatCurrency(essentialExpenses)}</span>
          </div>
          <div
            className="budget-calculator-summary-line budget-calculator-summary-total"
            data-positive={netSavings >= 0}
          >
            <span>Net Savings (Monthly)</span>
            <span>
              {formatCurrency(Math.abs(netSavings))}
              {netSavings >= 0 ? ' ✓' : ' ⚠'}
            </span>
          </div>
        </div>
      </section>

      <section className="budget-calculator-section">
        <h3 className="budget-calculator-section-title">Notes</h3>
        <TextArea
          value={data.notes}
          onChange={(v) => onChange({ ...data, notes: v })}
          placeholder="Additional financial notes, goals, or considerations..."
          minRows={3}
          disabled={disabled || readOnly}
        />
      </section>

      <p className="budget-calculator-disclaimer">
        Tax estimates are approximate and do not account for deductions or credits.
        Consult a tax professional for accuracy.
      </p>
    </div>
  );
}

function XIcon() { // code_id:299
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export { DEFAULT_EXPENSES };
