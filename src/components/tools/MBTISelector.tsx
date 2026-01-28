'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { MBTIType } from './types';

interface MBTISelectorProps {
  value: string | null;
  onChange: (code: string) => void;
  types: MBTIType[];
  disabled?: boolean;
  label?: string;
}

export function MBTISelector({
  value,
  onChange,
  types,
  disabled = false,
  label = 'Your Personality Type',
}: MBTISelectorProps) { // code_id:81
  const [inputValue, setInputValue] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filteredTypes = useMemo(() => {
    if (!inputValue.trim()) return types;
    const query = inputValue.toLowerCase();
    return types.filter(
      (type) =>
        type.code.toLowerCase().includes(query) ||
        type.name.toLowerCase().includes(query)
    );
  }, [types, inputValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => { // code_id:340
    setInputValue(e.target.value);
    setIsOpen(true);
  };

  const handleSelect = (code: string) => { // code_id:341
    const selected = types.find((t) => t.code === code);
    if (selected) {
      setInputValue(selected.code);
      onChange(code);
      setIsOpen(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { // code_id:342
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync input with value prop
  useEffect(() => {
    if (value) {
      setInputValue(value);
    }
  }, [value]);

  return (
    <div className="mbti-selector" data-open={isOpen} ref={wrapperRef}>
      <label className="mbti-selector-label" htmlFor="mbti-input">
        {label}
      </label>

      <div className="mbti-selector-input-wrapper">
        <input
          id="mbti-input"
          type="text"
          role="combobox"
          className="mbti-selector-input"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Type to search (e.g., INTJ or Architect)"
          aria-expanded={isOpen}
          aria-controls="mbti-listbox"
          aria-autocomplete="list"
          disabled={disabled}
        />

        {isOpen && filteredTypes.length > 0 && (
          <ul id="mbti-listbox" className="mbti-selector-dropdown" role="listbox">
            {filteredTypes.map((type) => (
              <li
                key={type.code}
                role="option"
                className="mbti-selector-option"
                data-selected={type.code === value}
                onClick={() => handleSelect(type.code)}
                aria-selected={type.code === value}
              >
                <span className="mbti-option-code">{type.code}</span>
                <span className="mbti-option-name">{type.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface MBTIResultDisplayProps {
  code: string;
  name: string;
  summary: string;
}

export function MBTIResultDisplay({ code, name, summary }: MBTIResultDisplayProps) { // code_id:339
  return (
    <div className="mbti-result">
      <div className="mbti-result-header">
        <span className="mbti-result-code">{code}</span>
        <span className="mbti-result-name">{name}</span>
      </div>
      <p className="mbti-result-summary">{summary}</p>
    </div>
  );
}
