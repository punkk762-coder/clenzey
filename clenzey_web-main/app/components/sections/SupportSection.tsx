'use client';

import { motion } from 'framer-motion';

const SUPPORT_CHANNELS = [
  {
    icon: 'chat',
    title: 'Live Chat',
    description: 'Instant support for active bookings.',
    action: 'Start Chat',
    href: 'https://wa.me/917008410996',
  },
  {
    icon: 'help',
    title: 'Help Center',
    description: 'Browse our FAQs and guides.',
    action: 'Visit Help Center',
    href: '/faq',
  },
  {
    icon: 'mail',
    title: 'Email Support',
    description: 'Get a response within 2 hours.',
    action: 'Send Email',
    href: 'mailto:business.clenzey@gmail.com',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const } },
};

export default function SupportSection() {
  return (
    <section id="support" className="relative py-16 sm:py-20 px-4 sm:px-6 md:px-8 overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-primary-faint/50 rounded-full blur-3xl -z-0" />
      <div className="absolute top-20 left-10 w-40 h-40 bg-primary-light/15 rounded-full blur-2xl -z-0" />
      <div className="relative z-10 max-w-[1280px] mx-auto">
        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="font-jakarta font-bold text-ink text-3xl md:text-4xl mb-4">
            Need Help? We&apos;re Here
          </h2>
          <p className="text-muted text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Our dedicated support team is available 24/7 to assist you with your bookings and inquiries.
          </p>
        </div>

        {/* Cards Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {SUPPORT_CHANNELS.map((channel) => (
            <motion.div
              key={channel.title}
              className="rounded-2xl border border-border/50 bg-white p-6 text-center shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_36px_rgba(0,0,0,0.1)] hover:-translate-y-1 transition-all duration-300"
              variants={cardVariants}
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-full bg-primary-faint flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-primary text-[28px]">
                  {channel.icon}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-jakarta font-bold text-ink text-base mb-2">
                {channel.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-muted leading-relaxed mb-4">
                {channel.description}
              </p>

              {/* Action Link */}
              <a
                href={channel.href}
                className="group inline-flex items-center gap-1 text-primary font-semibold text-sm hover:text-primary-container transition-colors"
                {...(channel.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {channel.action}
                <span className="material-symbols-outlined text-[16px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
              </a>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
