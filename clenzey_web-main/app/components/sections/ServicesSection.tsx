'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type Service = {
  icon: string;
  label: string;
  desc: string;
};

const HOUSEHOLD_SERVICES: Service[] = [
  { icon: 'bathtub', label: 'Bathroom Cleaning', desc: 'Deep clean tiles, toilet, fittings & floors' },
  { icon: 'cooking', label: 'Kitchen Cleaning', desc: 'Degrease counters, appliances & cabinets' },
  { icon: 'home', label: 'Full Home Cleaning', desc: 'Complete clean for every room in your home' },
  { icon: 'mop', label: 'Floor Cleaning', desc: 'Mopping, scrubbing & stain removal' },
  { icon: 'local_laundry_service', label: 'Dish Washing', desc: 'Sparkling utensils and sink area' },
  { icon: 'iron', label: 'Ironing Service', desc: 'Crisp, pressed clothes at your doorstep' },
  { icon: 'window', label: 'Window Cleaning', desc: 'Streak-free glass inside and out' },
  { icon: 'deck', label: 'Balcony Cleaning', desc: 'Sweep, wash and freshen outdoor spaces' },
];

const BUSINESS_SERVICES: Service[] = [
  { icon: 'business', label: 'Office Cleaning', desc: 'Daily or scheduled workspace maintenance' },
  { icon: 'storefront', label: 'Shop & Retail Cleaning', desc: 'Customer-ready floors, shelves & counters' },
  { icon: 'restaurant', label: 'Restaurant & Café Cleaning', desc: 'Kitchen, dining & hygiene-critical areas' },
  { icon: 'local_hospital', label: 'Clinic & Healthcare Cleaning', desc: 'Sanitised, medical-grade cleaning protocols' },
  { icon: 'spa', label: 'Salon & Spa Cleaning', desc: 'Luxury-level hygiene for client-facing spaces' },
  { icon: 'fitness_center', label: 'Gym Cleaning', desc: 'Equipment, floors and locker areas' },
  { icon: 'window', label: 'Glass & Facade Cleaning', desc: 'Exterior shine for a polished impression' },
  { icon: 'lunch_dining', label: 'Pantry & Canteen Cleaning', desc: 'Food-safe cleaning for shared spaces' },
];

const TABS = [
  {
    id: 'home' as const,
    label: 'For Your Home',
    icon: 'home',
    description: 'Everyday and deep cleaning for apartments, villas, and independent homes.',
  },
  {
    id: 'business' as const,
    label: 'For Your Business',
    icon: 'business',
    description: 'Reliable cleaning for offices, shops, restaurants, clinics, and more.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const } },
};

export default function ServicesSection() {
  const [activeTab, setActiveTab] = useState<'home' | 'business'>('home');

  useEffect(() => {
    const handleTabSelect = (event: Event) => {
      const tab = (event as CustomEvent<'home' | 'business'>).detail;
      setActiveTab(tab);
    };

    window.addEventListener('clenzey:services-tab', handleTabSelect);
    return () => window.removeEventListener('clenzey:services-tab', handleTabSelect);
  }, []);

  const services = activeTab === 'home' ? HOUSEHOLD_SERVICES : BUSINESS_SERVICES;
  const activeMeta = TABS.find((tab) => tab.id === activeTab)!;

  return (
    <section id="services" className="relative bg-white py-16 sm:py-24 px-4 sm:px-6 md:px-8 overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary-faint/40 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

      <div className="relative z-10 max-w-[1280px] mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 bg-primary-faint text-primary px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <span className="material-symbols-outlined text-[16px]">cleaning_services</span>
            What we offer
          </span>
          <h2 className="font-jakarta font-black text-ink text-[clamp(1.75rem,3vw,2.5rem)] mb-3">
            Our Services
          </h2>
          <p className="text-muted max-w-2xl mx-auto text-base leading-relaxed">
            Professional cleaning for homes and businesses — delivered by verified Clenzey experts with transparent pricing.
          </p>
        </motion.div>

        {/* Tab switcher */}
        <div className="mb-8 sm:mb-10 max-w-xl mx-auto">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 p-1.5 bg-surface rounded-2xl border border-border/60 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    'relative flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 sm:py-4 text-center transition-all duration-200',
                    isActive
                      ? 'bg-white text-ink shadow-[0_4px_16px_rgba(0,119,182,0.12)] ring-1 ring-primary/20'
                      : 'text-muted hover:text-ink hover:bg-white/60',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-colors',
                      isActive ? 'bg-primary text-white' : 'bg-primary-faint text-primary',
                    ].join(' ')}
                  >
                    <span className="material-symbols-outlined text-[22px]">{tab.icon}</span>
                  </span>
                  <span className="text-xs sm:text-sm font-bold leading-tight">{tab.label}</span>
                  {isActive && (
                    <motion.span
                      layoutId="services-tab-indicator"
                      className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category intro */}
        <AnimatePresence mode="wait">
          <motion.p
            key={activeTab}
            className="text-center text-muted text-base max-w-xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {activeMeta.description}
          </motion.p>
        </AnimatePresence>

        {/* Service cards */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.06 } },
            }}
          >
            {services.map((service) => (
              <motion.div
                key={service.label}
                variants={fadeUp}
                className="group flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2.5 sm:gap-4 rounded-2xl border border-border/50 bg-white p-3.5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] hover:border-primary/20 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-primary-faint flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <span className="material-symbols-outlined text-primary text-[20px] sm:text-[24px]">{service.icon}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-jakarta font-bold text-ink text-xs sm:text-[0.95rem] mb-0.5 sm:mb-1 leading-snug">
                    {service.label}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">{service.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Bottom CTA */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <p className="text-sm text-muted mb-4">Not sure which service you need? We&apos;ll help you pick the right one.</p>
          <a
            href="https://wa.me/917008410996?text=Hi%2C%20I%27d%20like%20help%20choosing%20a%20cleaning%20service"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-primary text-primary px-5 py-2.5 text-sm font-semibold hover:bg-primary hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            Get a recommendation
          </a>
        </motion.div>
      </div>
    </section>
  );
}
