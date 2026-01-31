'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ConversationThread } from '../conversation/ConversationThread';
import { AcornIcon } from '../icons';
import { applyTheme, ANIMATION_SPEEDS } from '@/lib/theme';
import {
  OnboardingData,
  BackgroundColorId,
  TextColorId,
  FontFamilyId,
  AnimationSpeed,
  COLORS,
  FONTS,
  ANIMATION_OPTIONS,
  getValidTextColors,
  isValidPairing,
} from './types';

const PREVIEW_TEXT = "This is how text will appear.";

function AnimatedPreview({ speed }: { speed: AnimationSpeed }) {
  const [displayedText, setDisplayedText] = useState('');
  const [cycle, setCycle] = useState(0);
  const animationRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const speedMs = ANIMATION_SPEEDS[speed];

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (speedMs === 0) {
      setDisplayedText(PREVIEW_TEXT);
      timeoutRef.current = setTimeout(() => setCycle(c => c + 1), 5000);
      return;
    }

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
  }, [speed, cycle]);

  return <>{displayedText}<span className="typing-cursor">|</span></>;
}
import type { Message, ContentBlock, UserResponseContent } from '../conversation/types';

const STORAGE_KEY = 'dreamtree_onboarding';
const STORAGE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
  initialStep?: number;
}

interface StoredProgress {
  step: number;
  data: {
    name: string;
    backgroundColor: BackgroundColorId | null;
    textColor: TextColorId | null;
    font: FontFamilyId | null;
    textSize: number;
    animationSpeed: AnimationSpeed;
  };
  timestamp: number;
}

// Simple 3-step flow: welcome → name → visuals (all together)
type StepType = 'welcome' | 'name' | 'visuals';

function saveProgress(step: number, data: StoredProgress['data']) { // code_id:246
  if (typeof window === 'undefined') return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ step, data, timestamp: Date.now() })
  );
}

function loadProgress(): StoredProgress | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;

  try {
    const parsed: StoredProgress = JSON.parse(saved);
    if (Date.now() - parsed.timestamp > STORAGE_EXPIRY) { // code_id:247
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function clearProgress() { // code_id:248
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) { // code_id:244
  const [step, setStep] = useState<StepType>('welcome');
  const [data, setData] = useState<{
    name: string;
    backgroundColor: BackgroundColorId | null;
    textColor: TextColorId | null;
    font: FontFamilyId | null;
    textSize: number;
    animationSpeed: AnimationSpeed;
  }>({
    name: '',
    backgroundColor: null,
    textColor: null,
    font: null,
    textSize: 1.0,
    animationSpeed: 'normal',
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Load saved progress on mount
  useEffect(() => {
    const saved = loadProgress();
    if (saved && saved.data.name) {
      setData({ ...saved.data, textSize: saved.data.textSize ?? 1.0, animationSpeed: saved.data.animationSpeed ?? 'normal' });
      setNameInput(saved.data.name);
      if (saved.step >= 2) {
        setStep('visuals');
      } else {
        setStep('name');
      }
    }
    setIsLoaded(true);
  }, []);

  // Save progress on changes
  useEffect(() => {
    if (isLoaded && step !== 'welcome') {
      const stepNum = step === 'name' ? 1 : 2;
      saveProgress(stepNum, data);
    }
  }, [step, data, isLoaded]);

  // Apply live theme preview
  useEffect(() => {
    if (data.backgroundColor && data.textColor && data.font) {
      applyTheme({
        backgroundColor: data.backgroundColor,
        textColor: data.textColor,
        font: data.font,
        textSize: data.textSize,
      });
    }
  }, [data.backgroundColor, data.textColor, data.font, data.textSize]);

  // Focus input when showing name step
  useEffect(() => {
    if (step === 'name') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  // Build messages for conversation thread
  const messages: Message[] = [];

  if (step === 'name') {
    messages.push({
      id: 'msg-name-ask',
      type: 'content',
      data: [{ type: 'paragraph', text: "What should we call you?" }] as ContentBlock[],
      timestamp: new Date(),
    });
  }

  if (step === 'visuals') {
    // Greeting and visuals intro
    messages.push({
      id: 'msg-visuals-intro',
      type: 'content',
      data: [
        { type: 'paragraph', text: `Nice to meet you, ${data.name}! Let's make this space yours.` },
        { type: 'paragraph', text: "Choose colors and a font that feel right to you. You can change these anytime." },
      ] as ContentBlock[],
      timestamp: new Date(),
    });
  }

  // Handlers
  const handleNameSubmit = useCallback(() => {
    if (nameInput.trim()) {
      setData(prev => ({ ...prev, name: nameInput.trim() }));
      setStep('visuals');
    }
  }, [nameInput]);

  const handleBackgroundSelect = useCallback((bgId: BackgroundColorId) => {
    setData(prev => {
      const newData = { ...prev, backgroundColor: bgId };
      // Auto-fix text color if pairing becomes invalid
      if (prev.textColor && !isValidPairing(bgId, prev.textColor)) {
        newData.textColor = getValidTextColors(bgId)[0];
      }
      return newData;
    });
  }, []);

  const handleTextSelect = useCallback((textId: TextColorId) => {
    setData(prev => ({ ...prev, textColor: textId }));
  }, []);

  const handleFontSelect = useCallback((fontId: FontFamilyId) => {
    setData(prev => ({ ...prev, font: fontId }));
  }, []);

  const handleTextSizeChange = useCallback((size: number) => {
    setData(prev => ({ ...prev, textSize: size }));
  }, []);

  const handleAnimationSpeedChange = useCallback((speed: AnimationSpeed) => {
    setData(prev => ({ ...prev, animationSpeed: speed }));
  }, []);

  const handleComplete = useCallback(() => {
    if (data.backgroundColor && data.textColor && data.font) {
      clearProgress();
      onComplete(data as OnboardingData);
    }
  }, [data, onComplete]);

  const isVisualsComplete = data.backgroundColor && data.textColor && data.font;

  // Global Enter key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { // code_id:245
      if (e.key === 'Enter') {
        if (step === 'welcome') {
          e.preventDefault();
          setStep('name');
        } else if (step === 'name' && nameInput.trim()) {
          e.preventDefault();
          handleNameSubmit();
        } else if (step === 'visuals' && isVisualsComplete) {
          e.preventDefault();
          handleComplete();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, nameInput, isVisualsComplete, handleNameSubmit, handleComplete]);

  // Don't render until we've checked localStorage
  if (!isLoaded) {
    return (
      <div className="onboarding-chat">
        <div className="onboarding-chat-content" />
      </div>
    );
  }

  return (
    <div className="onboarding-chat">
      {/* Welcome screen */}
      {step === 'welcome' && (
        <div className="onboarding-welcome">
          <div className="welcome-brand" aria-hidden="true">
            <AcornIcon className="welcome-brand-icon" />
            <span className="welcome-brand-text">dreamtree</span>
          </div>
          <h1 className="welcome-title">Welcome</h1>
          <p className="welcome-description">
            We&apos;re here to discover what you already know. There are no wrong answers, only honest ones.
          </p>
          <button
            className="button button-primary button-lg"
            onClick={() => setStep('name')}
          >
            Get Started
          </button>
        </div>
      )}

      {/* Name step */}
      {step === 'name' && (
        <div className="onboarding-chat-content">
          <ConversationThread messages={messages} autoScrollOnNew={true} disableAnimation={true} />
          <div className="onboarding-input-area">
            <input
              ref={inputRef}
              type="text"
              className="onboarding-name-input"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your name"
              maxLength={50}
              autoComplete="given-name"
            />
            <button
              className="button button-primary"
              onClick={handleNameSubmit}
              disabled={!nameInput.trim()}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Visuals step - all 3 selectors together */}
      {step === 'visuals' && (
        <div className="onboarding-chat-content">
          <ConversationThread messages={messages} autoScrollOnNew={true} disableAnimation={true} />

          <div className="onboarding-visuals-panel">
            {/* Background color */}
            <div className="visuals-section">
              <h3 className="visuals-section-title">Background</h3>
              <div className="visuals-swatches">
                {COLORS.map((color) => (
                  <button
                    key={color.id}
                    className="color-swatch"
                    style={{ backgroundColor: color.hex }}
                    onClick={() => handleBackgroundSelect(color.id)}
                    data-selected={data.backgroundColor === color.id}
                    aria-label={color.name}
                    title={color.name}
                  >
                    {data.backgroundColor === color.id && (
                      <CheckIcon color={color.isLight ? '#1A1A1A' : '#FAF8F5'} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Text color */}
            <div className="visuals-section">
              <h3 className="visuals-section-title">Text</h3>
              <div className="visuals-swatches">
                {COLORS.map((color) => {
                  const isValid = data.backgroundColor ? isValidPairing(data.backgroundColor, color.id) : true;
                  return (
                    <button
                      key={color.id}
                      className="color-swatch"
                      style={{ backgroundColor: color.hex, opacity: isValid ? 1 : 0.3 }}
                      onClick={() => isValid && handleTextSelect(color.id)}
                      disabled={!isValid}
                      data-selected={data.textColor === color.id}
                      aria-label={`${color.name}${!isValid ? ' (not enough contrast)' : ''}`}
                      title={isValid ? color.name : `${color.name} - not enough contrast`}
                    >
                      {data.textColor === color.id && (
                        <CheckIcon color={color.isLight ? '#1A1A1A' : '#FAF8F5'} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font */}
            <div className="visuals-section">
              <h3 className="visuals-section-title">Font</h3>
              <div className="visuals-fonts">
                {FONTS.map((fontOption) => (
                  <button
                    key={fontOption.id}
                    className="font-preview"
                    onClick={() => handleFontSelect(fontOption.id)}
                    data-selected={data.font === fontOption.id}
                    aria-label={fontOption.name}
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
                    {data.font === fontOption.id && (
                      <CheckIcon className="font-preview-check" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Size */}
            <div className="visuals-section">
              <h3 className="visuals-section-title">
                Text Size <span className="visuals-size-value">{Math.round(data.textSize * 100)}%</span>
              </h3>
              <div className="visuals-slider">
                <span className="visuals-slider-label">A</span>
                <input
                  type="range"
                  min="0.8"
                  max="1.4"
                  step="0.05"
                  value={data.textSize}
                  onChange={(e) => handleTextSizeChange(parseFloat(e.target.value))}
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
                    data-selected={data.animationSpeed === option.id}
                    onClick={() => handleAnimationSpeedChange(option.id)}
                    aria-label={`${option.label}${data.animationSpeed === option.id ? ' (selected)' : ''}`}
                    aria-pressed={data.animationSpeed === option.id}
                  >
                    <span className="animation-option-label">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {data.backgroundColor && data.textColor && (
              <div className="visuals-preview">
                <p className="visuals-preview-text">
                  <AnimatedPreview speed={data.animationSpeed} />
                </p>
              </div>
            )}
          </div>

          <div className="onboarding-continue">
            <button
              className="button button-primary button-lg"
              onClick={handleComplete}
              disabled={!isVisualsComplete}
            >
              Let&apos;s do this.
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple check icon
function CheckIcon({ color = 'currentColor', className = '' }: { color?: string; className?: string }) { // code_id:249
  return (
    <svg
      className={`color-swatch-check ${className}`}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
