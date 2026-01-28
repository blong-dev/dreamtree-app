'use client';

import { useMemo } from 'react';
import {
  CompetencyAssessmentData,
  Competency,
  CompetencyCategory,
  CompetencyScore,
} from './types';

interface CompetencyAssessmentProps {
  data: CompetencyAssessmentData;
  onChange: (data: CompetencyAssessmentData) => void;
  competencies: Competency[];
  disabled?: boolean;
  readOnly?: boolean;
}

const PROFICIENCY_LEVELS = [
  { level: 1, label: 'a', description: 'Learning' },
  { level: 2, label: 'b', description: 'Applying' },
  { level: 3, label: 'c', description: 'Guiding' },
  { level: 4, label: 'd', description: 'Leading' },
  { level: 5, label: 'e', description: 'Shaping' },
];

const CATEGORY_LABELS: Record<CompetencyCategory, string> = {
  delivery: 'Delivery',
  interpersonal: 'Interpersonal',
  strategic: 'Strategic',
};

const CATEGORY_ORDER: CompetencyCategory[] = ['delivery', 'interpersonal', 'strategic'];

export function CompetencyAssessment({
  data,
  onChange,
  competencies,
  disabled = false,
  readOnly = false,
}: CompetencyAssessmentProps) { // code_id:93
  const groupedCompetencies = useMemo(() => {
    const groups: Record<CompetencyCategory, Competency[]> = {
      delivery: [],
      interpersonal: [],
      strategic: [],
    };

    competencies.forEach((comp) => {
      groups[comp.category].push(comp);
    });

    return groups;
  }, [competencies]);

  const getScore = (competencyId: string): number | null => {
    const found = data.scores.find((s) => s.competencyId === competencyId);
    return found?.score ?? null;
  };

  const setScore = (competencyId: string, score: number) => { // code_id:309
    if (disabled || readOnly) return;

    const existingIndex = data.scores.findIndex(
      (s) => s.competencyId === competencyId
    );

    let newScores: CompetencyScore[];
    if (existingIndex >= 0) {
      newScores = data.scores.map((s, i) =>
        i === existingIndex ? { ...s, score } : s
      );
    } else {
      newScores = [...data.scores, { competencyId, score }];
    }

    onChange({ ...data, scores: newScores });
  };

  const completedCount = data.scores.length;
  const totalCount = competencies.length;

  const averageByCategory = useMemo(() => {
    const result: Record<CompetencyCategory, number | null> = {
      delivery: null,
      interpersonal: null,
      strategic: null,
    };

    // Inline score lookup to satisfy ESLint exhaustive-deps
    const lookupScore = (competencyId: string): number | null => {
      const found = data.scores.find((s) => s.competencyId === competencyId);
      return found?.score ?? null;
    };

    CATEGORY_ORDER.forEach((category) => { // code_id:311
      const categoryCompetencies = groupedCompetencies[category];
      const categoryScores = categoryCompetencies
        .map((c) => lookupScore(c.id))
        .filter((s): s is number => s !== null);

      if (categoryScores.length > 0) {
        result[category] =
          categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length;
      }
    });

    return result;
  }, [data.scores, groupedCompetencies]);

  return (
    <div className="competency-assessment" data-disabled={disabled}>
      <p className="competency-assessment-intro">
        Rate yourself on each competency at your current level of proficiency.
        Be honest—this assessment is for your growth, not judgment.
      </p>

      <div className="competency-assessment-legend">
        {PROFICIENCY_LEVELS.map((level) => (
          <span key={level.level} className="competency-assessment-legend-item">
            <span className="competency-assessment-legend-letter">
              {level.label}
            </span>
            <span className="competency-assessment-legend-desc">
              {level.description}
            </span>
          </span>
        ))}
      </div>

      <div className="competency-assessment-categories">
        {CATEGORY_ORDER.map((category) => (
          <div key={category} className="competency-assessment-category">
            <div className="competency-assessment-category-header">
              <h3 className="competency-assessment-category-title">
                {CATEGORY_LABELS[category]}
              </h3>
              {averageByCategory[category] !== null && (
                <span className="competency-assessment-category-avg">
                  Avg: {averageByCategory[category]!.toFixed(1)}
                </span>
              )}
            </div>

            <div className="competency-assessment-list">
              {groupedCompetencies[category].map((competency) => {
                if (!competency || !competency.id) return null;
                const currentScore = getScore(competency.id);
                return (
                  <div key={competency.id} className="competency-assessment-item">
                    <div className="competency-assessment-item-header">
                      <span className="competency-assessment-item-name">
                        {competency.name}
                      </span>
                      <span className="competency-assessment-item-score">
                        {currentScore !== null
                          ? PROFICIENCY_LEVELS[currentScore - 1].label
                          : '–'}
                      </span>
                    </div>
                    <p className="competency-assessment-item-def">
                      {competency.definition || ''}
                    </p>
                    <div className="competency-assessment-levels">
                      {PROFICIENCY_LEVELS.map((level) => (
                        <button
                          key={level.level}
                          type="button"
                          className="competency-assessment-level"
                          data-selected={currentScore === level.level}
                          onClick={() => setScore(competency.id, level.level)}
                          disabled={disabled || readOnly}
                          aria-label={`${level.description} (${level.label})`}
                          title={level.description}
                        >
                          {level.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="competency-assessment-progress">
        <div className="competency-assessment-progress-bar">
          <div
            className="competency-assessment-progress-fill"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
        <span className="competency-assessment-progress-text">
          {completedCount} of {totalCount} competencies rated
        </span>
      </div>

      {completedCount === totalCount && (
        <div className="competency-assessment-summary">
          <h3 className="competency-assessment-summary-title">Summary</h3>
          <div className="competency-assessment-summary-bars">
            {CATEGORY_ORDER.map((category) => {
              const avg = averageByCategory[category];
              if (avg === null) return null;
              return (
                <div
                  key={category}
                  className="competency-assessment-summary-bar"
                >
                  <span className="competency-assessment-summary-label">
                    {CATEGORY_LABELS[category]}
                  </span>
                  <div className="competency-assessment-summary-track">
                    <div
                      className="competency-assessment-summary-fill"
                      style={{ width: `${(avg / 5) * 100}%` }}
                    />
                  </div>
                  <span className="competency-assessment-summary-value">
                    {avg.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
