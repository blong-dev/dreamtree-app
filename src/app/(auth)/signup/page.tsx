'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TextInput, Checkbox } from '@/components/forms';

export default function SignupPage() { // code_id:125
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => { // code_id:126
    e.preventDefault();
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, marketingConsent }),
      });

      const data: { success?: boolean; error?: string; needsOnboarding?: boolean } = await response.json();

      if (!response.ok) {
        setError(data.error || 'Signup failed');
        return;
      }

      // Redirect to onboarding to complete profile setup
      router.push('/onboarding');
    } catch (err) {
      // IMP-025: Differentiate error types
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Unable to connect. Check your internet connection.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Create your account</h1>
          <p>Start your career design journey</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <TextInput
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            disabled={isLoading}
            autoFocus
          />

          <div className="auth-password-field">
            <label className="text-input-label" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              className="text-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              disabled={isLoading}
            />
            <span className="text-input-helper">
              Must include uppercase, lowercase, and a number
            </span>
          </div>

          <div className="auth-password-field">
            <label className="text-input-label" htmlFor="confirm-password">
              Confirm password
            </label>
            <input
              type="password"
              id="confirm-password"
              className="text-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              disabled={isLoading}
            />
          </div>

          <Checkbox
            id="marketing-consent"
            label="Keep me in the loop"
            checked={marketingConsent}
            onChange={setMarketingConsent}
            disabled={isLoading}
          />

          <button
            type="submit"
            className="button button-primary auth-submit"
            disabled={isLoading || !email || !password || !confirmPassword}
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <a href="/login" className="auth-link">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
