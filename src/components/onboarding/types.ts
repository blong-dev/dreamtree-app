export type BackgroundColorId = 'ivory' | 'creamy-tan' | 'brown' | 'charcoal' | 'black';
export type TextColorId = 'ivory' | 'creamy-tan' | 'brown' | 'charcoal' | 'black';
export type FontFamilyId = 'inter' | 'lora' | 'courier-prime' | 'shadows-into-light' | 'fleur-de-leah';

export interface OnboardingData {
  name: string;
  backgroundColor: BackgroundColorId;
  textColor: TextColorId;
  font: FontFamilyId;
  textSize: number; // Multiplier: 0.8 = 80%, 1.0 = 100%, 1.2 = 120%
}

export interface ColorOption {
  id: BackgroundColorId;
  name: string;
  hex: string;
  isLight: boolean;
}

export interface FontOption {
  id: FontFamilyId;
  name: string;
  family: string;
  sampleText: string;
  baseSizePx?: number; // Base font size in pixels (default 16)
  letterSpacing?: string; // Letter spacing adjustment
}

export const COLORS: ColorOption[] = [
  { id: 'ivory', name: 'Ivory', hex: '#FAF8F5', isLight: true },
  { id: 'creamy-tan', name: 'Creamy Tan', hex: '#E8DCC4', isLight: true },
  { id: 'brown', name: 'Brown', hex: '#5C4033', isLight: false },
  { id: 'charcoal', name: 'Charcoal', hex: '#2C3E50', isLight: false },
  { id: 'black', name: 'Black', hex: '#1A1A1A', isLight: false },
];

export const FONTS: FontOption[] = [
  { id: 'inter', name: 'Clean Sans', family: "'Inter', system-ui, sans-serif", sampleText: 'The quick brown fox' },
  { id: 'lora', name: 'Classic Serif', family: "'Lora', Georgia, serif", sampleText: 'The quick brown fox' },
  { id: 'courier-prime', name: 'Typewriter', family: "'Courier Prime', monospace", sampleText: 'The quick brown fox', baseSizePx: 17, letterSpacing: '-0.02em' },
  { id: 'shadows-into-light', name: 'Handwritten', family: "'Shadows Into Light', cursive", sampleText: 'The quick brown fox', baseSizePx: 22 },
  { id: 'fleur-de-leah', name: 'Vintage Display', family: "'Fleur De Leah', cursive", sampleText: 'The quick brown fox', baseSizePx: 36, letterSpacing: '0.02em' },
];

export function getColorById(id: BackgroundColorId): ColorOption { // code_id:250
  return COLORS.find(c => c.id === id) || COLORS[0];
}

export function getFontById(id: FontFamilyId): FontOption { // code_id:251
  return FONTS.find(f => f.id === id) || FONTS[0];
}

export function getTextColorForBackground(bgId: BackgroundColorId): string { // code_id:252
  const bg = getColorById(bgId);
  return bg.isLight ? '#2C3E50' : '#FAF8F5';
}

// Valid text/background pairings for WCAG AA contrast
export function getValidTextColors(bgId: BackgroundColorId): TextColorId[] { // code_id:253
  const lightBackgrounds: BackgroundColorId[] = ['ivory', 'creamy-tan'];
  if (lightBackgrounds.includes(bgId)) {
    return ['brown', 'charcoal', 'black'];
  }
  return ['ivory', 'creamy-tan'];
}

export function isValidPairing(bgId: BackgroundColorId, textId: TextColorId): boolean { // code_id:254
  return getValidTextColors(bgId).includes(textId);
}

export function getFontStyle(id: FontFamilyId): React.CSSProperties { // code_id:255
  const font = getFontById(id);
  return {
    fontFamily: font.family,
    fontSize: font.baseSizePx ? `${font.baseSizePx}px` : undefined,
    letterSpacing: font.letterSpacing,
  };
}
