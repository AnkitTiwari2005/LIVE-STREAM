import StaticCMSClient from './StaticCMSClient';

export async function generateStaticParams() {
  return [
    { slug: 'terms' },
    { slug: 'privacy' },
    { slug: 'grievance' },
  ];
}

export default function StaticCMSPage() {
  return <StaticCMSClient />;
}
