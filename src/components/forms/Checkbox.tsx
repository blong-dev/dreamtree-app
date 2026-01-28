'use client';

import { useId } from 'react';
import { CheckIcon } from '../icons';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  id,
}: CheckboxProps) { // code_id:203
  const generatedId = useId();
  const checkboxId = id || generatedId;

  return (
    <label className="checkbox-wrapper" data-disabled={disabled}>
      <input
        type="checkbox"
        id={checkboxId}
        className="checkbox-input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="checkbox-box" aria-hidden="true">
        {checked && <CheckIcon />}
      </span>
      <span className="checkbox-content">
        <span className="checkbox-label">{label}</span>
        {description && (
          <span className="checkbox-description">{description}</span>
        )}
      </span>
    </label>
  );
}
