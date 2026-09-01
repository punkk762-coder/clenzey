'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Logo from '../Logo';

export default function WaitlistSection() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <section id="pricing" className="py-12 sm:py-16 px-4 sm:px-6 md:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <motion.div
            id="book"
            className="relative overflow-hidden rounded-3xl bg-primary px-5 sm:px-8 py-10 sm:py-14 md:px-16 md:py-20 text-center"
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          >
            {/* Background decorative elements */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/3" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full" />
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

            <motion.div
              className="relative z-10 max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <motion.span
                className="inline-flex items-center gap-2 bg-white/10 text-white/90 px-4 py-2 rounded-full text-sm font-semibold mb-6 backdrop-blur-sm"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                Now accepting bookings
              </motion.span>
              <h2 className="font-jakarta text-[clamp(1.75rem,3.5vw,2.75rem)] font-black text-white mb-4">
                Ready for a Clenzey Home?
              </h2>
              <p className="text-[1rem] text-white/80 leading-7 mb-8 max-w-lg mx-auto">
                Be among the first to experience hassle-free cleaning in Ahmedabad and Mumbai. Transparent pricing, verified pros, and booking in just a few taps.
              </p>
              <motion.div
                className="flex flex-wrap items-center justify-center gap-3"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-white/90"
                >
                  Book Your First Clean
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center rounded-xl border-2 border-white bg-transparent px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
                >
                  Partner with Us
                </button>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Coming Soon Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-[0_20px_60px_rgba(0,0,0,0.15)]"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="w-full flex justify-center mb-5">
              <Logo height={36} />
            </div>
            <h3 className="font-jakarta font-bold text-ink text-xl mb-3">
              Coming Soon!
            </h3>
            <p className="text-muted text-sm leading-relaxed mb-6">
              We&apos;re working hard to bring you the Clenzey app. Stay tuned for the easiest way to book cleaning services on the go. We&apos;ll notify you as soon as it&apos;s available!
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="inline-flex items-center justify-center rounded-lg bg-primary-container text-white px-6 py-2.5 text-sm font-semibold hover:opacity-90 transition"
            >
              Got it!
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}
