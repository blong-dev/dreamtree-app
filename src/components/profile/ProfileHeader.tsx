'use client';

import type { BackgroundColorId, FontFamilyId } from '../dashboard/types';

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
  'manufacturing-consent': 'Vintage',
};

interface ProfileHeaderProps {
  name: string;
  backgroundColor: BackgroundColorId;
  fontFamily: FontFamilyId;
  onEditAppearance?: () => void;
}

export function ProfileHeader({ name, backgroundColor, fontFamily, onEditAppearance }: ProfileHeaderProps) { // code_id:267
  return (
    <header className="profile-header">
      <h1 className="profile-name">{name}</h1>
      <p className="profile-visual">
        {colorNames[backgroundColor]} + {fontNames[fontFamily]}
      </p>
      {onEditAppearance && (
        <button
          type="button"
          className="profile-settings-link"
          onClick={onEditAppearance}
          data-testid="edit-appearance-button"
        >
          Edit Appearance
        </button>
      )}
    </header>
  );
}
