'use client';

import { useState, useEffect, useRef } from 'react';
import {
  BackgroundColorId,
  TextColorId,
  FontFamilyId,
  AnimationSpeed,
  COLORS,
  FONTS,
  ANIMATION_OPTIONS,
  getColorById,
  getFontStyle,
  getValidTextColors,
  isValidPairing,
} from './types';
import { ANIMATION_SPEEDS } from '@/lib/theme';

const PREVIEW_TEXT = "This is how text will appear.";

function AnimatedPreview({ speed, trigger }: { speed: AnimationSpeed; trigger: number }) {
  const [displayedText, setDisplayedText] = useState('');
  const [cycle, setCycle] = useState(0);
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Restart animation when speed changes or cycle increments
  useEffect(() => {
    const speedMs = ANIMATION_SPEEDS[speed];

    // Cancel any existing animation/timeout
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Instant display for 'off'
    if (speedMs === 0) {
      setDisplayedText(PREVIEW_TEXT);
      // Still cycle after 5 seconds
      timeoutRef.current = setTimeout(() => setCycle(c => c + 1), 5000);
      return;
    }

    // Animate typing
    let startTime: number | null = null;
    let lastCharIndex = -1;
    setDisplayedText('');

    const animate = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const charIndex = Math.min(Math.floor(elapsed / speedMs), PREVIEW_TEXT.length);

      if (charIndex !== lastCharIndex) {
        lastCharIndex = charIndex;
        setDisplayedText(PREVIEW_TEXT.slice(0, charIndex));
      }

      if (charIndex < PREVIEW_TEXT.length) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete - wait 5 seconds then restart
        timeoutRef.current = setTimeout(() => setCycle(c => c + 1), 5000);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [speed, cycle, trigger]);

  return <>{displayedText}<span className="typing-cursor">|</span></>;
}

interface VisualsStepProps {
  backgroundColor: BackgroundColorId | null;
  textColor: TextColorId | null;
  font: FontFamilyId | null;
  textSize: number;
  animationSpeed: AnimationSpeed;
  onBackgroundChange: (color: BackgroundColorId) => void;
  onTextColorChange: (color: TextColorId) => void;
  onFontChange: (font: FontFamilyId) => void;
  onTextSizeChange: (size: number) => void;
  onAnimationSpeedChange: (speed: AnimationSpeed) => void;
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
  textSize,
  animationSpeed,
  onBackgroundChange,
  onTextColorChange,
  onFontChange,
  onTextSizeChange,
  onAnimationSpeedChange,
}: VisualsStepProps) { // code_id:256
  const previewBg = backgroundColor ? getColorById(backgroundColor).hex : undefined;
  const previewText = textColor ? getColorById(textColor).hex : undefined;
  const previewFontStyle = font ? getFontStyle(font) : {};
  const previewFontSize = previewFontStyle.fontSize
    ? `calc(${previewFontStyle.fontSize} * ${textSize})`
    : `calc(1rem * ${textSize})`;

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
                style={{
                  fontFamily: fontOption.family,
                  fontSize: fontOption.baseSizePx ? `${fontOption.baseSizePx}px` : undefined,
                  letterSpacing: fontOption.letterSpacing,
                }}
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

      {/* Text Size */}
      <div className="visuals-section">
        <h3 className="visuals-section-title">
          Text Size <span className="visuals-size-value">{Math.round(textSize * 100)}%</span>
        </h3>
        <div className="visuals-slider">
          <span className="visuals-slider-label">A</span>
          <input
            type="range"
            min="0.8"
            max="1.4"
            step="0.05"
            value={textSize}
            onChange={(e) => onTextSizeChange(parseFloat(e.target.value))}
            className="visuals-slider-input"
            aria-label="Text size"
          />
          <span className="visuals-slider-label visuals-slider-label-lg">A</span>
        </div>
      </div>

      {/* Animation Speed */}
      <div className="visuals-section">
        <h3 className="visuals-section-title">Animation</h3>
        <div className="visuals-animation-options">
          {ANIMATION_OPTIONS.map((option) => (
            <button
              key={option.id}
              className="animation-option"
              data-selected={animationSpeed === option.id}
              onClick={() => onAnimationSpeedChange(option.id)}
              aria-label={`${option.label}${animationSpeed === option.id ? ' (selected)' : ''}`}
              aria-pressed={animationSpeed === option.id}
            >
              <span className="animation-option-label">{option.label}</span>
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
          fontSize: previewFontSize,
        }}
      >
        <p className="visuals-preview-text">
          <AnimatedPreview speed={animationSpeed} trigger={0} />
        </p>
      </div>
    </div>
  );
}
