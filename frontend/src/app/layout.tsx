import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@livekit/components-styles';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const SITE_URL = 'https://darkturquoise-louse-359917.hostingersite.com';

export const viewport: Viewport = {
  themeColor: '#0c0a09',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Shubhdarshan - Sacred Pooja & Astrology Live Streaming',
    template: '%s | Shubhdarshan',
  },
  description:
    'Experience sacred live Hindu poojas, temple aartis, Vedic rituals, and 1-on-1 personalized astrology consultations with verified pandits on Shubhdarshan.',
  keywords: [
    'Shubhdarshan',
    'live pooja streaming',
    'online mandir darshan',
    'vedic pandit live',
    'astrology consultation',
    'hindu rituals streaming',
    'live aarti kashi',
    'online sankalp',
  ],
  authors: [{ name: 'Shubhdarshan Platform Team' }],
  creator: 'Shubhdarshan',
  publisher: 'Shubhdarshan Devotional Media',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: 'Shubhdarshan',
    title: 'Shubhdarshan - Sacred Pooja & Astrology Live Streaming',
    description:
      'Connect with verified Vedic pandits and certified astrologers for live rituals, aarti, and spiritual consultations.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shubhdarshan - Sacred Pooja & Astrology Live Streaming',
    description:
      'Live devotional broadcasts, online pooja sankalp, and Vedic astrological consultations.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Schema.org JSON-LD Structured Data for AI & Search Engine Knowledge Graphs
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: 'Shubhdarshan',
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        description:
          'Premier platform for live Hindu devotional broadcasts, temple pooja streaming, and Vedic astrological consultations.',
        sameAs: [],
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: 'Shubhdarshan',
        publisher: {
          '@id': `${SITE_URL}/#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'BroadcastService',
        name: 'Shubhdarshan Live Pooja & Aarti Broadcast',
        broadcaster: {
          '@id': `${SITE_URL}/#organization`,
        },
        areaServed: 'Worldwide',
        inLanguage: ['hi', 'sa', 'en'],
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-stone-950 text-stone-100 antialiased selection:bg-orange-500 selection:text-white">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
