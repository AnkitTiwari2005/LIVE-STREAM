import type { Metadata } from 'next';
import PanditProfileClient from './PanditProfileClient';

const CURATED_PANDIT_METADATA: Record<string, { title: string; description: string }> = {
  'rohit-tiwari': {
    title: 'पंडित रोहित तिवारी (ज्योतिषाचार्य) — Matrimonial advisor & Astrologer (Founder)',
    description:
      'Profile and Vedic astrology consultations by Pandit Rohit Tiwari (Founder), specializing in Matrimonial Advice, Kundli Milan, and Parashari Jyotish.',
  },
  'santosh-shastri': {
    title: 'पंडित संतोष कुमार शास्त्री — ज्योतिष एवं वास्तु विशेषज्ञ (Co-Founder)',
    description:
      'Profile and Vedic consultations by Pandit Santosh Kumar Shastri (Co-Founder), specializing in Vastu Shastra, Kundli Milan, and Vedic rituals.',
  },
  'ravi-pathak': {
    title: 'पंडित रवि पाठक — कर्मकाण्ड विशेषज्ञ',
    description:
      'Profile and authentic rituals by Pandit Ravi Pathak, specializing in Karmakand, Maha Yagya, and Vedic Anushthan.',
  },
  'nitin-sharma': {
    title: 'पंडित नितिन शर्मा — कर्मकाण्ड, सुंदरकांड विशेषज्ञ',
    description:
      'Profile and devotional recitations by Pandit Nitin Sharma, specializing in Karmakand, Sundarkand Path, and Hanuman Aradhana.',
  },
  'umesh-shastri': {
    title: 'पंडित उमेश शास्त्री — रुद्राभिषेक एवं देवी पूजा',
    description:
      'Profile and sacred ceremonies by Pandit Umesh Shastri, specializing in Rudrabhishek, Devi Pooja, and Durga Saptashati.',
  },
  'kuber-tripathi': {
    title: 'आचार्य कुबेर दत्त त्रिपाठी — ज्योतिष कर्मकाण्ड विशेषज्ञ',
    description:
      'Profile and devotional guidance by Acharya Kuber Dutt Tripathi, specializing in Jyotish, Karmakand, and Bhajan Sandhya.',
  },
  'subhash-shastri': {
    title: 'पंडित सुभाष शास्त्री — सत्य नारायण पूजा, दुर्गासप्तशती पाठ, नवग्रहपूजन, रुद्राभिषेक',
    description:
      'Profile and Vedic rituals by Pandit Subhash Shastri, specializing in Satyanarayan Pooja, Durga Saptashati, Navgrah Poojan, and Rudrabhishek.',
  },
  'sumit-shastri': {
    title: 'पंडित सुमित शास्त्री (कर्मकांड,ज्योतिष) — कर्मकांड एवं ज्योतिष विशेषज्ञ',
    description:
      'Profile and Vedic rituals by Pandit Sumit Shastri, specializing in Karmakand, Vedic Astrology, Pooja Vidhi, and Kundli Milan.',
  },
  'nandkishor-tripathi': {
    title: 'पंडित नंदकिशोर त्रिपाठी (कर्मकांड,ज्योतिष) — कर्मकांड एवं ज्योतिष विशेषज्ञ',
    description:
      'Profile and Vedic rituals by Pandit Nandkishor Tripathi, specializing in Karmakand, Vedic Astrology, Graha Shanti, and Anushthan.',
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
      'View verified Vedic Pandit credentials, ritual specialties, and upcoming live poojas on Param Darshan.',
  };
}

export async function generateStaticParams() {
  return [
    { id: 'rohit-tiwari' },
    { id: 'santosh-shastri' },
    { id: 'ravi-pathak' },
    { id: 'nitin-sharma' },
    { id: 'umesh-shastri' },
    { id: 'kuber-tripathi' },
    { id: 'subhash-shastri' },
    { id: 'sumit-shastri' },
    { id: 'nandkishor-tripathi' },
  ];
}

export default function PanditProfilePage() {
  return <PanditProfileClient />;
}
