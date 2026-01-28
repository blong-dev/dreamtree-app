'use client';

import { useId, useState, useRef, useEffect, KeyboardEvent } from 'react';
import { ChevronDownIcon, CheckIcon } from '../icons';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  id?: string;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  helperText,
  error,
  disabled = false,
  searchable = false,
  id,
}: SelectProps) { // code_id:207
  const generatedId = useId();
  const selectId = id || generatedId;
  const labelId = `${selectId}-label`;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = searchable && searchQuery
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { // code_id:208
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search on open
  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleSelect = (optionValue: string) => { // code_id:209
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleKeyDown = (e: KeyboardEvent) => { // code_id:210
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
          handleSelect(filteredOptions[focusedIndex].value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        }
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(filteredOptions.length - 1);
        break;
    }
  };

  return (
    <div
      className="select-wrapper"
      data-open={isOpen}
      data-error={!!error}
      ref={wrapperRef}
    >
      {label && (
        <label className="select-label" id={labelId}>
          {label}
        </label>
      )}

      <button
        type="button"
        className="select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={label ? labelId : undefined}
        disabled={disabled}
        data-has-value={!!value}
      >
        <span className="select-value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownIcon className="select-icon" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className="select-dropdown"
          role="listbox"
          aria-labelledby={label ? labelId : undefined}
        >
          {searchable && (
            <input
              ref={searchRef}
              type="text"
              className="select-search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          )}
          <ul className="select-options">
            {filteredOptions.map((option, index) => (
              <li
                key={option.value}
                className="select-option"
                role="option"
                aria-selected={value === option.value}
                data-selected={value === option.value}
                data-disabled={option.disabled}
                data-focused={focusedIndex === index}
                onClick={() => !option.disabled && handleSelect(option.value)}
              >
                {option.label}
                {value === option.value && <CheckIcon aria-hidden="true" />}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(helperText || error) && (
        <span className="select-helper" data-error={!!error}>
          {error || helperText}
        </span>
      )}
    </div>
  );
}
