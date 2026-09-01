'use client';

import { motion } from 'framer-motion';

const PROMISES = [
  {
    icon: 'schedule',
    title: 'Book in 60 Seconds',
    description: 'Pick your service, choose a time slot, and confirm — no phone calls or back-and-forth.',
  },
  {
    icon: 'mop',
    title: 'Professionals Who Show Up Ready',
    description: 'Every Clenzey expert arrives trained, equipped with supplies, and ready to deliver a thorough clean.',
  },
  {
    icon: 'sentiment_satisfied',
    title: 'Not Happy? We Make It Right',
    description: 'If the service doesn\'t meet your expectations, we\'ll re-clean for free or refund you. No hassle.',
  },
];

const INCLUDED = [
  { icon: 'verified_user', label: 'Background-checked professionals' },
  { icon: 'inventory_2', label: 'Cleaning supplies included' },
  { icon: 'support_agent', label: 'WhatsApp support on every booking' },
  { icon: 'payments', label: 'Upfront price before you confirm' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } },
};

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-16 sm:py-20 px-4 sm:px-6 md:px-8 lg:px-12 bg-surface">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <motion.div
          className="text-center mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
        >
          <span className="inline-flex items-center gap-2 bg-primary-faint text-primary px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <span className="material-symbols-outlined text-[16px]">handshake</span>
            The Clenzey Promise
          </span>
          <h2 className="font-jakarta font-black text-ink text-[clamp(1.75rem,3vw,2.5rem)] mb-3">
            Why Choose Clenzey
          </h2>
          <p className="text-muted max-w-2xl mx-auto text-base leading-relaxed">
            We&apos;re a new brand with old-fashioned standards — honest pricing, vetted professionals, and service you can rely on from your very first booking.
          </p>
        </motion.div>

        {/* Main two-column layout */}
        <div className="grid gap-5 lg:grid-cols-2 lg:items-stretch">
          {/* Left — brand promise */}
          <motion.div
            className="relative overflow-hidden rounded-[24px] bg-primary px-5 sm:px-8 py-8 sm:py-10 text-white shadow-[0_20px_50px_rgba(0,69,154,0.2)] flex flex-col justify-between min-h-[280px] sm:min-h-[340px]"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={fadeUp}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 bg-white/10 text-white/90 px-3 py-1.5 rounded-full text-xs font-semibold mb-5">
                <span className="material-symbols-outlined text-[14px]">favorite</span>
                Our promise to you
              </span>
              <h3 className="font-jakarta text-[clamp(1.5rem,2.5vw,2rem)] font-black mb-4">
                Cleaning You Can Count On
              </h3>
              <p className="text-[0.98rem] leading-7 text-white/80 max-w-md">
                We&apos;re building Clenzey to make professional home and office cleaning simple, safe, and stress-free — with clear pricing and quality you can trust from day one.
              </p>
            </div>

            <div className="relative z-10 flex flex-wrap gap-2 mt-8">
              {['Verified pros', 'Insured service', 'No hidden fees'].map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 bg-white/10 text-white/90 px-3 py-1.5 rounded-full text-xs font-medium"
                >
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Right — promise cards + included list */}
          <div className="flex flex-col gap-5">
            {PROMISES.map((promise, index) => (
              <motion.div
                key={promise.title}
                className="rounded-[20px] bg-white p-4 sm:p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300 flex gap-3 sm:gap-4"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                variants={fadeUp}
                transition={{ delay: index * 0.08 }}
              >
                <div className="w-12 h-12 shrink-0 rounded-xl bg-primary-faint flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[24px]">{promise.icon}</span>
                </div>
                <div>
                  <h3 className="font-jakarta font-bold text-ink text-base mb-1">{promise.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{promise.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom row — included with every booking */}
        <motion.div
          className="mt-5 rounded-[20px] bg-white border border-border/50 p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="md:max-w-xs shrink-0">
              <h3 className="font-jakarta font-bold text-ink text-lg mb-1">Included with every booking</h3>
              <p className="text-sm text-muted">No surprises — here&apos;s what you always get with Clenzey.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 flex-1">
              {INCLUDED.map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 bg-primary-faint/50 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3">
                  <span className="material-symbols-outlined text-primary text-[18px] sm:text-[20px] shrink-0">{item.icon}</span>
                  <span className="text-xs sm:text-sm font-medium text-ink leading-snug">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Early access CTA strip */}
        <motion.div
          className="mt-5 rounded-[20px] bg-white border border-border/50 px-4 sm:px-6 py-5 sm:py-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={fadeUp}
        >
          <div className="flex flex-col items-center text-center gap-4 sm:flex-row sm:text-left sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-faint flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary text-[24px]">location_on</span>
              </div>
              <div>
                <p className="font-jakarta font-bold text-ink text-sm sm:text-base">Now serving Ahmedabad &amp; Mumbai</p>
                <p className="text-xs sm:text-sm text-muted mt-0.5">More cities coming soon — get in touch to request yours.</p>
              </div>
            </div>
            <a
              href="https://wa.me/917008410996?text=Hi%2C%20I%27d%20like%20to%20book%20a%20cleaning%20service%20with%20Clenzey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#25D366] text-white rounded-2xl pl-3 pr-5 py-2.5 text-sm font-semibold shadow-[0_6px_20px_rgba(37,211,102,0.35),0_2px_8px_rgba(0,0,0,0.08)] hover:bg-[#20bd5a] hover:shadow-[0_8px_24px_rgba(37,211,102,0.4)] active:scale-[0.98] transition-all shrink-0"
            >
              <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-[20px] h-[20px]">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </span>
              <span className="text-left leading-tight">
                <span className="block font-bold">Book on WhatsApp</span>
                <span className="block text-[11px] font-normal text-white/85">Reply in minutes</span>
              </span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
