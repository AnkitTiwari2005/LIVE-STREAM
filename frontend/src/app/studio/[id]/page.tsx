import type { Metadata } from 'next';
import StudioClient from './StudioClient';

export const metadata: Metadata = {
  title: 'Broadcaster Studio',
  description: 'Live broadcaster studio controls for active Shubhdarshan devotional sessions.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export async function generateStaticParams() {
  return [{ id: 'demo' }];
}

export default function StreamerStudioPage() {
  return <StudioClient />;
}
