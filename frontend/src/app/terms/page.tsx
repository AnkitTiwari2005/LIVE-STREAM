import React from 'react';
import type { Metadata } from 'next';
import { TermsContent } from '@/components/LegalPagesClient';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms and Conditions for using Param Darshan live devotional streaming, Vedic pooja sessions, and astrological consultations under the Information Technology Act, 2000.',
  alternates: { canonical: '/terms/' },
};

export default function TermsPage() {
  return <TermsContent />;
}
