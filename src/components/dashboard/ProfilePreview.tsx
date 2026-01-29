'use client';

import Link from 'next/link';
import type { UserPreview, BackgroundColorId, FontFamilyId } from './types';

const colorNames: Record<BackgroundColorId, string> = {
  'ivory': 'Ivory',
  'creamy-tan': 'Creamy Tan',
  'brown': 'Brown',
  'charcoal': 'Charcoal',
  'black': 'Black',
};

const fontNames: Record<FontFamilyId, string> = {
  'inter': 'Sans',
  'lora': 'Serif',
  'courier-prime': 'Typewriter',
  'shadows-into-light': 'Handwritten',
  'fleur-de-leah': 'Vintage',
};

interface ProfilePreviewProps {
  user: UserPreview;
}

export function ProfilePreview({ user }: ProfilePreviewProps) { // code_id:188
  const skills = [
    user.topSkills.transferable,
    user.topSkills.selfManagement,
    user.topSkills.knowledge,
  ].filter(Boolean);

  const hasAnySkills = skills.length > 0;

  return (
    <Link href="/profile" className="profile-preview">
      <p className="profile-preview-name">{user.name}</p>

      {hasAnySkills && (
        <p className="profile-preview-skills">{skills.join(' · ')}</p>
      )}

      <p className="profile-preview-visual">
        {colorNames[user.backgroundColor] || user.backgroundColor || 'Default'} + {fontNames[user.fontFamily] || user.fontFamily || 'Sans'}
      </p>
    </Link>
  );
}
