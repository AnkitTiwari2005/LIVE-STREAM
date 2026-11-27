import React from 'react';
import type { Metadata } from 'next';
import { RefundContent } from '@/components/LegalPagesClient';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy',
  description:
    'Clear guidelines on Param Darshan Sacred Coins, failed payment auto-reversals, and cancellation terms under the Consumer Protection (E-Commerce) Rules, 2020.',
  alternates: { canonical: '/refund/' },
};

export default function RefundPage() {
  return <RefundContent />;
}
