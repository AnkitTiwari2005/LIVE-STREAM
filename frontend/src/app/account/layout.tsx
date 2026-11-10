import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account & Security Settings',
  description: 'Manage your Shubhdarshan profile, two-factor authentication, and DPDP privacy controls.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
