import type { LegalDocument } from './types';

export const privacyDocument: LegalDocument = {
  title: 'Privacy Policy',
  lastUpdated: 'January 2026',
  intro: [
    'At Clenzey, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our home cleaning platform and related services.',
    'By using Clenzey, you agree to the collection and use of information in accordance with this policy.',
  ],
  sections: [
    {
      heading: '1. Information We Collect',
      paragraphs: ['We collect the following types of information to provide and improve our services:'],
      bullets: [
        'Personal information: name, email address, phone number, and home address',
        'Booking details: service type, preferred date and time, special instructions, and service history',
        'Device information: device type, operating system, browser type, and app version',
        'Location data: used to match you with nearby service providers and provide accurate service coverage',
        'Payment information: processed securely through our third-party payment partners',
      ],
    },
    {
      heading: '2. How We Use Your Information',
      paragraphs: ['We use the information we collect for the following purposes:'],
      bullets: [
        'To provide, maintain, and improve our home cleaning services',
        'To match you with vetted and verified cleaning professionals in your area',
        'To process payments and send transaction confirmations',
        'To send booking confirmations, reminders, and service updates',
        'To ensure the safety and security of both customers and service providers',
        'To respond to your inquiries, feedback, and support requests',
        'To analyse usage patterns and improve the overall user experience',
      ],
    },
    {
      heading: '3. Information Sharing',
      paragraphs: [
        'We do not sell your personal information to third parties. We may share your data only in the following circumstances:',
      ],
      bullets: [
        'With service providers (cleaners) to fulfill your bookings — limited to the information necessary for service delivery such as your name, address, and booking details',
        'With payment processors to complete transactions securely',
        'When required by law, regulation, or legal process',
        'To protect the rights, safety, or property of Clenzey, our users, or the public',
      ],
    },
    {
      heading: '4. Data Security',
      paragraphs: [
        'We take data security seriously and implement industry-standard measures to protect your information:',
      ],
      bullets: [
        'End-to-end encryption for data in transit and at rest',
        'Secure servers hosted with reputable cloud infrastructure providers',
        'Strict access controls limiting data access to authorised personnel only',
        'Regular security audits and vulnerability assessments',
      ],
    },
    {
      heading: '5. Data Retention',
      paragraphs: [
        'We retain your personal information for as long as your account remains active or as needed to provide our services. If you request account deletion, we will remove your data within 30 days, subject to any legal obligations that require us to retain certain information (such as financial records for tax compliance).',
        'Anonymised and aggregated data that cannot identify you may be retained for analytics and service improvement purposes.',
      ],
    },
    {
      heading: '6. Your Rights',
      paragraphs: ['You have the following rights regarding your personal data:'],
      bullets: [
        'Access: Request a copy of the personal data we hold about you',
        'Correction: Request corrections to any inaccurate or incomplete data',
        'Deletion: Request the deletion of your personal data and account',
        'Portability: Request your data in a structured, machine-readable format',
        'Withdrawal of consent: Withdraw your consent for data processing at any time',
      ],
    },
    {
      heading: '7. Cookies & Tracking',
      paragraphs: ['We use cookies and similar tracking technologies to enhance your experience:'],
      bullets: [
        'Essential cookies: Required for core platform functionality such as authentication and session management',
        'Analytics cookies: Help us understand how users interact with our platform so we can improve our services',
      ],
    },
    {
      heading: '8. Third-Party Services',
      paragraphs: [
        'Our platform integrates with the following third-party services:',
      ],
      bullets: [
        'Payment processors: To securely handle transactions and billing',
        'Mapping and location services: To provide real-time tracking of your service provider and accurate address matching',
      ],
    },
    {
      heading: "9. Children's Privacy",
      paragraphs: [
        'Clenzey is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that a user is under 18, we will take steps to delete their information and terminate their account promptly.',
      ],
    },
    {
      heading: '10. Changes to This Policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. When we make significant changes, we will notify you via email or through a prominent notice within the app. We encourage you to review this page periodically for the latest information.',
      ],
    },
    {
      heading: '11. Contact Us',
      paragraphs: [
        'If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your data, please reach out to us:',
        'Email: business.clenzey@gmail.com',
        'WhatsApp: +91 70084 10996',
        'We aim to respond to all privacy-related inquiries within 48 hours.',
      ],
    },
  ],
};
