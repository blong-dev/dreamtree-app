'use client';

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { useSkillsLibrary, SkillMatch } from '@/hooks/useSkillsLibrary';

interface SkillInputProps {
  value: string;
  onChange: (value: string) => void;
  onSkillResolved: (result: SkillMatch) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Universal skill input with fuzzy matching against the skills library.
 *
 * UX Behavior:
 * - Dropdown appears after 3+ characters typed
 * - Shows top 5 matches (scores not shown to user)
 * - Keyboard: arrows navigate, Enter selects/submits, Escape closes, Tab moves focus
 *
 * Resolution logic (on Enter or blur):
 * 1. If dropdown selection active → use that library skill
 * 2. Else fuzzy match input:
 *    - Score >= 0.8 → use library skill
 *    - No good match → create custom skill
 * 3. Always records inputValue (what they typed) for harvesting
 */
export function SkillInput({
  value,
  onChange,
  onSkillResolved,
  placeholder = 'Type a skill...',
  autoFocus = false,
  disabled = false,
  className = '',
}: SkillInputProps) {
  const { search, resolve, isLoading } = useSkillsLibrary();

  const [suggestions, setSuggestions] = useState<SkillMatch[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [hasResolved, setHasResolved] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Search as user types
  useEffect(() => {
    if (value.length >= 3 && !hasResolved) {
      const results = search(value, 5);
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setHighlightIndex(-1);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [value, search, hasResolved]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  const selectSuggestion = useCallback((match: SkillMatch) => {
    // Show the library skill name (normalized) in the input
    onChange(match.value);
    setIsOpen(false);
    setSuggestions([]);
    setHasResolved(true);
    onSkillResolved(match);
  }, [onChange, onSkillResolved]);

  const resolveAndSubmit = useCallback(() => {
    if (!value.trim()) return;

    // If a suggestion is highlighted, select it
    if (highlightIndex >= 0 && suggestions[highlightIndex]) {
      selectSuggestion({
        ...suggestions[highlightIndex],
        inputValue: value, // Preserve what they actually typed
      });
      return;
    }

    // Otherwise, resolve the raw input
    const result = resolve(value);
    setHasResolved(true);
    setIsOpen(false);
    onSkillResolved(result);
  }, [value, highlightIndex, suggestions, selectSuggestion, resolve, onSkillResolved]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (isOpen && suggestions.length > 0) {
          setHighlightIndex(prev =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (isOpen && highlightIndex > 0) {
          setHighlightIndex(prev => prev - 1);
        }
        break;

      case 'Enter':
        e.preventDefault();
        resolveAndSubmit();
        break;

      case 'Escape':
        setIsOpen(false);
        setHighlightIndex(-1);
        break;

      case 'Tab':
        // Let Tab move focus, but resolve first if we have input
        if (value.trim() && !hasResolved) {
          resolveAndSubmit();
        }
        break;
    }
  };

  const handleChange = (newValue: string) => {
    onChange(newValue);
    // Reset resolved state when user edits
    if (hasResolved) {
      setHasResolved(false);
    }
  };

  const handleBlur = () => {
    // Small delay to allow click on suggestion to register
    setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleFocus = () => {
    // Show suggestions again if we have input and haven't resolved
    if (value.length >= 3 && !hasResolved) {
      const results = search(value, 5);
      setSuggestions(results);
      setIsOpen(results.length > 0);
    }
  };

  return (
    <div className={`skill-input-wrapper ${className}`}>
      <input
        ref={inputRef}
        type="text"
        className="skill-input"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled || isLoading}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="skill-suggestions"
        aria-autocomplete="list"
        aria-activedescendant={
          highlightIndex >= 0 ? `skill-option-${highlightIndex}` : undefined
        }
      />

      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          id="skill-suggestions"
          className="skill-input-dropdown"
          role="listbox"
        >
          {suggestions.map((match, index) => (
            <li
              key={match.skillId || `custom-${index}`}
              id={`skill-option-${index}`}
              className="skill-input-option"
              role="option"
              aria-selected={index === highlightIndex}
              data-highlighted={index === highlightIndex}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur
              }}
              onClick={() => selectSuggestion({ ...match, inputValue: value })}
            >
              <span className="skill-input-option-name">{match.value}</span>
              {match.matchType === 'exact' && (
                <span className="skill-input-option-badge">exact</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Re-export SkillMatch type for convenience
export type { SkillMatch } from '@/hooks/useSkillsLibrary';
