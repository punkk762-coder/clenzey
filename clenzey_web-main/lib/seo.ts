import type { Metadata } from 'next';

export const SITE_URL = 'https://clenzey.com';
export const SITE_NAME = 'Clenzey';
export const LOGO_SRC = '/images/clenzey-logo.png';
export const LOGO_ALT = 'Clenzey — professional home and office cleaning services';

export const DEFAULT_TITLE =
  'Clenzey — Professional Home & Office Cleaning Services in India';

export const DEFAULT_DESCRIPTION =
  'Book verified, trained cleaning professionals for your home or business in Ahmedabad & Mumbai. Transparent pricing, insured service, and instant booking.';

export const DEFAULT_KEYWORDS = [
  'Clenzey',
  'home cleaning services',
  'office cleaning services',
  'professional cleaning',
  'house cleaning near me',
  'cleaning services Ahmedabad',
  'cleaning services Mumbai',
  'bathroom cleaning',
  'kitchen cleaning',
  'deep cleaning',
  'office cleaning',
  'verified cleaners',
  'trained cleaning professionals',
  'home cleaning India',
  'business cleaning India',
  'cleaning service app',
  'book cleaner online',
];

export const DEFAULT_OG_IMAGE = {
  url: '/images/hero-cleaner.png',
  width: 1200,
  height: 630,
  alt: 'Clenzey Professional Cleaning Services',
};

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  openGraphTitle?: string;
  openGraphDescription?: string;
};

export function createPageMetadata({
  title,
  description,
  path,
  openGraphTitle,
  openGraphDescription,
}: PageMetadataOptions): Metadata {
  const url = `${SITE_URL}${path}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: openGraphTitle ?? title,
      description: openGraphDescription ?? description,
      url,
      siteName: SITE_NAME,
      locale: 'en_IN',
      type: 'website',
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: openGraphTitle ?? title,
      description: openGraphDescription ?? description,
      images: [DEFAULT_OG_IMAGE.url],
    },
  };
}
