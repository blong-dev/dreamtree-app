'use client';

import { useId } from 'react';
import { Checkbox } from './Checkbox';

interface CheckboxOption {
  id: string;
  label: string;
  description?: string;
}

interface CheckboxGroupProps {
  options: CheckboxOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  columns?: 1 | 2 | 3;
  id?: string;
}

export function CheckboxGroup({
  options,
  selected,
  onChange,
  label,
  description,
  disabled = false,
  columns = 1,
  id,
}: CheckboxGroupProps) { // code_id:204
  const generatedId = useId();
  const groupId = id || generatedId;

  const handleChange = (optionId: string, checked: boolean) => { // code_id:205
    if (checked) {
      onChange([...selected, optionId]);
    } else {
      onChange(selected.filter((id) => id !== optionId));
    }
  };

  return (
    <fieldset
      className="checkbox-group"
      data-columns={columns}
      disabled={disabled}
    >
      {label && <legend className="checkbox-group-legend">{label}</legend>}
      {description && (
        <p className="checkbox-group-description">{description}</p>
      )}

      <div className="checkbox-group-options">
        {options.map((option) => (
          <Checkbox
            key={option.id}
            id={`${groupId}-${option.id}`}
            checked={selected.includes(option.id)}
            onChange={(checked) => handleChange(option.id, checked)}
            label={option.label}
            description={option.description}
            disabled={disabled}
          />
        ))}
      </div>
    </fieldset>
  );
}
