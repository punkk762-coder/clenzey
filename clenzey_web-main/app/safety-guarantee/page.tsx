import Link from 'next/link';
import { createPageMetadata } from '../../lib/seo';

export const metadata = createPageMetadata({
  title: 'Safety Guarantee — Clenzey Verified Cleaning Professionals',
  description:
    "Clenzey's safety guarantee: police-verified, background-checked, insured cleaning professionals. Learn how we protect your home and family.",
  path: '/safety-guarantee',
  openGraphTitle: 'Safety Guarantee — Clenzey',
});

export default function SafetyGuaranteePage() {
  return (
    <main className="bg-white min-h-screen">
      <div className="max-w-4xl mx-auto py-20 px-6 md:px-8">
        {/* Back link */}
        <Link
          href="/"
          className="text-primary font-semibold text-sm mb-8 inline-flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Home
        </Link>

        {/* Page heading */}
        <h1 className="font-jakarta font-black text-ink text-3xl md:text-4xl mb-2">
          Safety Guarantee
        </h1>
        <p className="text-muted text-sm leading-7 mb-10">
          At Clenzey, your safety and peace of mind are our top priorities. Every cleaner
          on our platform goes through a rigorous verification process, and every booking
          is backed by comprehensive insurance coverage. Here&apos;s how we keep you protected.
        </p>

        {/* Feature highlight cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Background Verified */}
          <div className="bg-primary-faint rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 shadow-sm">
              <span className="material-symbols-outlined text-primary">verified_user</span>
            </div>
            <h3 className="font-jakarta font-bold text-ink text-base mb-2">
              Background Verified
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              Every cleaner passes identity and criminal background checks before joining
              our platform.
            </p>
          </div>

          {/* Fully Insured */}
          <div className="bg-primary-faint rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 shadow-sm">
              <span className="material-symbols-outlined text-primary">shield</span>
            </div>
            <h3 className="font-jakarta font-bold text-ink text-base mb-2">
              Fully Insured
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              Comprehensive liability coverage for every booking protects you and your
              property.
            </p>
          </div>

          {/* 24/7 Support */}
          <div className="bg-primary-faint rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-4 shadow-sm">
              <span className="material-symbols-outlined text-primary">support_agent</span>
            </div>
            <h3 className="font-jakarta font-bold text-ink text-base mb-2">
              24/7 Support
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              Our team is always available to help with any concerns before, during, or
              after your service.
            </p>
          </div>
        </div>

        {/* Our Verification Process */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          Our Verification Process
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          Every professional on the Clenzey platform undergoes a multi-step vetting process
          designed to ensure only qualified, trustworthy individuals enter your home.
        </p>
        <ul className="list-disc list-inside text-muted text-sm leading-7 mb-4 space-y-1">
          <li>
            <strong>Identity Verification</strong> — Government-issued ID check and address
            confirmation to confirm each applicant&apos;s identity.
          </li>
          <li>
            <strong>Criminal Background Check</strong> — Comprehensive criminal record
            screening conducted through verified databases.
          </li>
          <li>
            <strong>Reference Checks</strong> — We contact previous employers or clients to
            verify work history and professionalism.
          </li>
          <li>
            <strong>Skills Assessment</strong> — Practical evaluation of cleaning techniques,
            product knowledge, and safety awareness.
          </li>
          <li>
            <strong>Trial Period</strong> — New cleaners complete supervised initial bookings
            with performance monitoring before full onboarding.
          </li>
        </ul>

        {/* Insurance Coverage */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          Insurance Coverage
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          Every Clenzey booking is protected by comprehensive liability insurance. If
          something goes wrong during a service, you&apos;re covered.
        </p>
        <p className="text-muted text-sm leading-7 mb-4">
          <strong>What&apos;s covered:</strong>
        </p>
        <ul className="list-disc list-inside text-muted text-sm leading-7 mb-4 space-y-1">
          <li>
            <strong>Accidental Damage</strong> — Broken items, scratched surfaces, or
            spills caused during the cleaning session.
          </li>
          <li>
            <strong>Theft Protection</strong> — In the unlikely event of missing items, our
            insurance covers the replacement cost.
          </li>
          <li>
            <strong>Personal Injury</strong> — Coverage for any injury that may occur on
            your property during the service.
          </li>
        </ul>
        <p className="text-muted text-sm leading-7 mb-4">
          <strong>How to file a claim:</strong> Report the issue through the app or contact
          our support team within 48 hours of the service. Provide photos or documentation
          where possible. Our claims team will review your case and respond within 2
          business days with a resolution.
        </p>

        {/* Quality Assurance */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          Quality Assurance
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          We maintain high service standards through continuous monitoring and improvement
          systems.
        </p>
        <ul className="list-disc list-inside text-muted text-sm leading-7 mb-4 space-y-1">
          <li>
            <strong>Rating System</strong> — After every booking, customers rate their
            experience. Cleaners below a 4.5-star average receive additional coaching.
          </li>
          <li>
            <strong>Regular Performance Reviews</strong> — Monthly reviews assess
            punctuality, thoroughness, communication, and customer satisfaction.
          </li>
          <li>
            <strong>Ongoing Training</strong> — Cleaners receive periodic training on new
            techniques, eco-friendly products, and safety protocols.
          </li>
          <li>
            <strong>Customer Feedback Loops</strong> — We actively collect and act on
            feedback to continuously improve our service quality.
          </li>
        </ul>

        {/* Your Protection */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          Your Protection
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          If something doesn&apos;t go as planned, here&apos;s what you can expect from us.
        </p>
        <p className="text-muted text-sm leading-7 mb-4">
          <strong>What to do if something goes wrong:</strong> Open the Clenzey app, go to
          your booking history, and select &quot;Report an Issue.&quot; Alternatively, reach out to
          our support team directly via WhatsApp or email.
        </p>
        <ul className="list-disc list-inside text-muted text-sm leading-7 mb-4 space-y-1">
          <li>
            <strong>Incident Reporting</strong> — Report any concern within 48 hours of
            service completion for fastest resolution.
          </li>
          <li>
            <strong>Resolution Timeline</strong> — Our team acknowledges all reports within
            24 hours and resolves most issues within 24–48 hours.
          </li>
          <li>
            <strong>Satisfaction Guarantee</strong> — If you&apos;re not happy with the service,
            we&apos;ll arrange a complimentary re-clean or issue a full refund — no questions
            asked.
          </li>
        </ul>

        {/* Contact Us */}
        <h2 className="font-jakarta font-bold text-ink text-xl mt-10 mb-4">
          Contact Us
        </h2>
        <p className="text-muted text-sm leading-7 mb-4">
          For safety concerns or urgent issues, reach our team directly:
        </p>
        <ul className="list-disc list-inside text-muted text-sm leading-7 mb-4 space-y-1">
          <li>
            <strong>Email:</strong>{' '}
            <a
              href="mailto:business.clenzey@gmail.com"
              className="text-primary hover:text-primary-container transition-colors"
            >
              business.clenzey@gmail.com
            </a>
          </li>
          <li>
            <strong>WhatsApp:</strong>{' '}
            <a
              href="https://wa.me/917008410996"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-container transition-colors"
            >
              +91 70084 10996
            </a>
          </li>
        </ul>
      </div>
    </main>
  );
}
