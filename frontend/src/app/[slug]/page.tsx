import type { Metadata } from 'next';
import StaticCMSClient from './StaticCMSClient';

const CMS_METADATA: Record<string, { title: string; description: string }> = {
  terms: {
    title: 'Terms of Service',
    description:
      'Terms and Conditions for using Shubhdarshan live devotional streaming and consultation services.',
  },
  privacy: {
    title: 'Privacy Policy (DPDP Act 2023 Compliant)',
    description:
      'Privacy Notice for Shubhdarshan under the Digital Personal Data Protection Act, 2023.',
  },
  refund: {
    title: 'Refund & Cancellation Policy',
    description: 'Guidelines on Shubhdarshan Sacred Coins, payment reversals, and cancellations.',
  },
  grievance: {
    title: 'Grievance Redressal Mechanism',
    description:
      'Designated Resident Grievance Officer details and dispute resolution procedures.',
  },
  'pandit-guidelines': {
    title: 'Vedic Pandit Verification & Code of Ethics',
    description:
      'Accreditation standards and anti-superstition code of conduct for verified Pandits.',
  },
  about: {
    title: 'About Us - Sacred Devotion Meets Modern Technology',
    description:
      'Learn about Shubhdarshan’s mission connecting devotees worldwide with authentic Vedic rituals.',
  },
};

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const { slug } = await Promise.resolve(params);
  const meta = CMS_METADATA[slug];
  if (meta) {
    return {
      title: meta.title,
      description: meta.description,
      alternates: { canonical: `/${slug}/` },
    };
  }
  return {
    title: 'Policy & Platform Information',
    description: 'Legal notices, policies, and official Shubhdarshan documentation.',
  };
}

// R-06 / M-02: Dedicated static pages exist at app/about, terms, privacy, refund,
// grievance, pandit-guidelines, contact, and faq. Exporting them here caused Next.js
// static export to overwrite /about/index.html (and race on policy pages). Keep only
// a non-colliding shell slug for any runtime CMS page lookup.
export async function generateStaticParams() {
  return [{ slug: 'notice' }];
}

export default function StaticCMSPage() {
  return <StaticCMSClient />;
}
