import Link from 'next/link';
import { createPageMetadata } from '../../lib/seo';

export const metadata = createPageMetadata({
  title: 'Terms of Service — Clenzey Cleaning Services',
  description:
    'Read the terms and conditions for using Clenzey home and office cleaning services in India.',
  path: '/terms',
  openGraphTitle: 'Terms of Service — Clenzey',
});

export default function TermsOfServicePage() {
  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-4xl mx-auto py-20 px-6 md:px-8">
        <Link
          href="/"
          className="text-primary font-semibold text-sm mb-8 inline-flex items-center gap-1"
        >
          ← Back to Home
        </Link>

        <h1 className="font-jakarta font-black text-ink text-3xl md:text-4xl mb-2">
          Terms of Service
        </h1>
        <p className="text-sm text-muted mb-8">Last updated: January 2026</p>

        {/* 1. Acceptance of Terms */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          1. Acceptance of Terms
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          By accessing or using the Clenzey platform, including our website and mobile applications, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services. Your continued use of the platform following any modifications to these terms constitutes acceptance of those changes.
        </p>
        <p className="text-muted text-sm leading-7 mb-4">
          These terms apply to all users of the platform, including homeowners, tenants, and any individuals who book cleaning services through Clenzey.
        </p>

        {/* 2. Description of Service */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          2. Description of Service
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          Clenzey is a technology platform that connects users with professional home cleaning service providers. We facilitate the booking, scheduling, payment, and communication between users seeking cleaning services and vetted cleaning professionals in their area.
        </p>
        <p className="text-muted text-sm leading-7 mb-4">
          Our services include but are not limited to regular home cleaning, deep cleaning, kitchen cleaning, bathroom cleaning, and other residential cleaning tasks. The availability of specific services may vary based on your location and the service providers in your area.
        </p>

        {/* 3. User Account & Registration */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          3. User Account & Registration
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          To use Clenzey, you must create an account by providing accurate, current, and complete information. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account.
        </p>
        <p className="text-muted text-sm leading-7 mb-4">
          You must be at least 18 years of age to create an account. By registering, you represent and warrant that you have the legal capacity to enter into a binding agreement. Clenzey reserves the right to suspend or terminate accounts that contain inaccurate information or violate these terms.
        </p>

        {/* 4. Booking & Payment */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          4. Booking & Payment
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          All cleaning services are booked through the Clenzey platform. Pricing for services is displayed upfront before you confirm a booking, including any applicable taxes and service fees. The final price may vary if additional services are requested on-site with your approval.
        </p>
        <p className="text-muted text-sm leading-7 mb-4">
          Payment is processed securely through our platform after the service has been completed to your satisfaction. We accept various payment methods as indicated during checkout. You agree to pay all charges incurred in connection with your bookings at the prices in effect when the charges are incurred.
        </p>

        {/* 5. Cancellation & Rescheduling */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          5. Cancellation & Rescheduling
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          You may cancel or reschedule a booking free of charge up to 2 hours before the scheduled service time. Cancellations made less than 2 hours before the scheduled time may incur a cancellation fee of up to 25% of the service cost to compensate the service provider for their time and travel.
        </p>
        <p className="text-muted text-sm leading-7 mb-4">
          Rescheduling requests are subject to availability. If a service provider is unable to fulfill a booking due to unforeseen circumstances, Clenzey will make reasonable efforts to assign an alternative provider or offer a full refund. Repeated no-shows or last-minute cancellations may result in account restrictions.
        </p>

        {/* 6. Service Provider Responsibilities */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          6. Service Provider Responsibilities
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          Cleaning professionals on the Clenzey platform are independent contractors who have undergone background verification checks. All service providers are required to maintain professional standards, carry appropriate insurance, and adhere to our quality guidelines.
        </p>
        <p className="text-muted text-sm leading-7 mb-4">
          Service providers are responsible for bringing their own cleaning supplies and equipment unless otherwise specified in the booking. They are expected to arrive on time, perform services as described, and treat your property with care and respect.
        </p>

        {/* 7. User Responsibilities */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          7. User Responsibilities
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          As a user, you agree to ensure safe and reasonable access to your premises for the service provider at the scheduled time. You are responsible for securing valuables, fragile items, and personal belongings before the cleaning session begins.
        </p>
        <p className="text-muted text-sm leading-7 mb-4">
          You must provide accurate information about your property, including the size of the space, specific cleaning requirements, and any hazards or access restrictions. You agree to treat service providers with respect and maintain a safe working environment free from harassment or unsafe conditions.
        </p>

        {/* 8. Limitation of Liability */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          8. Limitation of Liability
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          Clenzey acts as a technology platform that facilitates connections between users and independent cleaning professionals. To the maximum extent permitted by applicable law, Clenzey&apos;s total liability for any claims arising from or related to the use of our services shall not exceed the total service fees you paid through the platform in the preceding three months.
        </p>
        <p className="text-muted text-sm leading-7 mb-4">
          Clenzey shall not be liable for indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or other intangible losses resulting from your use of or inability to use the service.
        </p>

        {/* 9. Dispute Resolution */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          9. Dispute Resolution
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          If you have a concern or dispute regarding a service, please contact our support team first at business.clenzey@gmail.com. We are committed to resolving issues promptly and fairly. Most disputes can be resolved through direct communication within 48 hours.
        </p>
        <p className="text-muted text-sm leading-7 mb-4">
          If a dispute cannot be resolved through our support process, both parties agree to attempt resolution through mediation before pursuing any other form of dispute resolution. These terms shall be governed by and construed in accordance with the laws of India, and any legal proceedings shall be subject to the jurisdiction of courts in India.
        </p>

        {/* 10. Changes to Terms */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          10. Changes to Terms
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          Clenzey reserves the right to modify or update these Terms of Service at any time. When we make material changes, we will notify users through the platform, via email, or by posting a prominent notice on our website. The &quot;Last updated&quot; date at the top of this page indicates when the terms were last revised.
        </p>
        <p className="text-muted text-sm leading-7 mb-4">
          Your continued use of the platform after any changes to the terms constitutes your acceptance of the updated terms. We encourage you to review these terms periodically to stay informed about your rights and obligations.
        </p>

        {/* 11. Contact Information */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          11. Contact Information
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          If you have any questions, concerns, or requests regarding these Terms of Service, please reach out to us through the following channels:
        </p>
        <p className="text-muted text-sm leading-7 mb-4">
          Email: business.clenzey@gmail.com<br />
          WhatsApp: +91 70084 10996
        </p>
        <p className="text-muted text-sm leading-7 mb-4">
          Our support team is available to assist you and will respond to inquiries within 24–48 business hours.
        </p>
      </div>
    </main>
  );
}
