import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Broadcasts & Sessions',
  description: 'Manage your scheduled, live, and completed Shubhdarshan devotional broadcasts.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function StudioStreamsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
