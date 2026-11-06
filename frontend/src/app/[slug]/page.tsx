import StaticCMSClient from './StaticCMSClient';

export async function generateStaticParams() {
  return [
    { slug: 'terms' },
    { slug: 'privacy' },
    { slug: 'refund' },
    { slug: 'grievance' },
    { slug: 'pandit-guidelines' },
    { slug: 'about' },
    { slug: 'contact' },
    { slug: 'faq' },
  ];
}

export default function StaticCMSPage() {
  return <StaticCMSClient />;
}
