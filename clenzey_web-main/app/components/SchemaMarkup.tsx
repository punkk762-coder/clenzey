import JsonLd from './JsonLd';
import { LOGO_SRC, SITE_URL } from '../../lib/seo';

export default function SchemaMarkup() {
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': SITE_URL,
    name: 'Clenzey',
    description:
      'Professional home and office cleaning services with verified, trained professionals in Ahmedabad and Mumbai.',
    url: SITE_URL,
    logo: `${SITE_URL}${LOGO_SRC}`,
    image: `${SITE_URL}/images/hero-cleaner.png`,
    telephone: '+91-70084-10996',
    email: 'business.clenzey@gmail.com',
    priceRange: '₹₹',
    currenciesAccepted: 'INR',
    paymentAccepted: 'Cash, UPI, Credit Card, Debit Card',
    areaServed: [
      { '@type': 'City', name: 'Ahmedabad', addressRegion: 'Gujarat', addressCountry: 'IN' },
      { '@type': 'City', name: 'Mumbai', addressRegion: 'Maharashtra', addressCountry: 'IN' },
    ],
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IN',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+91-70084-10996',
      contactType: 'customer service',
      availableLanguage: ['English', 'Hindi', 'Gujarati'],
    },
    sameAs: [
      'https://www.linkedin.com/company/clenzey/',
      'https://www.instagram.com/tryclenzey',
      'https://www.facebook.com/people/Clenzey/61589435555718/',
    ],
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Cleaning Services',
      itemListElement: [
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Bathroom Cleaning' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Kitchen Cleaning' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Full Home Cleaning' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Floor Cleaning' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Ironing Service' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Window Cleaning' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Office Cleaning' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Restaurant Cleaning' } },
      ],
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Clenzey',
    url: SITE_URL,
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Clenzey Home Services',
    url: SITE_URL,
    logo: `${SITE_URL}${LOGO_SRC}`,
    sameAs: [
      'https://www.linkedin.com/company/clenzey/',
      'https://www.instagram.com/tryclenzey',
      'https://www.facebook.com/people/Clenzey/61589435555718/',
    ],
  };

  return (
    <>
      <JsonLd data={localBusinessSchema} />
      <JsonLd data={websiteSchema} />
      <JsonLd data={organizationSchema} />
    </>
  );
}
