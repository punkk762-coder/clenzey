import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingCarousel, type OnboardingCarouselSlide } from '@clenzey/design-system';
import { useOnboardingStore } from '../../src/store/onboarding';

const slides: OnboardingCarouselSlide[] = [
  {
    id: '1',
    title: 'New Job Alerts',
    description: 'Get notified instantly when cleaning jobs open up in your area.',
    image: require('../../assets/partner-onboarding-jobs.png'),
    theme: {
      backgroundColor: '#FFFFFF',
      variant: 0,
    },
  },
  {
    id: '2',
    title: 'Manage Your Schedule',
    description: 'Organize jobs, set availability, and stay on top of every booking.',
    image: require('../../assets/partner-onboarding-schedule.png'),
    theme: {
      backgroundColor: '#FFFFFF',
      variant: 1,
    },
  },
  {
    id: '3',
    title: 'Grow Your Business',
    description: 'Track earnings, build your reputation, and expand with Clenzey.',
    image: require('../../assets/partner-onboarding-growth.png'),
    theme: {
      backgroundColor: '#FFFFFF',
      variant: 2,
    },
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const markOnboardingCompleted = useOnboardingStore((s) => s.markCompleted);

  const completeOnboarding = useCallback(async () => {
    await markOnboardingCompleted();
    router.replace('/(auth)/login');
  }, [router, markOnboardingCompleted]);

  return <OnboardingCarousel slides={slides} onComplete={completeOnboarding} />;
}
