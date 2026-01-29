'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, NavItemId } from '@/components/shell';
import { SkillsPage } from '@/components/skills';

interface Skill {
  id: string;
  name: string;
  category: 'transferable' | 'self_management' | 'knowledge';
}

interface SkillsResponse {
  skills: Skill[];
  userSkillIds: string[];
}

export default function SkillsLibraryPage() {
  const router = useRouter();
  const [activeNavItem, setActiveNavItem] = useState<NavItemId>('tools');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [userSkillIds, setUserSkillIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch skills data
  useEffect(() => {
    async function fetchSkills() {
      try {
        const response = await fetch('/api/tools/skills_library');
        if (response.ok) {
          const data: SkillsResponse = await response.json();
          setSkills(data.skills);
          setUserSkillIds(data.userSkillIds);
        }
      } catch (error) {
        console.error('Error fetching skills:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSkills();
  }, []);

  const handleNavigate = useCallback(
    (id: NavItemId) => {
      setActiveNavItem(id);
      if (id === 'home') {
        router.push('/');
      } else if (id === 'workbook') {
        router.push('/workbook');
      } else if (id === 'profile') {
        router.push('/profile');
      } else if (id === 'tools') {
        router.push('/tools');
      }
    },
    [router]
  );

  const handleBack = () => {
    router.push('/tools');
  };

  if (loading) {
    return (
      <AppShell
        activeNavItem={activeNavItem}
        onNavigate={handleNavigate}
        showBreadcrumb={false}
        showInput={false}
      >
        <div className="tool-page-loading">Loading...</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      activeNavItem={activeNavItem}
      onNavigate={handleNavigate}
      showBreadcrumb={false}
      showInput={false}
    >
      <SkillsPage skills={skills} userSkillIds={userSkillIds} onBack={handleBack} />
    </AppShell>
  );
}
