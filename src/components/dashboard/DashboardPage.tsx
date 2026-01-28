'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, NavItemId } from '@/components/shell';
import { TOCPanel, WorkbookProgress } from '@/components/overlays';
import {
  DashboardGreeting,
  DailyDoList,
  ProgressMetrics,
  ProfilePreview,
  TOCInline,
  DailyDo,
  ProgressMetricData,
  UserPreview,
  TOCPartData,
} from '@/components/dashboard';
import { useApplyTheme } from '@/hooks/useApplyTheme';
import { useToast, ErrorBoundary } from '@/components/feedback';

// IMP-023: Inline fallback for widget crashes
function WidgetErrorFallback() { // code_id:186
  return (
    <div className="dashboard-widget-error">
      <p>Unable to load this section.</p>
    </div>
  );
}

interface DashboardPageProps {
  userName: string;
  userPreview: UserPreview;
  dailyDos: DailyDo[];
  progressMetrics: ProgressMetricData[];
  tocParts: TOCPartData[];
  currentExerciseId: string;
}

// Convert TOCPartData to WorkbookProgress format for TOCPanel
function toWorkbookProgress(parts: TOCPartData[]): WorkbookProgress { // code_id:187
  return {
    parts: parts.map((part) => ({
      id: part.id,
      title: part.title,
      status: part.status,
      percentComplete: part.progress,
      modules: part.modules.map((mod) => ({
        id: mod.id,
        title: mod.title,
        status: mod.status,
        exercises: mod.exercises.map((ex) => ({
          id: ex.id,
          title: ex.title,
          status: ex.status,
        })),
      })),
    })),
  };
}

export function DashboardPage({
  userName,
  userPreview,
  dailyDos,
  progressMetrics,
  tocParts,
  currentExerciseId,
}: DashboardPageProps) { // code_id:184
  const router = useRouter();
  const { showToast } = useToast();
  const [showTOC, setShowTOC] = useState(false);
  const [activeNavItem, setActiveNavItem] = useState<NavItemId>('home');

  // Apply user's theme on mount
  useApplyTheme({
    backgroundColor: userPreview.backgroundColor,
    textColor: userPreview.textColor,
    font: userPreview.fontFamily,
  });

  const handleNavigate = useCallback(
    (id: NavItemId) => {
      setActiveNavItem(id);
      if (id === 'contents') {
        setShowTOC(true);
      } else if (id === 'profile') {
        router.push('/profile');
      } else if (id === 'tools') {
        router.push('/tools');
      }
    },
    [router]
  );

  const handleTOCNavigate = useCallback(
    (location: import('@/components/overlays').BreadcrumbLocation) => {
      setShowTOC(false);
      if (location.exerciseId) {
        router.push(`/workbook/${location.exerciseId}`);
      }
    },
    [router]
  );

  const handleLogout = async () => { // code_id:185
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('[Dashboard] Logout error:', error);
      showToast('Logout failed. Please try again.', { type: 'error' });
    }
  };

  return (
    <>
      <AppShell
        activeNavItem={activeNavItem}
        onNavigate={handleNavigate}
        showBreadcrumb={false}
        showInput={false}
      >
        <div className="dashboard">
          <DashboardGreeting name={userName} />

          <section className="dashboard-section">
            <button
              className="button button-primary"
              style={{ width: '100%', marginBottom: 'var(--space-4)' }}
              onClick={() => router.push(`/workbook/${currentExerciseId}`)}
            >
              Continue Learning
            </button>
          </section>

          {dailyDos.length > 0 && (
            <section className="dashboard-section">
              <h2 className="dashboard-section-title">Daily Do&apos;s</h2>
              <ErrorBoundary fallback={<WidgetErrorFallback />}>
                <DailyDoList items={dailyDos} />
              </ErrorBoundary>
            </section>
          )}

          <section className="dashboard-section">
            <h2 className="dashboard-section-title">Your Progress</h2>
            <ErrorBoundary fallback={<WidgetErrorFallback />}>
              <ProgressMetrics metrics={progressMetrics} />
            </ErrorBoundary>
          </section>

          <section className="dashboard-section">
            <h2 className="dashboard-section-title">Profile Preview</h2>
            <ErrorBoundary fallback={<WidgetErrorFallback />}>
              <ProfilePreview user={userPreview} />
            </ErrorBoundary>
          </section>

          <section className="dashboard-section">
            <h2 className="dashboard-section-title">Workbook</h2>
            <ErrorBoundary fallback={<WidgetErrorFallback />}>
              <TOCInline
                parts={tocParts}
                onNavigate={handleTOCNavigate}
              />
            </ErrorBoundary>
            <button
              className="button button-ghost button-sm"
              style={{ marginTop: 'var(--space-4)' }}
              onClick={() => setShowTOC(true)}
            >
              View All
            </button>
          </section>

          <section className="dashboard-section">
            <button
              className="button button-ghost button-sm"
              style={{ marginTop: 'var(--space-4)' }}
              onClick={handleLogout}
            >
              Sign Out
            </button>
          </section>
        </div>
      </AppShell>

      <TOCPanel
        open={showTOC}
        onClose={() => setShowTOC(false)}
        progress={toWorkbookProgress(tocParts)}
        onNavigate={handleTOCNavigate}
      />
    </>
  );
}
