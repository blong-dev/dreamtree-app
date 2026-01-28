/**
 * DreamTree Theme System
 *
 * Centralized theme management for applying user-selected colors and fonts.
 * This ensures theme is consistently applied across all pages.
 */

import type { BackgroundColorId, TextColorId, FontFamilyId } from '@/components/onboarding/types';
import { getColorById, getFontById } from '@/components/onboarding/types';

export interface ThemeSettings {
  backgroundColor: BackgroundColorId;
  textColor: TextColorId;
  font: FontFamilyId;
}

/**
 * Apply theme CSS variables to the document.
 * This is the single source of truth for theme application.
 *
 * @param settings - Theme settings (background, text, font)
 */
export function applyTheme(settings: ThemeSettings): void { // code_id:462
  if (typeof document === 'undefined') return;

  const { backgroundColor, textColor, font } = settings;

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
}

/**
 * Get default theme settings.
 */
export function getDefaultTheme(): ThemeSettings { // code_id:463
  return {
    backgroundColor: 'ivory',
    textColor: 'charcoal',
    font: 'inter',
  };
}

/**
 * Parse theme settings from raw database/API values with fallbacks.
 */
export function parseThemeSettings(
  backgroundColor?: string | null,
  textColor?: string | null,
  font?: string | null
): ThemeSettings { // code_id:464
  const defaults = getDefaultTheme();

  return {
    backgroundColor: (backgroundColor || defaults.backgroundColor) as BackgroundColorId,
    textColor: (textColor || defaults.textColor) as TextColorId,
    font: (font || defaults.font) as FontFamilyId,
  };
}
