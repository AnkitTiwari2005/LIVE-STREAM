import StaticCMSClient from './StaticCMSClient';

// R-06: Removed 'contact' and 'faq' — those have dedicated pages at
// app/contact/page.tsx and app/faq/page.tsx. Keeping them here caused
// the [slug] CMS page to shadow the proper pages.
export async function generateStaticParams() {
  return [
    { slug: 'terms' },
    { slug: 'privacy' },
    { slug: 'refund' },
    { slug: 'grievance' },
    { slug: 'pandit-guidelines' },
    { slug: 'about' },
  ];
}

export default function StaticCMSPage() {
  return <StaticCMSClient />;
}
