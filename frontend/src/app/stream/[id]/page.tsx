import type { Metadata } from 'next';
import StreamPlayerClient from './StreamPlayerClient';

export const metadata: Metadata = {
  title: 'Live Darshan Stream',
  description: 'Watch real-time sacred darshan, chant together, and offer dakshina on Param Darshan.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export async function generateStaticParams() {
  return [{ id: 'demo' }];
}

export default function StreamPlayerPage() {
  return <StreamPlayerClient />;
}
