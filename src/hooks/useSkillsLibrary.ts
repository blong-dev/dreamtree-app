'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Fuse from 'fuse.js';

export interface SkillMatch {
  value: string;           // Display text (skill name)
  skillId: string | null;  // Existing skill ID (null = will create custom)
  matchType: 'exact' | 'fuzzy' | 'custom';
  matchScore: number;      // 1.0 for exact, 0-1 for fuzzy, 0 for custom
  inputValue: string;      // Original user input (for harvesting)
}

interface LibrarySkill {
  id: string;
  name: string;
  category: string;
}

interface FuseResult {
  item: LibrarySkill;
  score?: number;
}

const FUZZY_THRESHOLD = 0.8; // Scores >= 0.8 are auto-matched
const FUSE_OPTIONS = {
  keys: ['name'],
  threshold: 0.4, // Show suggestions up to 0.4 distance
  includeScore: true,
  minMatchCharLength: 2,
};

export function useSkillsLibrary() {
  const [skills, setSkills] = useState<LibrarySkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch skills on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchSkills() {
      try {
        // Fetch library skills + approved custom skills
        const res = await fetch('/api/data/skills', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to fetch skills');

        const data = await res.json();
        if (!cancelled) {
          setSkills(data.skills || []);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setIsLoading(false);
        }
      }
    }

    fetchSkills();
    return () => { cancelled = true; };
  }, []);

  // Create Fuse index
  const fuse = useMemo(() => new Fuse(skills, FUSE_OPTIONS), [skills]);

  /**
   * Search skills library and return matches
   * @param query - User input text
   * @param limit - Max results to return (default 5)
   */
  const search = useCallback((query: string, limit = 5): SkillMatch[] => {
    if (!query || query.length < 2) return [];

    const queryLower = query.toLowerCase().trim();

    // Check for exact match first
    const exactMatch = skills.find(s => s.name.toLowerCase() === queryLower);
    if (exactMatch) {
      return [{
        value: exactMatch.name,
        skillId: exactMatch.id,
        matchType: 'exact',
        matchScore: 1.0,
        inputValue: query,
      }];
    }

    // Fuzzy search
    const results = fuse.search(query, { limit });

    return results.map((result: FuseResult) => {
      // Fuse score is 0 (perfect) to 1 (worst), invert for our 0-1 scale
      const fuseScore = result.score ?? 0;
      const matchScore = 1 - fuseScore;

      return {
        value: result.item.name,
        skillId: result.item.id,
        matchType: 'fuzzy' as const,
        matchScore,
        inputValue: query,
      };
    });
  }, [skills, fuse]);

  /**
   * Resolve user input to a skill match
   * Called on blur or when user presses Enter without selecting from dropdown
   * @param input - Raw user input
   * @returns SkillMatch with best match or custom skill marker
   */
  const resolve = useCallback((input: string): SkillMatch => {
    const trimmed = input.trim();
    if (!trimmed) {
      return {
        value: '',
        skillId: null,
        matchType: 'custom',
        matchScore: 0,
        inputValue: input,
      };
    }

    const matches = search(trimmed, 1);

    // If we have a good match (exact or high-confidence fuzzy), use it
    if (matches.length > 0) {
      const best = matches[0];

      // Exact match or high confidence fuzzy -> use library skill
      if (best.matchType === 'exact' || best.matchScore >= FUZZY_THRESHOLD) {
        return {
          ...best,
          inputValue: input, // Preserve original input for harvesting
        };
      }
    }

    // No good match -> custom skill (will be created on save)
    return {
      value: trimmed,
      skillId: null,
      matchType: 'custom',
      matchScore: 0,
      inputValue: input,
    };
  }, [search]);

  return {
    skills,
    isLoading,
    error,
    search,
    resolve,
    FUZZY_THRESHOLD,
  };
}
