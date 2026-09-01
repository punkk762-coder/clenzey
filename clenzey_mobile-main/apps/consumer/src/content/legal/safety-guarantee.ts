import type { LegalDocument } from './types';

export const safetyGuaranteeDocument: LegalDocument = {
  title: 'Safety Guarantee',
  lastUpdated: 'January 2026',
  intro: [
    'At Clenzey, your safety and peace of mind are our top priorities. Every cleaner on our platform goes through a rigorous verification process, and every booking is backed by comprehensive insurance coverage. Here is how we keep you protected.',
  ],
  sections: [
    {
      heading: 'Background Verified',
      paragraphs: [
        'Every cleaner passes identity and criminal background checks before joining our platform.',
      ],
    },
    {
      heading: 'Fully Insured',
      paragraphs: [
        'Comprehensive liability coverage for every booking protects you and your property.',
      ],
    },
    {
      heading: '24/7 Support',
      paragraphs: [
        'Our team is always available to help with any concerns before, during, or after your service.',
      ],
    },
    {
      heading: 'Our Verification Process',
      paragraphs: [
        'Every professional on the Clenzey platform undergoes a multi-step vetting process designed to ensure only qualified, trustworthy individuals enter your home.',
      ],
      bullets: [
        'Identity Verification — Government-issued ID check and address confirmation to confirm each applicant\'s identity.',
        'Criminal Background Check — Comprehensive criminal record screening conducted through verified databases.',
        'Reference Checks — We contact previous employers or clients to verify work history and professionalism.',
        'Skills Assessment — Practical evaluation of cleaning techniques, product knowledge, and safety awareness.',
        'Trial Period — New cleaners complete supervised initial bookings with performance monitoring before full onboarding.',
      ],
    },
    {
      heading: 'Insurance Coverage',
      paragraphs: [
        'Every Clenzey booking is protected by comprehensive liability insurance. If something goes wrong during a service, you are covered.',
        'How to file a claim: Report the issue through the app or contact our support team within 48 hours of the service. Provide photos or documentation where possible. Our claims team will review your case and respond within 2 business days with a resolution.',
      ],
      bullets: [
        'Accidental Damage — Broken items, scratched surfaces, or spills caused during the cleaning session.',
        'Theft Protection — In the unlikely event of missing items, our insurance covers the replacement cost.',
        'Personal Injury — Coverage for any injury that may occur on your property during the service.',
      ],
    },
    {
      heading: 'Quality Assurance',
      paragraphs: ['We maintain high service standards through continuous monitoring and improvement systems.'],
      bullets: [
        'Rating System — After every booking, customers rate their experience. Cleaners below a 4.5-star average receive additional coaching.',
        'Regular Performance Reviews — Monthly reviews assess punctuality, thoroughness, communication, and customer satisfaction.',
        'Ongoing Training — Cleaners receive periodic training on new techniques, eco-friendly products, and safety protocols.',
        'Customer Feedback Loops — We actively collect and act on feedback to continuously improve our service quality.',
      ],
    },
    {
      heading: 'Your Protection',
      paragraphs: [
        'If something does not go as planned, here is what you can expect from us.',
        'What to do if something goes wrong: Open the Clenzey app, go to your booking history, and select "Report an Issue." Alternatively, reach out to our support team directly via WhatsApp or email.',
      ],
      bullets: [
        'Incident Reporting — Report any concern within 48 hours of service completion for fastest resolution.',
        'Resolution Timeline — Our team acknowledges all reports within 24 hours and resolves most issues within 24–48 hours.',
        'Satisfaction Guarantee — If you are not happy with the service, we will arrange a complimentary re-clean or issue a full refund — no questions asked.',
      ],
    },
    {
      heading: 'Contact Us',
      paragraphs: [
        'For safety concerns or urgent issues, reach our team directly:',
        'Email: business.clenzey@gmail.com',
        'WhatsApp: +91 70084 10996',
      ],
    },
  ],
};
