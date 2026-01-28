'use client';

import { useRouter } from 'next/navigation';
import { OnboardingFlow, OnboardingData } from '@/components/onboarding';

export default function OnboardingPage() { // code_id:140
  const router = useRouter();

  const handleComplete = async (data: OnboardingData) => { // code_id:141
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        // Clear any localStorage from old onboarding flow
        if (typeof window !== 'undefined') {
          localStorage.removeItem('dreamtree_onboarding');
          localStorage.removeItem('dreamtree_user');
        }
        router.push('/workbook');
      } else {
        console.error('Failed to save onboarding data');
        // Still redirect to workbook even on error
        router.push('/workbook');
      }
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      router.push('/workbook');
    }
  };

  return <OnboardingFlow onComplete={handleComplete} />;
}
