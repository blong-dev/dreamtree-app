/**
 * DreamTree Theme System
 *
 * Centralized theme management for applying user-selected colors and fonts.
 * This ensures theme is consistently applied across all pages.
 */

import type { BackgroundColorId, TextColorId, FontFamilyId } from '@/components/onboarding/types';
import type { AnimationSpeed } from '@/types/database';
import { getColorById, getFontById } from '@/components/onboarding/types';

// Animation speed in milliseconds per character
export const ANIMATION_SPEEDS: Record<AnimationSpeed, number> = {
  off: 0,
  fast: 15,
  normal: 30,
  slow: 60,
};

export interface ThemeSettings {
  backgroundColor: BackgroundColorId;
  textColor: TextColorId;
  font: FontFamilyId;
  textSize: number; // Multiplier: 0.8 = 80%, 1.0 = 100%, 1.4 = 140%
  animationSpeed?: AnimationSpeed; // Optional - defaults to 'normal'
}

/**
 * Apply theme CSS variables to the document.
 * This is the single source of truth for theme application.
 *
 * @param settings - Theme settings (background, text, font)
 */
export function applyTheme(settings: ThemeSettings): void { // code_id:462
  if (typeof document === 'undefined') return;

  const { backgroundColor, textColor, font, textSize } = settings;

  // Apply background color
  const bg = getColorById(backgroundColor);
  document.documentElement.style.setProperty('--color-bg', bg.hex);
  document.documentElement.setAttribute('data-theme', bg.isLight ? 'light' : 'dark');

  // Apply text color
  const text = getColorById(textColor);
  document.documentElement.style.setProperty('--color-text', text.hex);

  // Apply font
  const fontOption = getFontById(font);
  document.documentElement.style.setProperty('--font-body', fontOption.family);

  // Apply font size: base size * user multiplier
  const baseSizePx = fontOption.baseSizePx || 16;
  const adjustedSize = baseSizePx * textSize;
  document.documentElement.style.setProperty('--text-base', `${adjustedSize}px`);

  // Apply letter spacing if specified
  if (fontOption.letterSpacing) {
    document.documentElement.style.setProperty('--letter-spacing-body', fontOption.letterSpacing);
  } else {
    document.documentElement.style.removeProperty('--letter-spacing-body');
  }
}

/**
 * Get default theme settings.
 */
export function getDefaultTheme(): ThemeSettings { // code_id:463
  return {
    backgroundColor: 'ivory',
    textColor: 'charcoal',
    font: 'inter',
    textSize: 1.0,
    animationSpeed: 'normal',
  };
}

/**
 * Parse theme settings from raw database/API values with fallbacks.
 */
export function parseThemeSettings(
  backgroundColor?: string | null,
  textColor?: string | null,
  font?: string | null,
  textSize?: number | null,
  animationSpeed?: string | null
): ThemeSettings { // code_id:464
  const defaults = getDefaultTheme();

  return {
    backgroundColor: (backgroundColor || defaults.backgroundColor) as BackgroundColorId,
    textColor: (textColor || defaults.textColor) as TextColorId,
    font: (font || defaults.font) as FontFamilyId,
    textSize: textSize ?? defaults.textSize,
    animationSpeed: (animationSpeed || defaults.animationSpeed) as AnimationSpeed,
  };
}
