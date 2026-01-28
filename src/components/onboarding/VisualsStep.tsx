'use client';

import {
  BackgroundColorId,
  TextColorId,
  FontFamilyId,
  COLORS,
  FONTS,
  getColorById,
  getFontStyle,
  getValidTextColors,
  isValidPairing,
} from './types';

interface VisualsStepProps {
  backgroundColor: BackgroundColorId | null;
  textColor: TextColorId | null;
  font: FontFamilyId | null;
  onBackgroundChange: (color: BackgroundColorId) => void;
  onTextColorChange: (color: TextColorId) => void;
  onFontChange: (font: FontFamilyId) => void;
}

function CheckIcon({ className, style }: { className?: string; style?: React.CSSProperties }) { // code_id:257
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function VisualsStep({
  backgroundColor,
  textColor,
  font,
  onBackgroundChange,
  onTextColorChange,
  onFontChange,
}: VisualsStepProps) { // code_id:256
  const previewBg = backgroundColor ? getColorById(backgroundColor).hex : undefined;
  const previewText = textColor ? getColorById(textColor).hex : undefined;
  const previewFontStyle = font ? getFontStyle(font) : {};

  return (
    <div className="visuals-step">
      <h2 className="visuals-step-title">Make it yours</h2>
      <p className="visuals-step-description">
        Choose colors and a font that feel right to you. You can change these anytime.
      </p>

      {/* Background Color */}
      <div className="visuals-section">
        <h3 className="visuals-section-title">Background</h3>
        <div className="visuals-swatches">
          {COLORS.map((color) => (
            <button
              key={color.id}
              className="color-swatch"
              data-selected={backgroundColor === color.id}
              style={{ backgroundColor: color.hex }}
              onClick={() => {
              onBackgroundChange(color.id);
              // Auto-clear text color if pairing becomes invalid
              if (textColor && !isValidPairing(color.id, textColor)) {
                onTextColorChange(getValidTextColors(color.id)[0]);
              }
            }}
              aria-label={`${color.name}${backgroundColor === color.id ? ' (selected)' : ''}`}
              aria-pressed={backgroundColor === color.id}
              title={color.name}
            >
              {backgroundColor === color.id && (
                <CheckIcon
                  className="color-swatch-check"
                  style={{ color: color.isLight ? '#1A1A1A' : '#FAF8F5' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Text Color */}
      <div className="visuals-section">
        <h3 className="visuals-section-title">Text</h3>
        <div className="visuals-swatches">
          {COLORS.map((color) => {
            const isValid = backgroundColor ? isValidPairing(backgroundColor, color.id) : true;
            return (
              <button
                key={color.id}
                className="color-swatch"
                data-selected={textColor === color.id}
                data-disabled={!isValid}
                style={{ backgroundColor: color.hex }}
                onClick={() => isValid && onTextColorChange(color.id)}
                disabled={!isValid}
                aria-label={`${color.name}${textColor === color.id ? ' (selected)' : ''}${!isValid ? ' (not enough contrast)' : ''}`}
                aria-pressed={textColor === color.id}
                title={isValid ? color.name : `${color.name} - not enough contrast`}
              >
                {textColor === color.id && (
                  <CheckIcon
                    className="color-swatch-check"
                    style={{ color: color.isLight ? '#1A1A1A' : '#FAF8F5' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Family */}
      <div className="visuals-section">
        <h3 className="visuals-section-title">Font</h3>
        <div className="visuals-fonts">
          {FONTS.map((fontOption) => (
            <button
              key={fontOption.id}
              className="font-preview"
              data-selected={font === fontOption.id}
              onClick={() => onFontChange(fontOption.id)}
              aria-label={`${fontOption.name}${font === fontOption.id ? ' (selected)' : ''}`}
              aria-pressed={font === fontOption.id}
            >
              <span
                className="font-preview-sample"
                style={{ fontFamily: fontOption.family }}
              >
                {fontOption.sampleText}
              </span>
              <span className="font-preview-name">{fontOption.name}</span>
              {font === fontOption.id && (
                <CheckIcon className="font-preview-check" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Live Preview */}
      <div
        className="visuals-preview"
        style={{
          backgroundColor: previewBg,
          color: previewText,
          ...previewFontStyle,
        }}
      >
        <p className="visuals-preview-text">
          This is how your dreamtree will look.
        </p>
      </div>
    </div>
  );
}
