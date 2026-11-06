import type { Metadata } from 'next';
import './globals.css';
import '@livekit/components-styles';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Pooja & Astrology Live - Sacred Darshan & Live Consultations',
  description: 'Connect with verified Vedic pandits and certified astrologers for live rituals, aarti, and spiritual consultations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-stone-950 text-stone-100 antialiased selection:bg-orange-500 selection:text-white">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
