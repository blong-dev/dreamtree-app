'use client';

import { useId, useRef, useEffect, useState } from 'react';

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  minRows?: number;
  maxRows?: number;
  maxLength?: number;
  showCount?: boolean;
  id?: string;
}

export function TextArea({
  value,
  onChange,
  placeholder = '',
  label,
  helperText,
  error,
  disabled = false,
  autoFocus = false,
  minRows = 3,
  maxRows = 10,
  maxLength,
  showCount = false,
  id,
}: TextAreaProps) { // code_id:213
  const generatedId = useId();
  const textareaId = id || generatedId;
  const helperId = `${textareaId}-helper`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get scrollHeight
    textarea.style.height = 'auto';

    const computedStyle = getComputedStyle(textarea);
    const lineHeight = parseInt(computedStyle.lineHeight) || 24;
    const paddingY = parseInt(computedStyle.paddingTop) + parseInt(computedStyle.paddingBottom);

    const minHeight = lineHeight * minRows + paddingY;
    const maxHeight = lineHeight * maxRows + paddingY;

    const newHeight = Math.min(
      Math.max(textarea.scrollHeight, minHeight),
      maxHeight
    );
    setHeight(newHeight);
  }, [value, minRows, maxRows]);

  return (
    <div
      className="textarea-wrapper"
      data-error={!!error}
      data-disabled={disabled}
    >
      {label && (
        <label className="textarea-label" htmlFor={textareaId}>
          {label}
        </label>
      )}
      <textarea
        ref={textareaRef}
        id={textareaId}
        className="textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        maxLength={maxLength}
        rows={minRows}
        style={{ height }}
        aria-describedby={helperId}
        aria-invalid={!!error}
      />
      <div className="textarea-footer">
        {(helperText || error) && (
          <span id={helperId} className="textarea-helper" data-error={!!error}>
            {error || helperText}
          </span>
        )}
        {showCount && maxLength && (
          <span className="textarea-count">
            {value.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}
