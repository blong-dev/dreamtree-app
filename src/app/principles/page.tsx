'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogoNav } from '@/components/landing/LogoNav';
import { AnnouncementBanner } from '@/components/landing/AnnouncementBanner';

export default function PrinciplesPage() { // code_id:866
  const router = useRouter();

  return (
    <div className="about-page">
      <header className="landing-header">
        <LogoNav currentPath="/principles" />
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

      <AnnouncementBanner source="principles" />

      <main className="about-main">
        <article className="about-content">
          <h1>What We Believe</h1>

          <p><em>The principles behind DreamTree — and why they matter for your career.</em></p>

          <hr />

          <h2>The Principles</h2>

          <h3>1. Human contribution is the foundation of all value.</h3>

          <p>
            Every skill you have, every story you tell, every insight you&apos;ve earned — these
            came from you. The digital economy has obscured this truth, extracting value from
            attention while leaving creators unrecognized. DreamTree helps you see clearly
            what you have to offer, and own it fully.
          </p>

          <h3>2. What you create belongs to you.</h3>

          <p>
            Your data, your story, your work — these are not raw materials for others to harvest.
            They are yours. Your DreamTree workbook is encrypted with keys only you control.
            We can&apos;t read it. Export everything anytime. Delete everything permanently.
            That&apos;s the point.
          </p>

          <h3>3. Knowledge should be free to use, but never free of its history.</h3>

          <p>
            Your skills came from somewhere — teachers, experiences, struggles, victories.
            Every insight stands on shoulders. DreamTree helps you trace that lineage, turning
            scattered memories into a coherent story you can tell with confidence.
          </p>

          <h3>4. Barriers to self-knowledge are barriers to human flourishing.</h3>

          <p>
            The clarity that executives pay thousands for, you deserve too. Career coaches,
            assessments, structured reflection — these shouldn&apos;t be luxuries. DreamTree
            is free because the marginal cost of sharing knowledge is zero, and because
            hoarding wisdom diminishes us all.
          </p>

          <h3>5. Abundance is the horizon; cooperation is the path.</h3>

          <p>
            In the long game, cooperation wins. Elinor Ostrom won a Nobel Prize proving it.
            DreamTree is built on that bet: helping you succeed helps everyone. Your growth
            is not zero-sum. Your clarity creates ripples.
          </p>

          <h3>6. Attention is finite; contribution compounds.</h3>

          <p>
            The attention economy extracts until exhaustion. We all feel it. DreamTree is
            different: the work you do here compounds. Every skill you name, every story
            you write, every value you clarify becomes yours to keep and build on. We choose
            to build, not extract.
          </p>

          <h3>7. Power without wisdom is adolescence.</h3>

          <p>
            We are living through the adolescence of artificial intelligence — and perhaps
            our own. Maturity means aligning capability with conscience. DreamTree asks not
            just &quot;what can you do?&quot; but &quot;what should you do?&quot; Self-knowledge
            is the beginning of wisdom.
          </p>

          <h3>8. Centralization is fragility; distribution is resilience.</h3>

          <p>
            When power concentrates, it corrupts — not always through malice, but through
            the quiet displacement of conscience by convenience. Your data lives with you,
            not locked in our database. You can export everything, anytime. We are stewards,
            not gatekeepers.
          </p>

          <h3>9. The world takes care of those who take care of the world.</h3>

          <p>
            Not always. Not immediately. But often enough to bet on. DreamTree is free
            because we believe generosity compounds. We plant seeds knowing we may not sit
            in their shade. We give freely because giving is not losing — it is growing.
          </p>

          <h3>10. The story is still being written.</h3>

          <p>
            We are the last generation to remember a time before omnipresent intelligence,
            and the first to raise children who will never know its absence. Your story is
            part of that larger story. DreamTree helps you write it clearly. The ending is
            not yet written.
          </p>

          <hr />

          <h2>In Practice</h2>

          <p>
            DreamTree is the workbook for career transitions — comprehensive, research-backed,
            and entirely yours. Three parts. Fifteen modules. Sixty exercises. The clarity
            that executives pay thousands for.
          </p>

          <p>
            Your data is encrypted with keys only you control. You can export everything.
            You can delete everything. We&apos;re steward-owned, which means we cannot be
            acquired and profits stay in the mission.
          </p>

          <p>We are early. There is work to do.</p>

          <hr />

          <h2>Start</h2>

          <p>The code is open. The principles are public. The workbook is free.</p>

          <p>We know this is the difficult path. It is also the right path.</p>

          <p><em>DreamTree, 2026</em></p>

          <hr />

          <p style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link
              href="/manifesto/problem"
              style={{
                fontSize: '1.1rem',
                fontWeight: 500,
              }}
            >
              The philosophy behind this →
            </Link>
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
