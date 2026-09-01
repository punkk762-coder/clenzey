import Link from 'next/link';
import { createPageMetadata } from '../../lib/seo';

export const metadata = createPageMetadata({
  title: 'Privacy Policy — Clenzey Cleaning Services',
  description:
    'How Clenzey collects, uses, and protects your personal information when you book our cleaning services.',
  path: '/privacy',
  openGraphTitle: 'Privacy Policy — Clenzey',
});

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-4xl mx-auto py-20 px-6 md:px-8">
        {/* Back link */}
        <Link
          href="/"
          className="text-primary font-semibold text-sm mb-8 inline-flex items-center gap-1"
        >
          ← Back to Home
        </Link>

        {/* Page heading */}
        <h1 className="font-jakarta font-black text-ink text-3xl md:text-4xl mb-2">
          Privacy Policy
        </h1>

        {/* Last updated */}
        <p className="text-sm text-muted mb-8">Last updated: January 2026</p>

        {/* Introduction */}
        <p className="text-muted text-sm leading-7 mb-4">
          At Clenzey, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our home cleaning platform and related services.
        </p>
        <p className="text-muted text-sm leading-7 mb-4">
          By using Clenzey, you agree to the collection and use of information in accordance with this policy.
        </p>

        {/* 1. Information We Collect */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          1. Information We Collect
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          We collect the following types of information to provide and improve our services:
        </p>
        <ul className="list-disc list-inside text-muted text-sm leading-7 mb-4 space-y-1">
          <li>Personal information: name, email address, phone number, and home address</li>
          <li>Booking details: service type, preferred date and time, special instructions, and service history</li>
          <li>Device information: device type, operating system, browser type, and app version</li>
          <li>Location data: used to match you with nearby service providers and provide accurate service coverage</li>
          <li>Payment information: processed securely through our third-party payment partners</li>
        </ul>

        {/* 2. How We Use Your Information */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          2. How We Use Your Information
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          We use the information we collect for the following purposes:
        </p>
        <ul className="list-disc list-inside text-muted text-sm leading-7 mb-4 space-y-1">
          <li>To provide, maintain, and improve our home cleaning services</li>
          <li>To match you with vetted and verified cleaning professionals in your area</li>
          <li>To process payments and send transaction confirmations</li>
          <li>To send booking confirmations, reminders, and service updates</li>
          <li>To ensure the safety and security of both customers and service providers</li>
          <li>To respond to your inquiries, feedback, and support requests</li>
          <li>To analyse usage patterns and improve the overall user experience</li>
        </ul>

        {/* 3. Information Sharing */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          3. Information Sharing
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          We do not sell your personal information to third parties. We may share your data only in the following circumstances:
        </p>
        <ul className="list-disc list-inside text-muted text-sm leading-7 mb-4 space-y-1">
          <li>With service providers (cleaners) to fulfill your bookings — limited to the information necessary for service delivery such as your name, address, and booking details</li>
          <li>With payment processors to complete transactions securely</li>
          <li>When required by law, regulation, or legal process</li>
          <li>To protect the rights, safety, or property of Clenzey, our users, or the public</li>
        </ul>

        {/* 4. Data Security */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          4. Data Security
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          We take data security seriously and implement industry-standard measures to protect your information:
        </p>
        <ul className="list-disc list-inside text-muted text-sm leading-7 mb-4 space-y-1">
          <li>End-to-end encryption for data in transit and at rest</li>
          <li>Secure servers hosted with reputable cloud infrastructure providers</li>
          <li>Strict access controls limiting data access to authorised personnel only</li>
          <li>Regular security audits and vulnerability assessments</li>
        </ul>
        <p className="text-muted text-sm leading-7 mb-4">
          While we strive to protect your data, no method of electronic transmission or storage is completely secure. We encourage you to use strong passwords and keep your account credentials confidential.
        </p>

        {/* 5. Data Retention */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          5. Data Retention
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          We retain your personal information for as long as your account remains active or as needed to provide our services. If you request account deletion, we will remove your data within 30 days, subject to any legal obligations that require us to retain certain information (such as financial records for tax compliance).
        </p>
        <p className="text-muted text-sm leading-7 mb-4">
          Anonymised and aggregated data that cannot identify you may be retained for analytics and service improvement purposes.
        </p>

        {/* 6. Your Rights */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          6. Your Rights
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          You have the following rights regarding your personal data:
        </p>
        <ul className="list-disc list-inside text-muted text-sm leading-7 mb-4 space-y-1">
          <li>Access: Request a copy of the personal data we hold about you</li>
          <li>Correction: Request corrections to any inaccurate or incomplete data</li>
          <li>Deletion: Request the deletion of your personal data and account</li>
          <li>Portability: Request your data in a structured, machine-readable format</li>
          <li>Withdrawal of consent: Withdraw your consent for data processing at any time</li>
        </ul>
        <p className="text-muted text-sm leading-7 mb-4">
          To exercise any of these rights, please contact us using the details provided at the bottom of this page.
        </p>

        {/* 7. Cookies & Tracking */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          7. Cookies &amp; Tracking
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          We use cookies and similar tracking technologies to enhance your experience:
        </p>
        <ul className="list-disc list-inside text-muted text-sm leading-7 mb-4 space-y-1">
          <li>Essential cookies: Required for core platform functionality such as authentication and session management</li>
          <li>Analytics cookies: Help us understand how users interact with our platform so we can improve our services</li>
        </ul>
        <p className="text-muted text-sm leading-7 mb-4">
          You can manage cookie preferences through your browser settings. Disabling essential cookies may affect platform functionality.
        </p>

        {/* 8. Third-Party Services */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          8. Third-Party Services
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          Our platform integrates with the following third-party services:
        </p>
        <ul className="list-disc list-inside text-muted text-sm leading-7 mb-4 space-y-1">
          <li>Payment processors: To securely handle transactions and billing</li>
          <li>Mapping and location services: To provide real-time tracking of your service provider and accurate address matching</li>
        </ul>
        <p className="text-muted text-sm leading-7 mb-4">
          These third-party services have their own privacy policies, and we encourage you to review them. We only share the minimum data necessary for these services to function.
        </p>

        {/* 9. Children's Privacy */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          9. Children&apos;s Privacy
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          Clenzey is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that a user is under 18, we will take steps to delete their information and terminate their account promptly.
        </p>

        {/* 10. Changes to This Policy */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          10. Changes to This Policy
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          We may update this Privacy Policy from time to time to reflect changes in our practices, technology, or legal requirements. When we make significant changes, we will notify you via email or through a prominent notice within the app. We encourage you to review this page periodically for the latest information.
        </p>

        {/* 11. Contact Us */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          11. Contact Us
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          If you have any questions, concerns, or requests regarding this Privacy Policy or how we handle your data, please reach out to us:
        </p>
        <ul className="list-disc list-inside text-muted text-sm leading-7 mb-4 space-y-1">
          <li>Email: business.clenzey@gmail.com</li>
          <li>WhatsApp: +91 70084 10996</li>
        </ul>
        <p className="text-muted text-sm leading-7 mb-4">
          We aim to respond to all privacy-related inquiries within 48 hours.
        </p>
      </div>
    </main>
  );
}
