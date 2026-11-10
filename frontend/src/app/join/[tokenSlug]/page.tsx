import type { Metadata } from 'next';
import JoinPrivateStreamClient from './JoinPrivateStreamClient';

export const metadata: Metadata = {
  title: 'Private Sacred Pooja Session',
  description: 'Join an invitation-only live sankalp pooja session on Shubhdarshan.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export async function generateStaticParams() {
  return [{ tokenSlug: 'invite' }];
}

export default function JoinPrivateStreamPage() {
  return <JoinPrivateStreamClient />;
}
