'use client';

import { motion } from 'framer-motion';

const STEPS = [
  {
    number: 1,
    icon: 'cleaning_services',
    title: 'Choose a Service',
    description: 'Home or Business Cleaning',
  },
  {
    number: 2,
    icon: 'person_check',
    title: 'Verified Professional Arrives',
    description: 'Background Checked & Trained',
  },
  {
    number: 3,
    icon: 'star',
    title: 'Enjoy a Spotless Space',
    description: 'Rate the service after completion',
  },
];

export default function HowSection() {
  return (
    <section id="how" className="relative py-16 sm:py-24 px-4 sm:px-6 md:px-8 bg-primary-faint overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-light/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white/40 rounded-full blur-3xl" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-48 h-48 bg-primary/5 rounded-full blur-2xl" />
      {/* Floating dots */}
      <motion.div
        className="absolute top-20 left-10 w-3 h-3 bg-primary/20 rounded-full"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-32 right-16 w-4 h-4 bg-primary-light/40 rounded-full"
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto">
        {/* Section heading */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <span className="inline-flex items-center gap-2 bg-white text-primary px-4 py-2 rounded-full text-sm font-semibold mb-5 shadow-sm">
            <span className="material-symbols-outlined text-[16px]">bolt</span>
            Simple 3 Steps
          </span>
          <h2 className="font-jakarta font-black text-ink text-[clamp(1.75rem,3vw,2.5rem)] mb-3">
            How It Works
          </h2>
          <p className="text-muted text-base max-w-lg mx-auto leading-relaxed">
            Get professional help in just 3 simple steps.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-[40px] left-[20%] right-[20%]">
            <motion.div
              className="h-[2px] bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 rounded-full"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            {STEPS.map((step, index) => (
              <motion.div
                key={step.number}
                className="flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.6,
                  ease: [0.4, 0, 0.2, 1],
                  delay: index * 0.2,
                }}
              >
                {/* Icon container with pulse ring */}
                <div className="relative mb-5">
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-primary/10"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: index * 0.4 }}
                  />
                  <div className="relative w-[72px] h-[72px] rounded-2xl bg-white flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                    <span className="material-symbols-outlined text-primary text-[32px]">
                      {step.icon}
                    </span>
                  </div>
                </div>

                {/* Number badge */}
                <motion.div
                  className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold font-jakarta mb-4 shadow-[0_4px_12px_rgba(0,119,182,0.3)]"
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.2 + 0.3, type: 'spring', stiffness: 200 }}
                >
                  {step.number}
                </motion.div>

                {/* Title */}
                <h3 className="font-jakarta font-bold text-ink text-lg mb-2">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted leading-relaxed max-w-[280px]">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
