import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Pooja & Aarti Schedule',
  description:
    'View upcoming live temple darshans, daily Sandhya Aartis, and scheduled Vedic rituals on Shubhdarshan.',
  alternates: { canonical: '/schedule/' },
};

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
