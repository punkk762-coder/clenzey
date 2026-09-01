'use client';

import { motion } from 'framer-motion';

const WHY_CHOOSE = [
  { icon: 'sentiment_very_satisfied', label: 'Satisfaction Guaranteed', description: 'Not happy with your clean? We\'ll re-clean for free or refund you — no questions asked.' },
  { icon: 'fact_check', label: 'Background Checked', description: 'Multi-step identity verification including address, references, and criminal history.' },
  { icon: 'school', label: 'Professionally Trained', description: 'Hands-on training in cleaning techniques, hygiene protocols, and customer etiquette.' },
  { icon: 'shield', label: 'Insured', description: 'Comprehensive liability coverage protects your property during every service.' },
  { icon: 'verified', label: 'Quality Audited', description: 'Regular surprise audits and customer feedback reviews to maintain excellence.' },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } },
};

export default function SafetySection() {
  return (
    <section id="safety" className="relative bg-primary-faint py-16 sm:py-20 px-4 sm:px-6 md:px-8 overflow-hidden">
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-80 h-80 bg-primary-light/25 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-white/50 rounded-full blur-2xl" />

      <div className="relative z-10 max-w-[1280px] mx-auto">
        <motion.div
          className="text-center mb-8 sm:mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 bg-white text-primary px-4 py-2 rounded-full text-sm font-semibold mb-4 shadow-sm">
            <span className="material-symbols-outlined text-[16px]">shield</span>
            Safety &amp; Standards
          </span>
          <h2 className="font-jakarta font-black text-ink text-[clamp(1.75rem,3vw,2.5rem)] mb-3">
            How We Protect You
          </h2>
          <p className="text-muted text-base max-w-2xl mx-auto leading-relaxed">
            Every professional on Clenzey goes through rigorous checks before they ever step through your door. Your safety and satisfaction are non-negotiable.
          </p>
        </motion.div>

        {/* Highlight strip — mobile friendly */}
        <motion.div
          className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-6 sm:mb-10"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {['Verified identity', 'Trained & equipped', 'Fully insured'].map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 bg-white/80 text-ink px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium shadow-sm"
            >
              <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
              {item}
            </span>
          ))}
        </motion.div>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {WHY_CHOOSE.map((item) => (
            <motion.div
              key={item.label}
              className="bg-white rounded-2xl p-4 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300"
              variants={cardVariants}
            >
              <div className="flex items-start gap-3 sm:block">
                <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-primary-faint flex items-center justify-center sm:mb-4">
                  <span className="material-symbols-outlined text-primary text-[22px] sm:text-[24px]">
                    {item.icon}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-jakarta font-bold text-ink text-sm sm:text-base mb-1 sm:mb-2 leading-snug">
                    {item.label}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
