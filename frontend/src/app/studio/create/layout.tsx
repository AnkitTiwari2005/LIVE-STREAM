import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Go Live — Broadcast Setup',
  description: 'Configure and launch a live devotional broadcast or private sankalp session on Shubhdarshan.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function StudioCreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
