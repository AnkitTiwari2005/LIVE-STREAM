import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Shubhdarshan devotee or broadcaster account.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
