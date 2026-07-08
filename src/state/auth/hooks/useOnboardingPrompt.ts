import { useEffect, useState } from 'react';

import { fetchUserProfile } from '@/domains/account/data/accountRepository';
import type { User } from '@supabase/supabase-js';

const hasIncompleteProfile = (profileData: Awaited<ReturnType<typeof fetchUserProfile>>) => {
  if (!profileData) return true;

  return (
    profileData.age === null ||
    profileData.height === null ||
    profileData.weight === null ||
    profileData.focus === null ||
    profileData.preferred_weight_unit === null ||
    profileData.preferred_height_unit === null ||
    profileData.preferred_distance_unit === null
  );
};

export const useOnboardingPrompt = (user: User | null, authLoading: boolean) => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasCheckedProfile(false);
      setShowOnboarding(false);
      return;
    }

    if (authLoading || hasCheckedProfile) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;
    let idleCallbackId: number | null = null;

    const checkProfile = async () => {
      try {
        const profileData = await fetchUserProfile(user.id);
        if (!cancelled && hasIncompleteProfile(profileData)) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Unexpected error during profile check:', error);
      } finally {
        if (!cancelled) {
          setHasCheckedProfile(true);
        }
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleCallbackId = window.requestIdleCallback(
        () => void checkProfile(),
        { timeout: 1500 }
      );
    } else {
      timeoutId = window.setTimeout(() => void checkProfile(), 250);
    }

    return () => {
      cancelled = true;
      if (
        idleCallbackId !== null &&
        typeof window !== 'undefined' &&
        'cancelIdleCallback' in window
      ) {
        window.cancelIdleCallback(idleCallbackId);
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [authLoading, hasCheckedProfile, user]);

  const triggerOnboarding = () => {
    setHasCheckedProfile(false);
    setShowOnboarding(true);
  };

  const markOnboardingComplete = () => {
    setShowOnboarding(false);
    setHasCheckedProfile(true);
  };

  return {
    showOnboarding,
    setShowOnboarding,
    triggerOnboarding,
    markOnboardingComplete,
  };
};
