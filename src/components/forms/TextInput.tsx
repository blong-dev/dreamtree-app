'use client';

import { useId, KeyboardEvent } from 'react';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
  id?: string;
}

export function TextInput({
  value,
  onChange,
  onSubmit,
  placeholder = '',
  label,
  helperText,
  error,
  disabled = false,
  autoFocus = false,
  maxLength,
  id,
}: TextInputProps) { // code_id:214
  const generatedId = useId();
  const inputId = id || generatedId;
  const helperId = `${inputId}-helper`;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => { // code_id:215
    if (e.key === 'Enter') {
      onSubmit?.();
    }
  };

  return (
    <div
      className="text-input-wrapper"
      data-error={!!error}
      data-disabled={disabled}
    >
      {label && (
        <label className="text-input-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        type="text"
        id={inputId}
        className="text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        maxLength={maxLength}
        aria-describedby={helperText || error ? helperId : undefined}
        aria-invalid={!!error}
      />
      {(helperText || error) && (
        <span id={helperId} className="text-input-helper" data-error={!!error}>
          {error || helperText}
        </span>
      )}
    </div>
  );
}
