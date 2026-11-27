import React from 'react';
import type { Metadata } from 'next';
import { PrivacyContent } from '@/components/LegalPagesClient';

export const metadata: Metadata = {
  title: 'Privacy Policy (DPDP Act 2023 Compliant)',
  description:
    'Comprehensive Privacy Notice for Param Darshan under the Digital Personal Data Protection Act, 2023 (DPDP Act) and Indian IT Rules.',
  alternates: { canonical: '/privacy/' },
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
