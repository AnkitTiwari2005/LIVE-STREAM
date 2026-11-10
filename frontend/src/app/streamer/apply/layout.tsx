import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Apply as Verified Pandit',
  description: 'Submit your Vedic credentials and KYC documents to stream on Shubhdarshan.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function StreamerApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
