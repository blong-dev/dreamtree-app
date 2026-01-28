'use client';

import { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import { RankingItem, Comparison } from './types';

interface RankingGridProps {
  items: RankingItem[];
  comparisons: Comparison[];
  onCompare: (winnerId: string, loserId: string) => void;
  onComplete: (ranked: RankingItem[]) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function RankingGrid({
  items,
  comparisons,
  onCompare,
  onComplete,
  label,
  description,
  disabled = false,
}: RankingGridProps) { // code_id:71
  const [focusedSide, setFocusedSide] = useState<'left' | 'right'>('left');
  const [animatingPair, setAnimatingPair] = useState(false);

  // Calculate total comparisons needed: n(n-1)/2 for full comparison
  // Using merge sort approach: ~n*log(n) comparisons
  const totalComparisons = Math.ceil(items.length * Math.log2(items.length || 1));

  // Get current ranking based on comparisons
  const getCurrentRanking = useCallback((): RankingItem[] => {
    if (comparisons.length === 0) return [];

    // Count wins for each item
    const wins: Record<string, number> = {};
    items.forEach((item) => {
      wins[item.id] = 0;
    });

    comparisons.forEach((comp) => {
      if (wins[comp.winnerId] !== undefined) {
        wins[comp.winnerId]++;
      }
    });

    // Sort by wins descending
    return [...items].sort((a, b) => (wins[b.id] || 0) - (wins[a.id] || 0));
  }, [items, comparisons]);

  // Get next pair to compare
  const getNextPair = useCallback((): [RankingItem, RankingItem] | null => {
    const compared = new Set<string>();
    comparisons.forEach((comp) => {
      const key = [comp.winnerId, comp.loserId].sort().join('-');
      compared.add(key);
    });

    // Find first pair not yet compared
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const key = [items[i].id, items[j].id].sort().join('-');
        if (!compared.has(key)) {
          // Randomize left/right position
          return Math.random() > 0.5
            ? [items[i], items[j]]
            : [items[j], items[i]];
        }
      }
    }

    return null; // All pairs compared
  }, [items, comparisons]);

  const currentPair = getNextPair();
  const currentRanking = getCurrentRanking();
  const isComplete = currentPair === null;

  // Notify completion
  useEffect(() => {
    if (isComplete && items.length > 0) {
      const ranked = currentRanking.map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
      onComplete(ranked);
    }
  }, [isComplete, currentRanking, items.length, onComplete]);

  const handleSelect = (winnerId: string, loserId: string) => { // code_id:344
    if (disabled || isComplete) return;

    setAnimatingPair(true);
    setTimeout(() => {
      onCompare(winnerId, loserId);
      setAnimatingPair(false);
    }, 200);
  };

  const handleKeyDown = (e: KeyboardEvent) => { // code_id:345
    if (disabled || isComplete || !currentPair) return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        setFocusedSide('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        setFocusedSide('right');
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedSide === 'left') {
          handleSelect(currentPair[0].id, currentPair[1].id);
        } else {
          handleSelect(currentPair[1].id, currentPair[0].id);
        }
        break;
      case '1':
        e.preventDefault();
        handleSelect(currentPair[0].id, currentPair[1].id);
        break;
      case '2':
        e.preventDefault();
        handleSelect(currentPair[1].id, currentPair[0].id);
        break;
    }
  };

  if (items.length < 2) {
    return (
      <div className="ranking-grid">
        <p className="ranking-grid-prompt">{label}</p>
        <p className="ranking-grid-empty">Add at least 2 items to start ranking.</p>
      </div>
    );
  }

  return (
    <div
      className="ranking-grid"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="application"
      aria-label={label}
    >
      <p className="ranking-grid-prompt">{label}</p>
      {description && <p className="ranking-grid-description">{description}</p>}

      {!isComplete && currentPair && (
        <div className="ranking-grid-comparison" data-animating={animatingPair}>
          <RankingPair
            item={currentPair[0]}
            onSelect={() => handleSelect(currentPair[0].id, currentPair[1].id)}
            position="left"
            focused={focusedSide === 'left'}
            disabled={disabled}
          />

          <span className="ranking-grid-vs" aria-hidden="true">
            vs
          </span>

          <RankingPair
            item={currentPair[1]}
            onSelect={() => handleSelect(currentPair[1].id, currentPair[0].id)}
            position="right"
            focused={focusedSide === 'right'}
            disabled={disabled}
          />
        </div>
      )}

      {isComplete && (
        <div className="ranking-grid-complete">
          <CheckIcon />
          <p>Ranking complete!</p>
        </div>
      )}

      <div className="ranking-grid-progress">
        <div className="ranking-grid-progress-bar">
          <div
            className="ranking-grid-progress-fill"
            style={{
              width: `${Math.min((comparisons.length / totalComparisons) * 100, 100)}%`,
            }}
          />
        </div>
        <span className="ranking-grid-progress-text">
          {comparisons.length} of ~{totalComparisons} comparisons
        </span>
      </div>

      {currentRanking.length > 0 && (
        <div className="ranking-grid-current">
          <h4 className="ranking-grid-current-title">
            {isComplete ? 'Final ranking:' : 'Current ranking (updates as you compare):'}
          </h4>
          <ol className="ranking-grid-current-list">
            {currentRanking.map((item) => (
              <li key={item.id}>{item.value}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// RankingPair component
interface RankingPairProps {
  item: RankingItem;
  onSelect: () => void;
  position: 'left' | 'right';
  focused: boolean;
  disabled: boolean;
}

function RankingPair({ item, onSelect, position, focused, disabled }: RankingPairProps) { // code_id:346
  return (
    <div className="ranking-pair" data-position={position}>
      <div className="ranking-pair-card" data-focused={focused}>
        <span className="ranking-pair-value">{item.value}</span>
      </div>
      <button
        type="button"
        className="ranking-pair-button"
        onClick={onSelect}
        disabled={disabled}
        data-focused={focused}
      >
        Choose
      </button>
    </div>
  );
}

function CheckIcon() { // code_id:347
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
