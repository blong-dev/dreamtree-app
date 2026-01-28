'use client';

import { MindsetProfilesData, MindsetType } from './types';
import { TextInput } from '../forms';

interface MindsetProfilesProps {
  data: MindsetProfilesData;
  onChange: (data: MindsetProfilesData) => void;
  disabled?: boolean;
  readOnly?: boolean;
}

const MINDSET_PROFILES: Array<{
  type: MindsetType;
  name: string;
  description: string;
  prompt: string;
}> = [
  {
    type: 'curiosity',
    name: 'Curiosity',
    description:
      'Designers approach problems with genuine curiosity, asking "why" and "what if" without judgment. They explore possibilities before jumping to solutions.',
    prompt: 'Who embodies curiosity for you?',
  },
  {
    type: 'bias-to-action',
    name: 'Bias to Action',
    description:
      'Rather than endless planning, designers prototype and test ideas quickly. They learn by doing, accepting that early attempts may fail.',
    prompt: 'Who represents bias to action?',
  },
  {
    type: 'reframing',
    name: 'Reframing',
    description:
      'When stuck, designers reframe the problem. Instead of "I can\'t find a job," they ask "How might I create value for organizations?"',
    prompt: 'Who is a master reframer?',
  },
  {
    type: 'awareness',
    name: 'Awareness',
    description:
      'Designers pay attention to their own energy, emotions, and patterns. Self-awareness helps them make choices aligned with who they really are.',
    prompt: 'Who models self-awareness?',
  },
  {
    type: 'radical-collaboration',
    name: 'Radical Collaboration',
    description:
      'Design is rarely solo work. Designers build on others\' ideas, seek diverse perspectives, and create together.',
    prompt: 'Who exemplifies radical collaboration?',
  },
];

export function MindsetProfiles({
  data,
  onChange,
  disabled = false,
  readOnly = false,
}: MindsetProfilesProps) { // code_id:87
  const updateCharacter = (type: MindsetType, character: string) => { // code_id:343
    onChange({
      ...data,
      selectedCharacters: {
        ...data.selectedCharacters,
        [type]: character,
      },
    });
  };

  const completedCount = MINDSET_PROFILES.filter(
    (profile) => data.selectedCharacters[profile.type]?.trim()
  ).length;

  return (
    <div className="mindset-profiles" data-disabled={disabled}>
      <p className="mindset-profiles-intro">
        The five designer mindsets help you approach your career as a creative
        challenge. For each mindset, think of a person (real or fictional) who
        embodies it.
      </p>

      <div className="mindset-profiles-list">
        {MINDSET_PROFILES.map((profile) => (
          <div key={profile.type} className="mindset-profile">
            <div className="mindset-profile-header">
              <h3 className="mindset-profile-name">{profile.name}</h3>
            </div>
            <p className="mindset-profile-description">{profile.description}</p>
            <div className="mindset-profile-input">
              <TextInput
                label={profile.prompt}
                value={data.selectedCharacters[profile.type] || ''}
                onChange={(v) => updateCharacter(profile.type, v)}
                placeholder="Enter a name..."
                disabled={disabled || readOnly}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mindset-profiles-progress">
        <div className="mindset-profiles-progress-bar">
          <div
            className="mindset-profiles-progress-fill"
            style={{ width: `${(completedCount / MINDSET_PROFILES.length) * 100}%` }}
          />
        </div>
        <span className="mindset-profiles-progress-text">
          {completedCount} of {MINDSET_PROFILES.length} mindsets assigned
        </span>
      </div>
    </div>
  );
}

export { MINDSET_PROFILES };
