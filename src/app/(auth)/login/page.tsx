'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TextInput } from '@/components/forms';

export default function LoginPage() { // code_id:123
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => { // code_id:124
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data: { success?: boolean; error?: string; needsOnboarding?: boolean } = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Redirect based on onboarding status
      if (data.needsOnboarding) {
        router.push('/onboarding');
      } else {
        router.push('/');
      }
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
          <h1>Welcome back</h1>
          <p>Sign in to continue your journey</p>
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
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="button button-primary auth-submit"
            disabled={isLoading || !email || !password}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don&apos;t have an account?{' '}
            <a href="/signup" className="auth-link">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
