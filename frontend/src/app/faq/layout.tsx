import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Find answers about Shubhdarshan Sacred Coins, metered live darshan billing, KYC-verified Pandits, and DPDP data privacy.',
  alternates: { canonical: '/faq/' },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
