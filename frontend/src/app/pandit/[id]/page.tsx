import type { Metadata } from 'next';
import PanditProfileClient from './PanditProfileClient';

const CURATED_PANDIT_METADATA: Record<string, { title: string; description: string }> = {
  'aarav-sharma': {
    title: 'Pandit Aarav Sharma — Head Archak, Kashi Vishwanath Parampara',
    description:
      'Profile and live poojas by Pandit Aarav Sharma (22 years seva), specializing in Rudrabhishek, Mahamrityunjaya Jaap, Ganga Aarti, and Vedic Chanting.',
  },
  'hariram-vyas': {
    title: 'Pandit Hariram Vyas — Senior Purohit, Haridwar Ganga Sabha',
    description:
      'Profile and live rituals by Pandit Hariram Vyas (18 years seva), specializing in Sandhya Aarti, Navgrah Shanti, and Kavach Path at Har Ki Pauri.',
  },
  'vishwanath-bhatt': {
    title: 'Pandit Vishwanath Bhatt — Vedic Scholar, Tirupati Tradition',
    description:
      'Profile and live recitals by Pandit Vishwanath Bhatt (26 years seva), specializing in Vishnu Sahasranama, Satyanarayan Katha, and Vedic Chanting.',
  },
  devrishi: {
    title: 'Acharya Devrishi — Sanskrit & Jyotish Acharya, Rishikesh',
    description:
      'Profile and Vedic astrology sessions by Acharya Devrishi (15 years seva), specializing in Vedic Astrology, Kundli Milan, and Vastu Shanti.',
  },
};

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { id } = await Promise.resolve(params);
  const meta = CURATED_PANDIT_METADATA[id];
  if (meta) {
    return {
      title: meta.title,
      description: meta.description,
      alternates: { canonical: `/pandit/${id}/` },
    };
  }
  return {
    title: 'Verified Vedic Pandit Profile',
    description:
      'View verified Vedic Pandit credentials, ritual specialties, and upcoming live poojas on Shubhdarshan.',
  };
}

export async function generateStaticParams() {
  return [
    { id: 'aarav-sharma' },
    { id: 'hariram-vyas' },
    { id: 'vishwanath-bhatt' },
    { id: 'devrishi' },
  ];
}

export default function PanditProfilePage() {
  return <PanditProfileClient />;
}
