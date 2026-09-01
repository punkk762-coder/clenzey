'use client';

import { useNavEffect } from './hooks/useNavEffect';
import { useScrollReveal } from './hooks/useScrollReveal';

import Nav from './components/Nav';
import Drawer from './components/Drawer';
import HeroSection from './components/sections/HeroSection';
import WhySection from './components/sections/WhySection';
import ServicesSection from './components/sections/ServicesSection';
import HowSection from './components/sections/HowSection';
import StatsSection from './components/sections/StatsSection';
import TestimonialsSection from './components/sections/TestimonialsSection';
import SafetySection from './components/sections/SafetySection';
import AreasSection from './components/sections/AreasSection';
import WaitlistSection from './components/sections/WaitlistSection';
import JoinSection from './components/sections/JoinSection';
import SupportSection from './components/sections/SupportSection';
import Footer from './components/Footer';
import FloatingAppButton from './components/FloatingAppButton';

export default function Home() {
  useNavEffect();
  useScrollReveal();

  return (
    <main className="pb-20 md:pb-8">
      <Nav />
      <Drawer />
      <HeroSection />
      <WhySection />
      <ServicesSection />
      <HowSection />
      <StatsSection />
      <TestimonialsSection />
      <SafetySection />
      <AreasSection />
      <WaitlistSection />
      <JoinSection />
      <SupportSection />
      <Footer />
      <FloatingAppButton />
    </main>
  );
}
