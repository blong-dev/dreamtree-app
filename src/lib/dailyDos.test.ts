import { describe, it, expect } from 'vitest';
import { getDailyDos, isDailyDoUnlocked } from './dailyDos';

describe('getDailyDos', () => {
  describe('early exercises (before any unlock)', () => {
    it('returns empty array for exercise 1.1.1', () => {
      const result = getDailyDos('1.1.1');
      expect(result).toEqual([]);
    });

    it('returns empty array for exercise 1.1.2', () => {
      const result = getDailyDos('1.1.2');
      expect(result).toEqual([]);
    });
  });

  describe('SOARED prompt unlock (at 1.1.3)', () => {
    it('unlocks SOARED prompt at exactly 1.1.3', () => {
      const result = getDailyDos('1.1.3');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('soared-prompt');
    });

    it('includes SOARED prompt for exercise 1.1.4', () => {
      const result = getDailyDos('1.1.4');

      expect(result.some((d) => d.type === 'soared-prompt')).toBe(true);
    });

    it('SOARED prompt has correct action href', () => {
      const result = getDailyDos('1.1.3');

      const soared = result.find((d) => d.type === 'soared-prompt');
      expect(soared?.action.href).toBe('/tools/soared-form');
    });
  });

  describe('Flow tracking unlock (at 1.2.1)', () => {
    it('does not unlock flow tracking in module 1.1', () => {
      const result = getDailyDos('1.1.5');

      expect(result.some((d) => d.type === 'flow-tracking')).toBe(false);
    });

    it('unlocks flow tracking at 1.2.1', () => {
      const result = getDailyDos('1.2.1');

      expect(result.some((d) => d.type === 'flow-tracking')).toBe(true);
    });

    it('includes both SOARED and flow tracking at 1.2.1', () => {
      const result = getDailyDos('1.2.1');

      expect(result).toHaveLength(2);
      expect(result.some((d) => d.type === 'soared-prompt')).toBe(true);
      expect(result.some((d) => d.type === 'flow-tracking')).toBe(true);
    });

    it('flow tracking has correct action href', () => {
      const result = getDailyDos('1.2.1');

      const flow = result.find((d) => d.type === 'flow-tracking');
      expect(flow?.action.href).toBe('/tools/flow-tracker');
    });
  });

  describe('part 2 exercises', () => {
    it('includes both items for any part 2 exercise', () => {
      const result = getDailyDos('2.1.1');

      expect(result).toHaveLength(2);
      expect(result.some((d) => d.type === 'soared-prompt')).toBe(true);
      expect(result.some((d) => d.type === 'flow-tracking')).toBe(true);
    });

    it('includes both items for part 2 module 3', () => {
      const result = getDailyDos('2.3.5');

      expect(result).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('handles malformed exercise ID with defaults', () => {
      const result = getDailyDos('invalid');

      // Parses to 1.1.1 (defaults) -> no unlocks
      expect(result).toEqual([]);
    });

    it('handles partial exercise ID', () => {
      const result = getDailyDos('1.2');

      // moduleNum >= 2 -> flow tracking unlocked
      expect(result.some((d) => d.type === 'flow-tracking')).toBe(true);
    });

    it('handles exercise ID with extra segments', () => {
      const result = getDailyDos('1.2.1.extra');

      expect(result).toHaveLength(2);
    });
  });
});

describe('isDailyDoUnlocked', () => {
  describe('soared-prompt', () => {
    it('returns false for 1.1.1', () => {
      expect(isDailyDoUnlocked('soared-prompt', '1.1.1')).toBe(false);
    });

    it('returns false for 1.1.2', () => {
      expect(isDailyDoUnlocked('soared-prompt', '1.1.2')).toBe(false);
    });

    it('returns true for 1.1.3', () => {
      expect(isDailyDoUnlocked('soared-prompt', '1.1.3')).toBe(true);
    });

    it('returns true for 1.2.1 (module 2)', () => {
      expect(isDailyDoUnlocked('soared-prompt', '1.2.1')).toBe(true);
    });

    it('returns true for 2.1.1 (part 2)', () => {
      expect(isDailyDoUnlocked('soared-prompt', '2.1.1')).toBe(true);
    });
  });

  describe('flow-tracking', () => {
    it('returns false for 1.1.1', () => {
      expect(isDailyDoUnlocked('flow-tracking', '1.1.1')).toBe(false);
    });

    it('returns false for 1.1.5', () => {
      expect(isDailyDoUnlocked('flow-tracking', '1.1.5')).toBe(false);
    });

    it('returns true for 1.2.1', () => {
      expect(isDailyDoUnlocked('flow-tracking', '1.2.1')).toBe(true);
    });

    it('returns true for 2.1.1 (part 2)', () => {
      expect(isDailyDoUnlocked('flow-tracking', '2.1.1')).toBe(true);
    });
  });

  describe('unimplemented types', () => {
    it('returns false for unimplemented type', () => {
      expect(isDailyDoUnlocked('budget-check', '2.1.1')).toBe(false);
    });

    it('returns false for networking type', () => {
      expect(isDailyDoUnlocked('networking', '2.3.5')).toBe(false);
    });
  });
});
