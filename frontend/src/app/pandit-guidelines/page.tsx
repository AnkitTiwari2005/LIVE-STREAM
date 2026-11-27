import React from 'react';
import type { Metadata } from 'next';
import { PanditGuidelinesContent } from '@/components/LegalPagesClient';

export const metadata: Metadata = {
  title: 'Vedic Pandit Verification & Code of Ethics',
  description:
    'Stringent accreditation standards, priesthood credential verification, and strict anti-superstition guidelines for streamers on Param Darshan.',
  alternates: { canonical: '/pandit-guidelines/' },
};

export default function PanditGuidelinesPage() {
  return <PanditGuidelinesContent />;
}
