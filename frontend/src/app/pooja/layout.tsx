import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sacred Poojas & Vedic Rituals Catalog',
  description:
    'Explore live Hindu poojas, Rudrabhishek, Havans, Kathas, and Vedic Astrology rituals performed by KYC-verified Pandits on Shubhdarshan.',
  alternates: { canonical: '/pooja/' },
};

export default function PoojaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
