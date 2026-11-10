import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact & Devotee Support',
  description:
    'Contact the Shubhdarshan support team for assistance with live darshan streaming, Sacred Coins, temple onboarding, or technical queries.',
  alternates: { canonical: '/contact/' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
