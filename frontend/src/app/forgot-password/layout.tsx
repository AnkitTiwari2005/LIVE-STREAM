import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password',
  description: 'Request a password reset link for your Shubhdarshan account.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
