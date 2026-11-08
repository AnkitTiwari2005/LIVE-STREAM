import React from 'react';
import type { Metadata } from 'next';
import { ShieldCheck, Award, AlertOctagon, CheckCircle2, BookOpen } from 'lucide-react';
import { OmIcon, VerifiedPanditBadge } from '@/components/icons/SpiritualIcons';

export const metadata: Metadata = {
  title: 'Vedic Pandit Verification & Code of Ethics',
  description:
    'Stringent accreditation standards, priesthood credential verification, and strict anti-superstition guidelines for streamers on Shubhdarshan.',
  alternates: { canonical: '/pandit-guidelines' },
};

export default function PanditGuidelinesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-obsidian-soft border border-gold/20 rounded-3xl p-6 sm:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-6">
          <OmIcon size={32} />
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
              Priesthood Accreditation
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Pandit Verification & Code of Ethics
            </h1>
          </div>
        </div>

        <p className="text-xs text-stone-400 mb-8 pb-4 border-b border-stone-800">
          Upholding Sanatana Dharma authenticity, Vedic scriptural accuracy, and zero exploitation on Shubhdarshan.
        </p>

        <div className="space-y-8 text-stone-300 text-sm leading-relaxed">
          {/* Section 1 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">1.</span> Mandatory Verification Criteria
            </h2>
            <p>
              Before any spiritual streamer is granted broadcasting privileges and awarded the sacred <VerifiedPanditBadge size={16} className="inline ml-1 mr-1 align-text-bottom" /> <strong>Verified Pandit Badge</strong>, our ecclesiastical review board validates:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="p-4 bg-obsidian-deep border border-gold/15 rounded-xl">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
                  <BookOpen className="w-4 h-4" /> Scriptural Credentials
                </div>
                <p className="text-[11px] text-stone-400">
                  Certification from recognized Vedic Sanskrit Gurukuls, Vidyapeeths, Jyotish academies, or established temple trusts.
                </p>
              </div>
              <div className="p-4 bg-obsidian-deep border border-gold/15 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
                  <ShieldCheck className="w-4 h-4" /> Government Identity KYC
                </div>
                <p className="text-[11px] text-stone-400">
                  Government photo identification verification (masked Aadhaar/PAN) to prevent impersonation and fraud.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">2.</span> Strict Anti-Superstition Code
            </h2>
            <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-2xl text-xs sm:text-sm text-red-200">
              <div className="flex items-start gap-2.5">
                <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Prohibited Practices:</strong> Verified Pandits are strictly prohibited from:
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-red-300">
                    <li>Making guarantees of winning lotteries, legal verdicts, or miraculous physical illness cures.</li>
                    <li>Promoting fear-based or coercive rituals (e.g. Kaal Sarp / Pitra Dosh terror tactics).</li>
                    <li>Claiming practice of black magic, Vashikaran, or destructive tantric rituals.</li>
                    <li>Demanding cash transfers outside the platform.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">3.</span> Broadcasting Technical Standards
            </h2>
            <p>
              Broadcasting Pandits must maintain a dignified, serene sacred altar, adequate acoustic clarity for Vedic mantras, and a stable internet connection supporting at least 720p HD transmission.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
