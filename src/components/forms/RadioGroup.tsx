'use client';

import { useId } from 'react';

interface RadioOption {
  id: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  options: RadioOption[];
  value: string | null;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  orientation?: 'vertical' | 'horizontal';
  id?: string;
}

export function RadioGroup({
  options,
  value,
  onChange,
  label,
  description,
  disabled = false,
  orientation = 'vertical',
  id,
}: RadioGroupProps) { // code_id:206
  const generatedId = useId();
  const groupId = id || generatedId;

  return (
    <fieldset
      className="radio-group"
      data-orientation={orientation}
      disabled={disabled}
    >
      {label && <legend className="radio-group-legend">{label}</legend>}
      {description && (
        <p className="radio-group-description">{description}</p>
      )}

      <div className="radio-group-options" role="radiogroup">
        {options.map((option) => (
          <label
            key={option.id}
            className="radio-option"
            data-selected={value === option.id}
          >
            <input
              type="radio"
              name={groupId}
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
              disabled={disabled}
            />
            <span className="radio-circle" aria-hidden="true">
              {value === option.id && <span className="radio-dot" />}
            </span>
            <span className="radio-content">
              <span className="radio-label">{option.label}</span>
              {option.description && (
                <span className="radio-description">{option.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
