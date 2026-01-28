'use client';

import { useId, KeyboardEvent } from 'react';

interface SliderProps {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  minLabel: string;
  maxLabel: string;
  label?: string;
  disabled?: boolean;
  id?: string;
}

export function Slider({
  value,
  onChange,
  min = 1,
  max = 5,
  minLabel,
  maxLabel,
  label,
  disabled = false,
  id,
}: SliderProps) { // code_id:211
  const generatedId = useId();
  const sliderId = id || generatedId;
  const labelId = `${sliderId}-label`;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => { // code_id:212
    if (disabled) return;

    const currentValue = value ?? min;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        if (currentValue > min) onChange(currentValue - 1);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        if (currentValue < max) onChange(currentValue + 1);
        break;
      case 'Home':
        e.preventDefault();
        onChange(min);
        break;
      case 'End':
        e.preventDefault();
        onChange(max);
        break;
    }
  };

  const points = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  return (
    <div className="slider-wrapper" data-disabled={disabled}>
      {label && (
        <span className="slider-label" id={labelId}>
          {label}
        </span>
      )}
      <div className="slider-container">
        <span className="slider-min-label">
          <span className="slider-indicator">(−)</span> {minLabel}
        </span>

        <div
          className="slider-track"
          role="slider"
          aria-labelledby={label ? labelId : undefined}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value ?? undefined}
          aria-valuetext={
            value
              ? `${value} of ${max}, between ${minLabel} and ${maxLabel}`
              : 'No selection'
          }
          tabIndex={disabled ? -1 : 0}
          onKeyDown={handleKeyDown}
        >
          {points.map((point) => (
            <button
              key={point}
              type="button"
              className="slider-point"
              data-selected={value === point}
              onClick={() => !disabled && onChange(point)}
              disabled={disabled}
              tabIndex={-1}
              aria-hidden="true"
            />
          ))}
        </div>

        <span className="slider-max-label">
          {maxLabel} <span className="slider-indicator">(+)</span>
        </span>
      </div>
    </div>
  );
}
