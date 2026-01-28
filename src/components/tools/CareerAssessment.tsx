'use client';

import { CareerAssessmentData, CareerOption } from './types';
import { TextInput, TextArea, Slider } from '../forms';

interface CareerAssessmentProps {
  data: CareerAssessmentData;
  onChange: (data: CareerAssessmentData) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

const SCORE_DIMENSIONS = [
  {
    key: 'coherenceScore' as const,
    label: 'Coherence',
    description: 'How well does this fit your values, skills, and identity?',
    minLabel: 'Poor fit',
    maxLabel: 'Perfect fit',
  },
  {
    key: 'workNeedsScore' as const,
    label: 'Work Needs',
    description: 'Does it meet your professional requirements (salary, growth, challenge)?',
    minLabel: 'Unmet',
    maxLabel: 'Fully met',
  },
  {
    key: 'lifeNeedsScore' as const,
    label: 'Life Needs',
    description: 'Does it support your personal life (location, schedule, relationships)?',
    minLabel: 'Conflicts',
    maxLabel: 'Supports',
  },
  {
    key: 'unknownsScore' as const,
    label: 'Unknowns',
    description: 'How much uncertainty remains about this option?',
    minLabel: 'Many unknowns',
    maxLabel: 'Few unknowns',
  },
];

export function CareerAssessment({
  data,
  onChange,
  disabled = false,
  readOnly = false,
}: CareerAssessmentProps) { // code_id:91
  const addOption = () => { // code_id:300
    const newOption: CareerOption = {
      id: `option-${Date.now()}`,
      title: '',
      description: null,
      rank: null,
      coherenceScore: null,
      workNeedsScore: null,
      lifeNeedsScore: null,
      unknownsScore: null,
      notes: '',
    };
    onChange({ ...data, options: [...data.options, newOption] });
  };

  const setRank = (optionId: string, rank: 1 | 2 | 3) => { // code_id:301
    // Remove this rank from any other option, then set it on this one
    onChange({
      ...data,
      options: data.options.map((opt) => ({
        ...opt,
        rank: opt.id === optionId ? rank : (opt.rank === rank ? null : opt.rank),
      })),
    });
  };

  const updateOption = (id: string, updates: Partial<CareerOption>) => { // code_id:302
    onChange({
      ...data,
      options: data.options.map((opt) =>
        opt.id === id ? { ...opt, ...updates } : opt
      ),
    });
  };

  const removeOption = (id: string) => { // code_id:303
    onChange({
      ...data,
      options: data.options.filter((opt) => opt.id !== id),
    });
  };

  const calculateOverallScore = (option: CareerOption): number | null => {
    const scores = [
      option.coherenceScore,
      option.workNeedsScore,
      option.lifeNeedsScore,
      option.unknownsScore,
    ].filter((s): s is number => s !== null);

    if (scores.length === 0) return null;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  };

  const sortedOptions = [...data.options].sort((a, b) => { // code_id:304
    const scoreA = calculateOverallScore(a);
    const scoreB = calculateOverallScore(b);
    if (scoreA === null && scoreB === null) return 0;
    if (scoreA === null) return 1;
    if (scoreB === null) return -1;
    return scoreB - scoreA;
  });

  return (
    <div className="career-assessment" data-disabled={disabled}>
      <p className="career-assessment-intro">
        Score each career option on four dimensions. Higher scores are better
        (for Unknowns, higher means fewer uncertainties).
      </p>

      <div className="career-assessment-options">
        {data.options.map((option, index) => {
          const overallScore = calculateOverallScore(option);
          return (
            <div key={option.id} className="career-assessment-option">
              <div className="career-assessment-option-header">
                <span className="career-assessment-option-number">
                  Option {index + 1}
                </span>
                {overallScore !== null && (
                  <span className="career-assessment-option-score">
                    {overallScore.toFixed(1)} / 5
                  </span>
                )}
                {!disabled && !readOnly && (
                  <button
                    type="button"
                    className="career-assessment-remove"
                    onClick={() => removeOption(option.id)}
                    aria-label="Remove option"
                  >
                    ×
                  </button>
                )}
              </div>

              <TextInput
                label="Career Option"
                value={option.title}
                onChange={(v) => updateOption(option.id, { title: v })}
                placeholder="e.g., Product Manager at Tech Startup"
                disabled={disabled || readOnly}
              />

              <TextArea
                label="Description (optional)"
                value={option.description || ''}
                onChange={(v) => updateOption(option.id, { description: v || null })}
                placeholder="Brief summary of what this career path involves..."
                minRows={2}
                disabled={disabled || readOnly}
              />

              <div className="career-assessment-rank-selector">
                <span className="career-assessment-rank-label">Priority Rank</span>
                <div className="career-assessment-rank-buttons">
                  {([1, 2, 3] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className="career-assessment-rank-btn"
                      data-selected={option.rank === r}
                      onClick={() => setRank(option.id, r)}
                      disabled={disabled || readOnly}
                    >
                      {r === 1 ? '1st' : r === 2 ? '2nd' : '3rd'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="career-assessment-scores">
                {SCORE_DIMENSIONS.map((dim) => (
                  <div key={dim.key} className="career-assessment-dimension">
                    <div className="career-assessment-dimension-header">
                      <span className="career-assessment-dimension-label">
                        {dim.label}
                      </span>
                      <span className="career-assessment-dimension-value">
                        {option[dim.key] !== null ? option[dim.key] : '–'}
                      </span>
                    </div>
                    <p className="career-assessment-dimension-desc">
                      {dim.description}
                    </p>
                    <Slider
                      value={option[dim.key]}
                      onChange={(v) => updateOption(option.id, { [dim.key]: v })}
                      min={1}
                      max={5}
                      minLabel={dim.minLabel}
                      maxLabel={dim.maxLabel}
                      disabled={disabled || readOnly}
                    />
                  </div>
                ))}
              </div>

              <TextArea
                label="Notes"
                value={option.notes}
                onChange={(v) => updateOption(option.id, { notes: v })}
                placeholder="Additional thoughts, concerns, or next steps..."
                minRows={2}
                disabled={disabled || readOnly}
              />
            </div>
          );
        })}
      </div>

      {!disabled && !readOnly && (
        <button
          type="button"
          className="career-assessment-add"
          onClick={addOption}
        >
          + Add Career Option
        </button>
      )}

      {data.options.length > 1 && (
        <div className="career-assessment-comparison">
          <h3 className="career-assessment-comparison-title">Comparison</h3>
          <div className="career-assessment-ranking">
            {sortedOptions.map((option, index) => {
              const score = calculateOverallScore(option);
              if (!option.title) return null;
              return (
                <div key={option.id} className="career-assessment-rank-item">
                  <span className="career-assessment-rank-position">
                    #{index + 1}
                  </span>
                  <span className="career-assessment-rank-title">
                    {option.title}
                  </span>
                  <span className="career-assessment-rank-score">
                    {score !== null ? score.toFixed(1) : '–'}
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
