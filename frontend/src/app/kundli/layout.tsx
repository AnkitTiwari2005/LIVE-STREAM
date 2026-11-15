import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Kundli Online - Janam Kundali, Dasha & Avakhada',
  description:
    'Generate your Vedic janam kundli online: lagna, moon sign, nakshatra, planetary positions, avakhada, Vimshottari dasha and North or South Indian chart, then consult a verified pandit on Shubhdarshan.',
  alternates: { canonical: '/kundli/' },
  openGraph: {
    title: 'Free Kundli Online - Janam Kundali, Dasha & Avakhada | Shubhdarshan',
    description:
      'Your Vedic birth chart with lagna, rashi, nakshatra, dasha and avakhada, calculated for your exact birth time and place.',
    url: '/kundli/',
  },
};

export default function KundliLayout({ children }: { children: React.ReactNode }) {
  return children;
}
