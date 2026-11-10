import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verify Email Address',
  description: 'Confirm your email address to activate your Shubhdarshan account.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
