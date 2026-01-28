'use client';

import { FailureReframerData } from './types';
import { TextArea } from '../forms';

interface FailureReframerProps {
  data: FailureReframerData;
  onChange: (data: FailureReframerData) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

const REFRAMER_FIELDS = [
  {
    key: 'situation' as const,
    label: 'The Situation',
    prompt: 'Describe what happened. What was the setback or failure?',
    placeholder: 'What happened?',
  },
  {
    key: 'initialFeelings' as const,
    label: 'Initial Feelings',
    prompt: 'How did you feel when it happened?',
    placeholder: 'How did you feel?',
  },
  {
    key: 'whatLearned' as const,
    label: 'What I Learned',
    prompt: 'What did this experience teach you?',
    placeholder: 'What lessons emerged?',
  },
  {
    key: 'whatWouldChange' as const,
    label: "What I'd Do Differently",
    prompt: 'If you could go back, what would you change?',
    placeholder: 'What would you do differently?',
  },
  {
    key: 'silverLining' as const,
    label: 'Silver Lining',
    prompt: 'Was there anything positive that came from this?',
    placeholder: 'Any unexpected benefits?',
  },
  {
    key: 'nextStep' as const,
    label: 'Next Step',
    prompt: "What's one thing you can do now as a result?",
    placeholder: 'What action can you take?',
  },
];

export function FailureReframer({
  data,
  onChange,
  disabled = false,
  readOnly = false,
}: FailureReframerProps) { // code_id:79
  const updateField = (key: keyof FailureReframerData, value: string) => { // code_id:312
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="failure-reframer">
      <p className="failure-reframer-intro">
        Setbacks are part of growth. Let&apos;s reframe this experience to find the learning and move
        forward.
      </p>

      <div className="failure-reframer-fields">
        {REFRAMER_FIELDS.map((field) => (
          <TextArea
            key={field.key}
            label={field.label}
            helperText={field.prompt}
            value={data[field.key]}
            onChange={(v) => updateField(field.key, v)}
            placeholder={field.placeholder}
            minRows={2}
            disabled={disabled || readOnly}
          />
        ))}

        <div className="failure-reframer-final">
          <TextArea
            label="Reframed Statement"
            helperText="Write a new, constructive way to think about this experience."
            value={data.reframedStatement}
            onChange={(v) => updateField('reframedStatement', v)}
            placeholder="How can you think about this experience more constructively?"
            minRows={3}
            disabled={disabled || readOnly}
          />
        </div>
      </div>
    </div>
  );
}
