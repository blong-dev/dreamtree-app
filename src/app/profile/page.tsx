'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, NavItemId } from '@/components/shell';
import {
  DataPolicyBanner,
  ProfileHeader,
  ProfileSection,
  SkillsList,
  RankedList,
  DataControls,
} from '@/components/profile';
import { VisualsStep } from '@/components/onboarding/VisualsStep';
import { applyTheme } from '@/lib/theme';
import { useToast, ErrorBoundary } from '@/components/feedback';
import type { BackgroundColorId, TextColorId, FontFamilyId, AnimationSpeed } from '@/components/onboarding/types';
import { getValidTextColors } from '@/components/onboarding/types';

// IMP-023: Inline fallback for section crashes
function SectionErrorFallback() { // code_id:149
  return <p className="profile-placeholder">Unable to load this section.</p>;
}

interface ProfileApiResponse {
  profile: {
    displayName: string | null;
    headline: string | null;
    summary: string | null;
  };
  settings: {
    backgroundColor: string;
    textColor: string;
    font: string;
    textSize: number | null;
    animationSpeed: string;
    personalityType: string | null;
  };
  skills: Array<{
    id: string;
    skillId: string;
    name: string;
    category: string | null;
    mastery: number | null;
    rank: number | null;
  }>;
  values: {
    workValues: string | null;
    lifeValues: string | null;
    compassStatement: string | null;
  };
}

interface SkillDisplay {
  id: string;
  name: string;
  mastery: number;
}

interface RankedItem {
  id: string;
  name: string;
  rank: number;
}

export default function ProfilePage() { // code_id:146
  const router = useRouter();
  const { showToast } = useToast();
  const [activeNavItem, setActiveNavItem] = useState<NavItemId>('profile');
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('User');
  const [backgroundColor, setBackgroundColor] = useState<BackgroundColorId>('ivory');
  const [textColor, setTextColor] = useState<TextColorId>('charcoal');
  const [font, setFont] = useState<FontFamilyId>('inter');
  const [textSize, setTextSize] = useState<number>(1.0);
  const [animationSpeed, setAnimationSpeed] = useState<AnimationSpeed>('normal');
  const [skills, setSkills] = useState<SkillDisplay[]>([]);
  const [values, setValues] = useState<RankedItem[]>([]);

  // Appearance editing state
  const [isEditingAppearance, setIsEditingAppearance] = useState(false);
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);

  // Fetch profile data from API
  useEffect(() => {
    async function fetchProfile() { // code_id:150
      try {
        const response = await fetch('/api/profile');
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }
        const data: ProfileApiResponse = await response.json();

        // Set profile data
        setDisplayName(data.profile.displayName || 'User');
        const bgColor = (data.settings.backgroundColor || 'ivory') as BackgroundColorId;
        setBackgroundColor(bgColor);
        setTextColor((data.settings.textColor || getValidTextColors(bgColor)[0]) as TextColorId);
        setFont((data.settings.font || 'inter') as FontFamilyId);
        setTextSize(data.settings.textSize ?? 1.0);
        setAnimationSpeed((data.settings.animationSpeed || 'normal') as AnimationSpeed);

        // Transform skills for display
        const transformedSkills: SkillDisplay[] = data.skills.map((s) => ({
          id: s.id,
          name: s.name,
          mastery: s.mastery || 3,
        }));
        setSkills(transformedSkills);

        // Parse values from JSON strings if available
        if (data.values.workValues) {
          try {
            const parsedValues = JSON.parse(data.values.workValues);
            if (Array.isArray(parsedValues)) {
              const transformedValues: RankedItem[] = parsedValues.map((v: { id?: string; name?: string; value?: string }, i: number) => ({
                id: v.id || `v-${i}`,
                name: v.name || v.value || String(v),
                rank: i + 1,
              }));
              setValues(transformedValues);
            }
          } catch {
            // Values not in JSON format, skip
          }
        }
      } catch (error) {
        console.error('[Profile] Error fetching profile:', error);
        showToast('Failed to load profile', { type: 'error' });
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [showToast]);

  // Update CSS variables when appearance settings change
  useEffect(() => {
    if (backgroundColor && textColor && font) {
      applyTheme({ backgroundColor, textColor, font, textSize });
    }
  }, [backgroundColor, textColor, font, textSize]);

  const handleNavigate = useCallback(
    (id: NavItemId) => {
      setActiveNavItem(id);
      if (id === 'workbook') {
        router.push('/workbook');
      } else if (id === 'home') {
        router.push('/');
      } else if (id === 'tools') {
        router.push('/tools');
      }
    },
    [router]
  );

  const handleDownloadData = async () => { // code_id:147
    try {
      const response = await fetch('/api/profile/export');
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      const allData = await response.json();

      const blob = new Blob([JSON.stringify(allData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dreamtree-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[Profile] Error downloading data:', error);
      showToast('Failed to download data', { type: 'error' });
    }
  };

  const handleDeleteData = async () => { // code_id:148
    if (
      !confirm(
        'Are you sure you want to delete all your data? This cannot be undone.'
      )
    ) {
      return;
    }

    try {
      // Delete account (cascades to all user data)
      const response = await fetch('/api/profile', { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Show success briefly before redirect
      showToast('Account deleted', { type: 'success' });

      // Small delay to let the toast show, then redirect
      setTimeout(() => {
        router.push('/login');
      }, 500);
    } catch (error) {
      console.error('[Profile] Error deleting account:', error);
      // IMP-025: Differentiate network vs server errors for user
      // Never expose internal error details to users
      if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
        showToast('Unable to connect. Check your internet connection.', { type: 'error' });
      } else {
        showToast('Failed to delete account. Please try again.', { type: 'error' });
      }
    }
  };

  // Save appearance changes to API
  const handleSaveAppearance = useCallback(async () => {
    setIsSavingAppearance(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backgroundColor,
          textColor,
          font,
          textSize,
          animationSpeed,
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to save appearance');
      }
      setIsEditingAppearance(false);
      showToast('Appearance saved', { type: 'success' });
    } catch (error) {
      console.error('[Profile] Error saving appearance:', error);
      showToast('Failed to save appearance', { type: 'error' });
    } finally {
      setIsSavingAppearance(false);
    }
  }, [backgroundColor, textColor, font, textSize, animationSpeed, showToast]);

  if (loading) {
    return (
      <div className="onboarding-flow">
        <div className="onboarding-content" />
      </div>
    );
  }

  return (
    <AppShell
      activeNavItem={activeNavItem}
      onNavigate={handleNavigate}
      showBreadcrumb={false}
      showInput={false}
    >
      <div className="profile-page">
        <DataPolicyBanner />

        <ProfileHeader
          name={displayName}
          backgroundColor={backgroundColor}
          fontFamily={font}
          onEditAppearance={() => setIsEditingAppearance(true)}
        />

        {/* Inline Appearance Editor */}
        {isEditingAppearance && (
          <ProfileSection title="Edit Appearance">
            <VisualsStep
              backgroundColor={backgroundColor}
              textColor={textColor}
              font={font}
              textSize={textSize}
              animationSpeed={animationSpeed}
              onBackgroundChange={setBackgroundColor}
              onTextColorChange={setTextColor}
              onFontChange={setFont}
              onTextSizeChange={setTextSize}
              onAnimationSpeedChange={setAnimationSpeed}
            />
            <div className="profile-appearance-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setIsEditingAppearance(false)}
                disabled={isSavingAppearance}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={handleSaveAppearance}
                disabled={isSavingAppearance}
              >
                {isSavingAppearance ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </ProfileSection>
        )}

        <ProfileSection title="Top Skills">
          <ErrorBoundary fallback={<SectionErrorFallback />}>
            {skills.length > 0 ? (
              <SkillsList skills={skills} />
            ) : (
              <p className="profile-placeholder">
                Complete skill-related exercises to see your skills here.
              </p>
            )}
          </ErrorBoundary>
        </ProfileSection>

        <ProfileSection title="Values">
          <ErrorBoundary fallback={<SectionErrorFallback />}>
            {values.length > 0 ? (
              <RankedList items={values} />
            ) : (
              <p className="profile-placeholder">
                Complete values exercises to see your ranked values here.
              </p>
            )}
          </ErrorBoundary>
        </ProfileSection>

        <ProfileSection title="Interests" lockedUntil="Part 2 > Module 1">
          <p className="profile-placeholder">
            Complete more exercises to unlock interest insights.
          </p>
        </ProfileSection>

        <ProfileSection title="Career Paths" lockedUntil="Part 3 > Module 2">
          <p className="profile-placeholder">
            Complete more exercises to unlock career insights.
          </p>
        </ProfileSection>

        <DataControls
          onDownload={handleDownloadData}
          onDelete={handleDeleteData}
        />
      </div>
    </AppShell>
  );
}
