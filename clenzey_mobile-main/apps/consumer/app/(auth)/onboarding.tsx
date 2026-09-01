import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { OnboardingCarousel, type OnboardingCarouselSlide } from '@clenzey/design-system';
import { useOnboardingStore } from '../../src/store/onboarding';

const slides: OnboardingCarouselSlide[] = [
  {
    id: '1',
    title: 'Book in Seconds',
    description: 'Choose a service, pick a time, and get professional cleaning at your doorstep.',
    image: require('../../assets/deep-cleaning.png'),
    theme: {
      backgroundColor: '#FFFFFF',
      variant: 0,
    },
  },
  {
    id: '2',
    title: 'Live Tracking',
    description: 'Follow your provider in real time and know exactly when they arrive.',
    image: require('../../assets/quick-shine.png'),
    theme: {
      backgroundColor: '#FFFFFF',
      variant: 1,
    },
  },
  {
    id: '3',
    title: 'Pay Securely',
    description: 'Transparent pricing with secure payments — no surprises, no hidden fees.',
    image: require('../../assets/banner-sofa.png'),
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
