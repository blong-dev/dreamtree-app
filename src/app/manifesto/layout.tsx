'use client';

import { useRouter } from 'next/navigation';
import { AcornIcon } from '@/components/icons';

export default function ManifestoLayout({
  children,
}: {
  children: React.ReactNode;
}) { // code_id:903
  const router = useRouter();

  return (
    <div className="about-page">
      <header className="landing-header">
        <div
          className="landing-logo"
          onClick={() => router.push('/')}
          style={{ cursor: 'pointer' }}
        >
          <AcornIcon width={32} height={32} />
          <span className="landing-wordmark">dreamtree</span>
        </div>
        <nav className="landing-nav">
          <button
            className="button button-ghost button-sm"
            onClick={() => router.push('/login')}
          >
            Sign In
          </button>
          <button
            className="button button-primary button-sm"
            onClick={() => router.push('/signup')}
          >
            Get Started
          </button>
        </nav>
      </header>

      {children}

      <footer className="landing-footer">
        <p>Your personal data is encrypted. We can&apos;t read it. That&apos;s the point.</p>
        <nav className="landing-footer-nav">
          <a href="/about">About</a>
          <a href="/principles">Principles</a>
          <a
            href="https://github.com/blong-dev/DreamTree"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </nav>
      </footer>
    </div>
  );
}
