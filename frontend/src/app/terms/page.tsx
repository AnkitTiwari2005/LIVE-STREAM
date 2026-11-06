import React from 'react';
import type { Metadata } from 'next';
import { Shield, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { OmIcon } from '@/components/icons/SpiritualIcons';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Terms and Conditions for using Shubhdarshan live devotional streaming, Vedic pooja sessions, and astrological consultations under the Information Technology Act, 2000.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-12 shadow-2xl relative overflow-hidden">
        {/* Sacred ambient background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-6">
          <OmIcon size={32} />
          <div>
            <span className="text-xs font-bold text-orange-400 uppercase tracking-widest block">
              Legal Compliance
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Terms of Service
            </h1>
          </div>
        </div>

        <p className="text-xs text-stone-400 mb-8 pb-4 border-b border-stone-800">
          Last Updated: November 2026 • Effective under the Information Technology Act, 2000 & Indian Contract Act, 1872
        </p>

        <div className="space-y-8 text-stone-300 text-sm leading-relaxed">
          {/* Section 1 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">1.</span> Acceptance of Terms & Eligibility
            </h2>
            <p>
              By accessing, browsing, or registering on <strong>Shubhdarshan</strong> (&ldquo;Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;), you (&ldquo;User&rdquo;, &ldquo;Devotee&rdquo;, or &ldquo;Streamer&rdquo;) agree to be legally bound by these Terms of Service. In compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act), users must be at least 18 years of age or possess verified guardian consent to register.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">2.</span> Intermediary Status & Platform Role
            </h2>
            <p>
              Shubhdarshan operates strictly as an <strong>intermediary</strong> as defined under Section 2(1)(w) and Section 79 of the Information Technology Act, 2000, and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021. The platform provides real-time WebRTC digital transmission infrastructure for independent Vedic priests, temples, and astrologers to broadcast sacred poojas, aartis, and discourses.
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">3.</span> Spiritual & Astrological Disclaimer
            </h2>
            <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl text-amber-200/90 text-xs sm:text-sm">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Important Faith & Advisory Notice:</strong> All religious rituals, pooja sankalps, astrological analyses, Kundli matchmaking, and remedial measures conducted on Shubhdarshan are spiritual counseling practices rooted in Sanatana Dharma traditions. We make <strong>no warranties, guarantees, or claims</strong> regarding material wealth, physical cures, medical treatment, or guaranteed worldly outcomes. Astrology and pooja consultations must not substitute certified medical, psychiatric, or legal advice.
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">4.</span> Sacred Coins & Wallet System
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Closed-Loop Digital System:</strong> Shubhdarshan Coins are closed-loop prepaid digital tokens issued solely to access live darshan and pooja services on our platform under RBI Master Direction on Prepaid Payment Instruments.
              </li>
              <li>
                <strong>Consumption Rate:</strong> Public live streams consume coins at the published rate of <strong>5 coins per minute</strong>.
              </li>
              <li>
                <strong>Non-Transferable & Non-Withdrawable:</strong> Coins cannot be redeemed for fiat cash, transferred between users, or used for third-party commerce.
              </li>
              <li>
                <strong>Complimentary Bonus:</strong> The 100 free joining bonus coins carry a 30-day promotional validity.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">5.</span> Code of Conduct & Sanctity Protection
            </h2>
            <p>
              Users must preserve the sanctity of devotional live broadcasts. Any user engaging in hate speech, blasphemy, obscenity, defamation, harassment, or fraudulent solicitation will face immediate account termination and permanent ban from live chat without refund.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">6.</span> Jurisdiction & Dispute Resolution
            </h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the Republic of India. Any legal dispute arising under these terms shall be subject to the exclusive jurisdiction of the competent courts in Mumbai, Maharashtra, India.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
