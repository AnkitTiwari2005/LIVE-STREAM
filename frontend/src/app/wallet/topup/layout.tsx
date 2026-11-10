import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Top Up Sacred Coins',
  description: 'Purchase Sacred Coin packs via Razorpay for live darshan and dakshina.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function WalletTopupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
