'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AppShell, NavItemId } from '@/components/shell';
import { ToolPage, ToolType, ToolInstance } from '@/components/tools';

interface ToolInstanceData {
  id: string;
  title: string;
  source: 'workbook' | 'user';
  sourceLocation?: string;
  lastEdited: string;
}

interface ToolInstancesResponse {
  instances: ToolInstanceData[];
}

export default function ToolTypePage() { // code_id:152
  const router = useRouter();
  const params = useParams();
  const toolType = params.toolType as ToolType;

  const [activeNavItem, setActiveNavItem] = useState<NavItemId>('tools');
  const [instances, setInstances] = useState<ToolInstance[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch instances for this tool type
  useEffect(() => {
    async function fetchInstances() { // code_id:156
      try {
        const response = await fetch(`/api/tools/instances?toolType=${toolType}`);
        if (response.ok) {
          const data: ToolInstancesResponse = await response.json();
          setInstances(
            data.instances.map((i) => ({
              ...i,
              lastEdited: new Date(i.lastEdited),
            }))
          );
        }
      } catch (error) {
        console.error('Error fetching tool instances:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchInstances();
  }, [toolType]);

  const handleNavigate = useCallback(
    (id: NavItemId) => {
      setActiveNavItem(id);
      if (id === 'home') {
        router.push('/');
      } else if (id === 'profile') {
        router.push('/profile');
      } else if (id === 'tools') {
        router.push('/tools');
      }
    },
    [router]
  );

  const handleBack = () => { // code_id:153
    router.push('/tools');
  };

  const handleCreateNew = () => { // code_id:154
    // For now, just show a message - creating new standalone tools would require additional UI
    alert('Creating new standalone tools is coming soon. For now, complete exercises in the workbook to create entries.');
  };

  const handleSelectInstance = (id: string) => { // code_id:155
    // Navigate to view/edit the specific instance
    router.push(`/tools/${toolType}/${id}`);
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
      <ToolPage
        toolType={toolType}
        instances={instances}
        onBack={handleBack}
        onCreateNew={handleCreateNew}
        onSelectInstance={handleSelectInstance}
      />
    </AppShell>
  );
}
