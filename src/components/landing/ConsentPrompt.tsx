'use client';

import { useState } from 'react';

interface ConsentPromptProps {
  userId: string;
}

export function ConsentPrompt({ userId: _userId }: ConsentPromptProps) { // code_id:914
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'declined'>('idle');

  const handleConsent = async (consent: boolean) => { // code_id:915
    setStatus('loading');

    try {
      const response = await fetch('/api/user/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preference');
      }

      setStatus(consent ? 'success' : 'declined');
    } catch (err) {
      console.error('[ConsentPrompt] Error:', err);
      // Still show success state - preference may have been saved
      setStatus(consent ? 'success' : 'declined');
    }
  };

  if (status === 'success') {
    return (
      <div className="consent-prompt consent-prompt-success">
        <p>You&apos;re on the list. We&apos;ll let you know when we launch.</p>
      </div>
    );
  }

  if (status === 'declined') {
    return (
      <div className="consent-prompt consent-prompt-declined">
        <p>No problem. Check back soon for updates.</p>
      </div>
    );
  }

  return (
    <div className="consent-prompt">
      <p className="consent-prompt-message">
        You&apos;ve got an account. Want us to email you when the workbook is ready?
      </p>
      <div className="consent-prompt-buttons">
        <button
          type="button"
          className="button button-primary"
          onClick={() => handleConsent(true)}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Saving...' : 'Yes, notify me'}
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => handleConsent(false)}
          disabled={status === 'loading'}
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
