'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-[linear-gradient(180deg,#E8F6FB_0%,#faf9fc_45%,#ffffff_100%)] pt-20 sm:pt-28 pb-12 sm:pb-16 md:pb-20"
    >
      {/* Decorative floating elements */}
      <motion.div
        className="absolute top-32 right-[10%] w-4 h-4 bg-primary-light/40 rounded-full hidden sm:block"
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-20 left-[8%] w-3 h-3 bg-primary/20 rounded-full hidden sm:block"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid items-center gap-6 sm:gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Hero Image — first on mobile */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
            className="relative order-1 lg:order-2 max-w-[480px] mx-auto lg:max-w-none lg:mx-0 w-full"
          >
            <div className="relative overflow-hidden rounded-2xl bg-primary-faint shadow-[0_20px_50px_rgba(0,119,182,0.12)] ring-1 ring-primary/10">
              <Image
                src="/images/hero-cleaner.png"
                alt="Clenzey professional in branded uniform welcoming customers"
                width={1024}
                height={1024}
                className="w-full aspect-square object-cover object-center"
                priority
              />
            </div>
            <motion.div
              className="absolute bottom-3 left-3 right-3 sm:bottom-5 sm:left-5 sm:right-auto bg-white rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 shadow-[0_8px_24px_rgba(0,0,0,0.16)] flex items-center gap-2.5 sm:gap-3 border border-border/40"
              initial={{ opacity: 0, y: 24, scale: 0.92 }}
              animate={{ opacity: 1, y: [0, -8, 0], scale: 1 }}
              transition={{
                opacity: { delay: 0.5, duration: 0.5 },
                scale: { delay: 0.5, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
                y: { delay: 1, duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
              }}
            >
              <motion.div
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center shrink-0"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <motion.span
                  className="material-symbols-outlined text-white text-[18px] sm:text-[20px] origin-bottom-right inline-block"
                  animate={{ rotate: [0, 16, -10, 16, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
                >
                  waving_hand
                </motion.span>
              </motion.div>
              <div className="min-w-0">
                <p className="font-jakarta font-bold text-ink text-sm">Welcome!</p>
                <p className="text-xs text-muted leading-snug">Book a clean in 60 seconds</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Content — below image on mobile */}
          <div className="order-2 lg:order-1 text-center lg:text-left">
            <motion.span
              className="hero-badge inline-flex items-center gap-2 bg-white text-primary px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold mb-4 sm:mb-6 shadow-sm border border-primary/10"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              <span className="material-symbols-outlined text-sm">location_on</span>
              Now live in Ahmedabad &amp; Mumbai
            </motion.span>

            <motion.h1
              className="font-jakarta font-extrabold text-[clamp(2rem,8vw,3.5rem)] leading-[1.12] tracking-[-0.02em] text-ink mb-4 sm:mb-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
            >
              Instant Help for
              <br />
              <span className="text-primary">Home &amp; Business</span>
            </motion.h1>

            <motion.p
              className="max-w-lg mx-auto lg:mx-0 text-ink/80 text-base sm:text-lg leading-[1.7] mb-5 sm:mb-8 font-medium"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              Get verified Clenzey experts for all household services and professional business cleaning.
            </motion.p>

            <motion.div
              className="mb-6 sm:mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className="grid grid-cols-2 gap-2 sm:gap-3 max-w-md mx-auto lg:mx-0 lg:max-w-none">
                <motion.a
                  href="#services"
                  onClick={() => window.dispatchEvent(new CustomEvent('clenzey:services-tab', { detail: 'home' }))}
                  className="inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 bg-primary text-white rounded-xl px-2 sm:px-5 py-2.5 font-semibold text-xs sm:text-sm hover:bg-primary/90 transition-all shadow-[0_4px_14px_rgba(0,119,182,0.25)] text-center"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px] shrink-0">home</span>
                  <span className="leading-tight">Household Services</span>
                </motion.a>
                <motion.a
                  href="#services"
                  onClick={() => window.dispatchEvent(new CustomEvent('clenzey:services-tab', { detail: 'business' }))}
                  className="inline-flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 bg-white text-ink rounded-xl px-2 sm:px-5 py-2.5 font-semibold text-xs sm:text-sm border-2 border-border hover:shadow-md hover:border-primary/30 transition-all text-center"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px] shrink-0">business</span>
                  <span className="leading-tight">Business Services</span>
                </motion.a>
              </div>
            </motion.div>

            <motion.div
              className="flex flex-wrap justify-center lg:justify-start items-center gap-x-4 gap-y-2.5 text-sm text-ink/75"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div>
                <span className="font-bold text-ink">Transparent</span> pricing
              </div>
              <div className="h-4 w-px bg-border hidden sm:block" />
              <div>
                <span className="font-bold text-ink">Verified</span> professionals
              </div>
              <div className="h-4 w-px bg-border hidden sm:block" />
              <div>
                <span className="font-bold text-ink">Insured</span> every booking
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
