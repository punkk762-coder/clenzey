import Link from 'next/link';
import FaqSchema from '../components/FaqSchema';
import { createPageMetadata } from '../../lib/seo';

export const metadata = createPageMetadata({
  title: 'FAQs & Guides — Clenzey Cleaning Services',
  description:
    'Frequently asked questions about Clenzey home and office cleaning services. Find answers about booking, pricing, safety, and more.',
  path: '/faq',
  openGraphTitle: 'FAQs & Guides — Clenzey',
  openGraphDescription:
    'Find answers to common questions about booking Clenzey cleaning services.',
});

const FAQ_ITEMS = [
  {
    question: 'How do I book a cleaning service?',
    answer:
      'Simply download the Clenzey app, select the service you need, choose a date and time slot, confirm your address, and pay securely online. Your booking is confirmed instantly with a matched professional.',
  },
  {
    question: 'What services does Clenzey offer?',
    answer:
      'We offer a range of home cleaning services including bathroom cleaning, kitchen deep clean, full home cleaning, deep cleaning packages, and move-in/move-out cleaning — all performed by trained professionals.',
  },
  {
    question: 'How is pricing determined?',
    answer:
      'Our pricing is flat-rate and transparent, based on home size (BHK) and the type of service selected. You see the exact price before booking — no hidden charges or surge fees.',
  },
  {
    question: 'Can I cancel or reschedule a booking?',
    answer:
      'Yes, you can cancel or reschedule your booking up to 2 hours before the scheduled time at no extra charge. Changes can be made directly from the app in just a few taps.',
  },
  {
    question: 'Are your cleaners background-checked?',
    answer:
      'Absolutely. Every Clenzey professional goes through a rigorous multi-step verification process including identity checks, address verification, and background screening before they join our platform.',
  },
  {
    question: 'What if I\'m not satisfied with the service?',
    answer:
      'Your satisfaction is guaranteed. If you\'re not happy with the cleaning, we\'ll arrange a free re-clean within 24 hours or provide a full refund — no questions asked.',
  },
  {
    question: 'How do I track my cleaner\'s arrival?',
    answer:
      'Once your cleaner is on the way, you can track their real-time location via the Clenzey app. You\'ll also receive notifications when they\'re nearby and when they arrive at your door.',
  },
  {
    question: 'What cleaning products are used?',
    answer:
      'We use eco-friendly, non-toxic cleaning products that are safe for your family, pets, and the environment. Our professionals carry all supplies — you don\'t need to provide anything.',
  },
  {
    question: 'Is my home insured during a cleaning?',
    answer:
      'Yes, every booking is covered by comprehensive liability insurance. In the rare event of accidental damage, we handle the claims process and ensure you\'re fully compensated.',
  },
  {
    question: 'How do I contact support?',
    answer:
      'You can reach our support team via WhatsApp for instant replies, email us at business.clenzey@gmail.com, or visit the Help Center in the app. We\'re available 7 days a week.',
  },
];

export default function FAQPage() {
  return (
    <main className="bg-white min-h-screen">
      <FaqSchema items={FAQ_ITEMS} />
      <div className="max-w-4xl mx-auto py-20 px-6 md:px-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center text-sm text-primary font-dm hover:text-primary-container transition-colors mb-10"
        >
          ← Back to Home
        </Link>

        {/* Header */}
        <h1 className="font-jakarta font-black text-ink text-4xl mb-4">
          FAQs &amp; Guides
        </h1>
        <p className="text-muted font-dm text-base leading-relaxed mb-10 max-w-2xl">
          Find answers to the most common questions about booking, pricing,
          safety, and everything else related to Clenzey home cleaning services.
        </p>

        {/* FAQ items */}
        <div>
          {FAQ_ITEMS.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-border/50 p-6 mb-4"
            >
              <h2 className="font-jakarta font-bold text-ink text-base mb-2">
                {item.question}
              </h2>
              <p className="text-sm text-muted leading-relaxed">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
