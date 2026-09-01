'use client';

import { motion } from 'framer-motion';

const PILLARS = [
  { value: '16+', label: 'Cleaning Services', icon: 'cleaning_services' },
  { value: '100%', label: 'Transparent Pricing', icon: 'payments' },
  { value: 'Every', label: 'Booking Insured', icon: 'shield' },
  { value: 'Free', label: 'Re-clean Guarantee', icon: 'thumb_up' },
];

export default function StatsSection() {
  return (
    <section className="relative py-12 sm:py-16 px-4 sm:px-6 md:px-8 bg-primary overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="relative z-10 max-w-[1280px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {PILLARS.map((pillar, index) => (
            <motion.div
              key={pillar.label}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-white text-[24px]">{pillar.icon}</span>
              </div>
              <p className="font-jakarta font-black text-white text-xl sm:text-2xl md:text-3xl mb-1">{pillar.value}</p>
              <p className="text-white/70 text-sm">{pillar.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
