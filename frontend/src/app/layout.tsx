import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import './theme.css';
import '@livekit/components-styles';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FestivalBanner } from '@/components/FestivalBanner';
import { ToastProvider } from '@/components/Toast';

// R-07: Self-hosted fonts via next/font/google — fonts are bundled into the static
// output at build time. No external request to fonts.googleapis.com at runtime,
// so CSP restrictions and network latency cannot affect font loading.
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
});

// R-08: Use env var so the production domain is set via NEXT_PUBLIC_SITE_URL
// instead of the staging hostname being hardcoded in source.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://darkturquoise-louse-359917.hostingersite.com';

export const viewport: Viewport = {
  // M-11: Use media-based themeColor so mobile browser chrome matches the active theme.
  // Previously always obsidian/black even for light-mode users.
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0c0a09' },
    { media: '(prefers-color-scheme: light)', color: '#fafaf5' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Shubhdarshan - Sacred Live Pooja, Aarti & Vedic Astrology Worldwide',
    template: '%s | Shubhdarshan',
  },
  description:
    'Experience sacred live Hindu poojas, temple aartis, Vedic rituals, and 1-on-1 personalized astrology consultations with verified pandits on Shubhdarshan. Claim 100 free coins on signup.',
  keywords: [
    'Shubhdarshan',
    'live pooja streaming',
    'online mandir darshan',
    'vedic pandit live',
    'astrology consultation',
    'hindu rituals streaming',
    'live aarti kashi vishwanath',
    'online sankalp pooja',
    'sacred coins wallet',
    'DPDP Act 2023 pooja',
    'ayodhya live darshan',
    'ujjain bhasma aarti live',
  ],
  authors: [{ name: 'Shubhdarshan Platform Team' }],
  creator: 'Shubhdarshan Devotional Media Private Limited',
  publisher: 'Shubhdarshan Devotional Media',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: 'Shubhdarshan',
    title: 'Shubhdarshan - Sacred Live Pooja, Aarti & Vedic Astrology Worldwide',
    description:
      'Connect with verified Vedic pandits and certified astrologers for live rituals, aarti, and spiritual consultations in real-time. 100 free coins for all new devotees.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shubhdarshan - Sacred Live Pooja & Aarti Broadcast',
    description:
      'Sub-second live devotional broadcasts, online pooja sankalp, and Vedic astrological consultations with verified Acharyas.',
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
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
        legalName: 'Shubhdarshan Devotional Media Private Limited',
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        description:
          'Premier platform for live Hindu devotional broadcasts, temple pooja streaming, and Vedic astrological consultations worldwide.',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Suite 402, Sacred Heights, Barakhamba Road, Connaught Place',
          addressLocality: 'New Delhi',
          addressRegion: 'Delhi',
          postalCode: '110001',
          addressCountry: 'IN',
        },
        contactPoint: [
          {
            '@type': 'ContactPoint',
            telephone: '+91-11-4019-7800',
            contactType: 'customer support',
            email: 'support@shubhdarshan.com',
            areaServed: 'IN',
            availableLanguage: ['Hindi', 'English', 'Sanskrit'],
          },
          {
            '@type': 'ContactPoint',
            email: 'grievance@shubhdarshan.com',
            contactType: 'Grievance Officer',
            areaServed: 'IN',
          },
        ],
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
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: SITE_URL,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Sacred Coins Topup',
            item: `${SITE_URL}/wallet/topup`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'About Us',
            item: `${SITE_URL}/about`,
          },
          {
            '@type': 'ListItem',
            position: 4,
            name: 'Devotee FAQ',
            item: `${SITE_URL}/faq`,
          },
        ],
      },
    ],
  };

  return (
    // R-07: className injects next/font CSS vars so Tailwind font-serif/sans/mono work with self-hosted fonts
    <html lang="en" className={`${cormorant.variable} ${jakarta.variable} ${jetbrains.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            // D-04: When no saved preference exists, honour the visitor's system theme
            // (prefers-color-scheme) instead of always defaulting to light.
            // A phone in dark mode no longer gets a blinding white page on first visit.
            __html: `(function(){try{var t=localStorage.getItem("sd-theme");if(t!=="dark"&&t!=="light"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);if(t==="dark"){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}}catch(e){document.documentElement.setAttribute("data-theme","light");}})()`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-stone-950 text-stone-100 antialiased selection:bg-orange-500 selection:text-white w-full max-w-full overflow-x-clip">
        <ToastProvider>
          <FestivalBanner />
          <Navbar />
          <main className="flex-1 w-full max-w-full overflow-x-clip">{children}</main>
          <Footer />
        </ToastProvider>
      </body>
    </html>
  );
}
