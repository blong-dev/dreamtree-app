'use client';

import { useState, FormEvent } from 'react';

interface WaitlistFormProps {
  /** Source identifier for tracking (e.g., 'landing', 'coming-soon') */
  source?: string;
  /** Placeholder text for email input */
  placeholder?: string;
  /** Button text */
  buttonText?: string;
  /** Success message after signup */
  successMessage?: string;
}

export function WaitlistForm({
  source = 'landing',
  placeholder = 'Enter your email',
  buttonText = 'Join Waitlist',
  successMessage = "You're on the list!",
}: WaitlistFormProps) { // code_id:919
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => { // code_id:920
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage('Please enter your email');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join waitlist');
      }

      setStatus('success');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  if (status === 'success') {
    return (
      <div className="waitlist-form waitlist-success">
        <p>{successMessage}</p>
      </div>
    );
  }

  return (
    <form className="waitlist-form" onSubmit={handleSubmit}>
      <div className="waitlist-input-group">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          className="waitlist-input"
          disabled={status === 'loading'}
          aria-label="Email address"
        />
        <button
          type="submit"
          className="button button-primary waitlist-button"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Joining...' : buttonText}
        </button>
      </div>
      {status === 'error' && errorMessage && (
        <p className="waitlist-error">{errorMessage}</p>
      )}
    </form>
  );
}
