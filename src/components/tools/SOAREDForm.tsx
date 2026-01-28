'use client';

import { SOAREDStoryData, StoryType } from './types';
import { TextInput, TextArea, RadioGroup } from '../forms';

interface SOAREDFormProps {
  data: SOAREDStoryData;
  onChange: (data: SOAREDStoryData) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

const STORY_TYPE_OPTIONS = [
  { id: 'challenge', value: 'challenge', label: 'Challenge Story', description: 'A challenge you overcame' },
  { id: 'other', value: 'other', label: 'Other Story', description: 'General achievement or experience' },
];

const SOARED_FIELDS = [
  {
    key: 'situation' as const,
    label: 'Situation',
    prompt: 'What was the context? Set the scene.',
    placeholder: 'Describe the situation you were in...',
  },
  {
    key: 'obstacle' as const,
    label: 'Obstacle',
    prompt: 'What challenge or problem did you face?',
    placeholder: 'What was the challenge or problem?',
  },
  {
    key: 'action' as const,
    label: 'Action',
    prompt: 'What specific steps did you take?',
    placeholder: 'What actions did you take?',
  },
  {
    key: 'result' as const,
    label: 'Result',
    prompt: 'What was the outcome? Be specific.',
    placeholder: 'What was the result of your actions?',
  },
  {
    key: 'evaluation' as const,
    label: 'Evaluation',
    prompt: 'Looking back, what worked well? What could have been better?',
    placeholder: 'How do you evaluate what happened?',
  },
  {
    key: 'discovery' as const,
    label: 'Discovery',
    prompt: 'What did you learn about yourself from this experience?',
    placeholder: 'What did you discover or learn?',
  },
];

export function SOAREDForm({
  data,
  onChange,
  disabled = false,
  readOnly = false,
}: SOAREDFormProps) { // code_id:67
  const updateField = (key: keyof SOAREDStoryData, value: string) => { // code_id:350
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="soared-form">
      <div className="soared-form-header">
        <TextInput
          label="Story Title"
          value={data.title}
          onChange={(value) => updateField('title', value)}
          placeholder="Give your story a memorable title..."
          disabled={disabled || readOnly}
        />
        <RadioGroup
          label="Story Type"
          value={data.storyType}
          onChange={(value) => onChange({ ...data, storyType: value as StoryType })}
          options={STORY_TYPE_OPTIONS}
          disabled={disabled || readOnly}
        />
      </div>

      <div className="soared-form-fields">
        {SOARED_FIELDS.map((field) => (
          <div key={field.key} className="soared-form-field">
            <TextArea
              label={field.label}
              helperText={field.prompt}
              value={data[field.key]}
              onChange={(value) => updateField(field.key, value)}
              placeholder={field.placeholder}
              minRows={3}
              disabled={disabled || readOnly}
            />
          </div>
        ))}
      </div>

      <div className="soared-form-legend">
        <span className="soared-form-legend-title">SOARED Framework</span>
        <ul className="soared-form-legend-list">
          <li><strong>S</strong>ituation — Set the scene</li>
          <li><strong>O</strong>bstacle — The challenge you faced</li>
          <li><strong>A</strong>ction — What you did</li>
          <li><strong>R</strong>esult — The outcome</li>
          <li><strong>E</strong>valuation — What worked, what didn&apos;t</li>
          <li><strong>D</strong>iscovery — What you learned about yourself</li>
        </ul>
      </div>
    </div>
  );
}
