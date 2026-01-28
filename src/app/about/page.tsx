'use client';

import { useRouter } from 'next/navigation';
import { LogoNav } from '@/components/landing/LogoNav';
import { AnnouncementBanner } from '@/components/landing/AnnouncementBanner';

export default function AboutPage() { // code_id:127
  const router = useRouter();

  return (
    <div className="about-page">
      <header className="landing-header">
        <LogoNav currentPath="/about" />
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

      <AnnouncementBanner source="about" />

      <main className="about-main">
        <article className="about-content">
          <h1>Why DreamTree Exists</h1>

          <p>
            Most career tools give you a quiz and a label. Here&apos;s your personality type.
            Here are jobs that match. Good luck.
          </p>

          <p>That&apos;s not coaching. That&apos;s a sorting hat.</p>

          <p>
            Real career work is harder. It&apos;s sitting with someone who asks good questions,
            listens to your answers, and helps you see patterns you couldn&apos;t see alone.
            It&apos;s building stories from your experience. It&apos;s clarifying what you actually
            value — not what you think you should value.
          </p>

          <p>
            That kind of work used to cost thousands of dollars. Executives get it.
            Everyone else gets a quiz.
          </p>

          <p>DreamTree is an attempt to change that.</p>

          <hr />

          <h2>What This Is</h2>

          <p>
            The workbook for career transitions. Three parts, fifteen modules, sixty exercises.
          </p>

          <p>
            It&apos;s comprehensive because career transitions deserve more than a 5-minute assessment.
          </p>

          <p>
            It&apos;s conversational because forms feel like paperwork, and paperwork doesn&apos;t change lives.
          </p>

          <p>
            It&apos;s free because barriers shouldn&apos;t exist between people and clarity.
          </p>

          <hr />

          <h2>Standing on Shoulders</h2>

          <p>
            DreamTree synthesizes decades of research from career development, positive psychology,
            life design, and coaching practice. The frameworks draw from vocational psychology,
            personality research, storytelling theory, and negotiation science.
          </p>

          <p>We didn&apos;t invent this field. We&apos;re just trying to make it accessible.</p>

          <hr />

          <h2>What We Believe</h2>

          <p>
            <strong>Your data belongs to you.</strong> Not to us. Not to advertisers.
            Your personal information is encrypted with keys only you control.
            We built it so we <em>can&apos;t</em> read your data — not as policy, but as math.
          </p>

          <p>
            <strong>No gamification.</strong> No points. No badges. No streaks.
            You&apos;re not a user to be retained. You&apos;re a person doing important work.
          </p>

          <p>
            <strong>Open source.</strong> The code is public. The principles are public.
            Trust requires transparency.
          </p>

          <p>
            <strong>Technology should recede.</strong> The best tools don&apos;t demand your attention —
            they serve your intention. DreamTree should feel like sitting with a thoughtful friend,
            not filling out an application.
          </p>

          <hr />

          <h2>The Bigger Picture</h2>

          <p>
            DreamTree is the first step toward something larger — a world where the value you create
            is tracked, attributed, and returned to you. Where your contributions aren&apos;t extracted
            by platforms but owned by you.
          </p>

          <p>
            We call this the contribution economy. It&apos;s not built yet. But it starts here,
            with tools that respect the people who use them.
          </p>

          <p>
            <a href="/principles">Read our Principles</a> to go deeper.
          </p>
        </article>
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
