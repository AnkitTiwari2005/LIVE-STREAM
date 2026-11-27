import React from 'react';
import type { Metadata } from 'next';
import { GrievanceContent } from '@/components/LegalPagesClient';

export const metadata: Metadata = {
  title: 'Grievance Redressal Mechanism',
  description:
    'Designated Resident Grievance Officer details and statutory dispute escalation procedures under Rule 3(2) of the Information Technology Rules, 2021.',
  alternates: { canonical: '/grievance/' },
};

export default function GrievancePage() {
  return <GrievanceContent />;
}
