import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Operations Console',
  description: 'Shubhdarshan platform moderation, KYC review, and administrative operations console.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
