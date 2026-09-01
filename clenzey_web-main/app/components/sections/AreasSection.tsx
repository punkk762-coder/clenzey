'use client';

import { motion } from 'framer-motion';

const ACTIVE_CITIES = [
  { name: 'Ahmedabad', state: 'Gujarat', icon: 'apartment' },
  { name: 'Mumbai', state: 'Maharashtra', icon: 'location_city' },
];

export default function AreasSection() {
  return (
    <section id="areas" className="relative py-12 sm:py-16 px-4 sm:px-6 md:px-8 bg-white overflow-hidden">
      <div className="absolute top-10 left-0 w-56 h-56 bg-primary-faint/30 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-[1280px] mx-auto">
        <motion.div
          className="text-center mb-8 sm:mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 bg-primary-faint text-primary px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold mb-3">
            <span className="material-symbols-outlined text-[14px]">pin_drop</span>
            Service areas
          </span>
          <h2 className="font-jakarta font-black text-ink text-[clamp(1.5rem,5vw,2.5rem)] mb-2 sm:mb-3">
            Now Available In
          </h2>
          <p className="text-muted text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Clenzey is currently serving customers in these cities. More cities launching soon!
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 max-w-lg sm:max-w-2xl mx-auto">
          {ACTIVE_CITIES.map((city, index) => (
            <motion.div
              key={city.name}
              className="relative flex flex-col items-center text-center bg-gradient-to-b from-primary-faint to-white rounded-2xl px-3 py-4 sm:px-8 sm:py-6 border border-primary/15 shadow-[0_4px_16px_rgba(0,119,182,0.06)]"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <span className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 inline-flex items-center gap-1 bg-primary text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Live
              </span>
              <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-white flex items-center justify-center mb-2.5 sm:mb-3 shadow-sm">
                <span className="material-symbols-outlined text-primary text-[24px] sm:text-[28px]">{city.icon}</span>
              </div>
              <p className="font-jakarta font-bold text-ink text-base sm:text-lg leading-tight">{city.name}</p>
              <p className="text-xs sm:text-sm text-muted mt-0.5">{city.state}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="text-center text-xs sm:text-sm text-muted mt-6 sm:mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <span className="material-symbols-outlined text-[14px] align-middle mr-1">expand_circle_right</span>
          Expanding to more cities soon. Stay tuned!
        </motion.p>
      </div>
    </section>
  );
}
