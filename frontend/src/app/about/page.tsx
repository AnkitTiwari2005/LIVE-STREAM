import React from 'react';
import type { Metadata } from 'next';
import AboutContent from './AboutContent';

export const metadata: Metadata = {
  title: 'About Us - Founded by Pt. Rohit Tiwari & Pt. Santosh Kumar Shastri | Param Darshan',
  description:
    'Param Darshan is founded in Delhi by revered Vedic astrologers पंडित रोहित तिवारी (Pt. Rohit Tiwari - ज्योतिषाचार्य) and पंडित संतोष कुमार शास्त्री (Pt. Santosh Kumar Shastri - ज्योतिष एवं वास्तु विशेषज्ञ) to connect devotees worldwide with authentic live darshan and shastric wisdom.',
  alternates: { canonical: '/about/' },
};

export default function AboutPage() {
  return <AboutContent />;
}
