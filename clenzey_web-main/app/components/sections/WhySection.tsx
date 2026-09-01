'use client';

import { motion } from 'framer-motion';

const TRUST_ITEMS = [
  { icon: 'verified_user', title: 'Verified & Trained Professionals', description: 'Every expert is background-checked and professionally trained', color: 'bg-primary-faint' },
  { icon: 'payments', title: 'Transparent Pricing', description: 'No hidden charges. Know the cost before you book', color: 'bg-[#E8F5E9]' },
  { icon: 'bolt', title: 'Fast & Reliable Service', description: 'Quick response and on-time service, every single time', color: 'bg-[#FFF3E0]' },
  { icon: 'shield', title: 'Safe & Secure Service', description: 'Insured services with full accountability', color: 'bg-[#E3F2FD]' },
];

export default function WhySection() {
  return (
    <section className="bg-surface py-12 sm:py-14 px-4 sm:px-6 md:px-8">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {TRUST_ITEMS.map((item, index) => (
            <motion.div
              key={item.title}
              className="rounded-2xl border border-border/50 bg-white p-4 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl ${item.color} flex items-center justify-center mb-3 sm:mb-4`}>
                <span className="material-symbols-outlined text-primary text-[22px] sm:text-[28px]">
                  {item.icon}
                </span>
              </div>
              <h3 className="font-jakarta font-bold text-ink text-xs sm:text-sm mb-1 sm:mb-1.5 leading-snug">
                {item.title}
              </h3>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
