import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pandit Earnings & Payouts',
  description: 'Review your dakshina receipts, darshan minutes, and Sacred Coin settlement ledger.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function StreamerEarningsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
