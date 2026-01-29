/**
 * useApplyTheme Hook
 *
 * Applies theme CSS variables when theme settings change.
 * Use this hook in any client component that has access to theme settings.
 */

'use client';

import { useEffect } from 'react';
import { applyTheme, parseThemeSettings } from '@/lib/theme';
import type { BackgroundColorId, TextColorId, FontFamilyId } from '@/components/onboarding/types';

interface UseApplyThemeOptions {
  backgroundColor?: BackgroundColorId | string | null;
  textColor?: TextColorId | string | null;
  font?: FontFamilyId | string | null;
  textSize?: number | null;
}

/**
 * Hook to apply theme CSS variables to the document.
 *
 * @example
 * // In a client component with theme data:
 * useApplyTheme({
 *   backgroundColor: userPreview.backgroundColor,
 *   textColor: 'charcoal',
 *   font: userPreview.fontFamily,
 * });
 */
export function useApplyTheme(options: UseApplyThemeOptions): void { // code_id:110
  const { backgroundColor, textColor, font, textSize } = options;

  useEffect(() => {
    const settings = parseThemeSettings(
      backgroundColor as string,
      textColor as string,
      font as string,
      textSize
    );
    applyTheme(settings);
  }, [backgroundColor, textColor, font, textSize]);
}
