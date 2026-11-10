import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Broadcaster Verification Status',
  description: 'Track your Shubhdarshan KYC review and broadcaster approval status.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function StreamerStatusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
