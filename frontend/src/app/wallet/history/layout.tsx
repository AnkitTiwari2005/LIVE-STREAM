import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sacred Coin Transaction History',
  description: 'Review your Shubhdarshan Sacred Coin ledger, recharges, and viewing history.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function WalletHistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
