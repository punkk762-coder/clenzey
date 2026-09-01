'use client';

import { motion } from 'framer-motion';

const BENEFITS = [
  { icon: 'calendar_month', text: 'Flexible working hours' },
  { icon: 'account_balance_wallet', text: 'Weekly payouts' },
  { icon: 'school', text: 'Free professional training' },
  { icon: 'trending_up', text: 'Growth opportunities' },
  { icon: 'shield', text: 'Insurance coverage' },
  { icon: 'support_agent', text: 'Dedicated support' },
];

export default function JoinSection() {
  return (
    <section className="relative py-16 sm:py-20 px-4 sm:px-6 md:px-8 bg-white overflow-hidden">
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-primary-faint/30 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-[1280px] mx-auto">
        <div className="grid md:grid-cols-2 gap-8 sm:gap-12 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 bg-primary-faint text-primary px-4 py-2 rounded-full text-sm font-semibold mb-5">
              <span className="material-symbols-outlined text-[16px]">handshake</span>
              Partner with Us
            </span>
            <h2 className="font-jakarta font-black text-ink text-[clamp(1.75rem,3vw,2.5rem)] mb-4">
              Join as a Clenzey Professional
            </h2>
            <p className="text-muted text-base leading-relaxed mb-6">
              Earn on your own terms. Join our growing network of verified cleaning professionals and get access to steady bookings, training, and support.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://wa.me/917008410996?text=Hi%2C%20I%20want%20to%20join%20Clenzey%20as%20a%20professional"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] text-white rounded-xl px-5 py-2.5 font-semibold text-sm shadow-[0_4px_14px_rgba(37,211,102,0.3)] hover:bg-[#20bd5a] transition-all"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Apply via WhatsApp
              </a>
              <a
                href="mailto:business.clenzey@gmail.com?subject=Application%20to%20Join%20Clenzey%20as%20Professional"
                className="inline-flex items-center gap-2 bg-ink text-white rounded-xl px-5 py-2.5 font-semibold text-sm shadow-[0_4px_14px_rgba(3,4,94,0.2)] hover:bg-ink/90 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">mail</span>
                Apply via Email
              </a>
            </div>
          </motion.div>

          {/* Right: benefits grid */}
          <motion.div
            className="grid grid-cols-2 gap-3 sm:gap-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {BENEFITS.map((benefit) => (
              <div
                key={benefit.text}
                className="flex items-start gap-2.5 bg-primary-faint/50 rounded-xl p-3 sm:p-4"
              >
                <span className="material-symbols-outlined text-primary text-[20px]">{benefit.icon}</span>
                <span className="text-xs sm:text-sm font-medium text-ink leading-snug">{benefit.text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
