import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create your free Shubhdarshan devotee account and claim 100 Sacred Coins.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
