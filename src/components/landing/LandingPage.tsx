'use client';

import { useRouter } from 'next/navigation';
import { LogoNav } from './LogoNav';
import { AnnouncementBanner } from './AnnouncementBanner';

export function LandingPage() { // code_id:243
  const router = useRouter();

  return (
    <div className="landing-page">
      <header className="landing-header">
        <LogoNav currentPath="/" />
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

      <main className="landing-main">
        <AnnouncementBanner source="landing" />

        <section className="landing-hero">
          <div className="landing-hero-content">
            <h1>Figure Out What&apos;s Next</h1>
            <p className="landing-hero-subtitle">
              The workbook for career transitions. Clarity that executives pay
              coaches thousands for, available to everyone.
            </p>
            <div className="landing-hero-actions">
              <button
                className="button button-primary button-lg"
                onClick={() => router.push('/signup')}
              >
                Get Started
              </button>
            </div>
          </div>
        </section>

        <section className="landing-features">
          <div className="landing-feature">
            <div className="landing-feature-icon">1</div>
            <h3>Uncover Your Skills</h3>
            <p>A real conversation about what you&apos;re good at — the patterns you couldn&apos;t see alone.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">2</div>
            <h3>Build Your Story</h3>
            <p>Turn your experience into stories you can tell with confidence.</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon">3</div>
            <h3>Find Your Direction</h3>
            <p>Clarity on what&apos;s next. A direction that fits who you are.</p>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>Your personal data is encrypted. We can&apos;t read it. That&apos;s the point.</p>
        <nav className="landing-footer-nav">
          <a href="/about">About</a>
          <a href="/principles">Principles</a>
          <a href="https://github.com/blong-dev/DreamTree" target="_blank" rel="noopener noreferrer">GitHub</a>
        </nav>
      </footer>
    </div>
  );
}
