import JsonLd from './JsonLd';
import { SITE_URL } from '../../lib/seo';

type FaqItem = {
  question: string;
  answer: string;
};

type FaqSchemaProps = {
  items: FaqItem[];
};

export default function FaqSchema({ items }: FaqSchemaProps) {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'FAQs & Guides',
        item: `${SITE_URL}/faq`,
      },
    ],
  };

  return (
    <>
      <JsonLd data={faqSchema} />
      <JsonLd data={breadcrumbSchema} />
    </>
  );
}
