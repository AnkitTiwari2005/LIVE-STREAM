import React from 'react';
import type { Metadata } from 'next';
import { ShieldCheck, Lock, UserCheck, Eye, Trash2 } from 'lucide-react';
import { OmIcon } from '@/components/icons/SpiritualIcons';

export const metadata: Metadata = {
  title: 'Privacy Policy (DPDP Act 2023 Compliant)',
  description:
    'Comprehensive Privacy Notice for Shubhdarshan under the Digital Personal Data Protection Act, 2023 (DPDP Act) and Indian IT Rules.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-obsidian-soft border border-gold/20 rounded-3xl p-6 sm:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-6">
          <OmIcon size={32} />
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">
              DPDP Act 2023 Compliant
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Privacy Policy
            </h1>
          </div>
        </div>

        <p className="text-xs text-stone-400 mb-8 pb-4 border-b border-stone-800">
          Last Revised: November 2026 • Governing Statute: Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023)
        </p>

        <div className="space-y-8 text-stone-300 text-sm leading-relaxed">
          {/* Section 1 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">1.</span> Data Fiduciary Identification
            </h2>
            <p>
              Under the DPDP Act 2023, <strong>Shubhdarshan Devotional Media Private Limited</strong> acts as the <strong>Data Fiduciary</strong> responsible for determining the purpose and means of processing your personal data.
            </p>
            <div className="mt-3 p-3 bg-stone-950 border border-stone-800 rounded-xl text-xs space-y-1">
              <div><strong>Registered Office:</strong> Level 5, Lotus Spiritual Tower, Andheri East, Mumbai, Maharashtra 400069, India</div>
              <div><strong>Data Protection Officer (DPO):</strong> Acharya Devrat Sharma</div>
              <div><strong>Dedicated DPO Email:</strong> privacy@shubhdarshan.com</div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">2.</span> Personal Data Collected
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Account & Profile Data:</strong> Full Name, verified Email Address, hashed password credentials (bcrypt), and optional Profile Avatar.
              </li>
              <li>
                <strong>Spiritual & Ritual Data:</strong> Gotra, Sankalp prayer intentions, and Vedic birth coordinates submitted strictly for customized pooja recitations and Kundli consultations.
              </li>
              <li>
                <strong>Financial Transaction Identifiers:</strong> Razorpay/UPI Order IDs and transaction status timestamps. We <em>never</em> store credit/debit card numbers or UPI PINs on our servers.
              </li>
              <li>
                <strong>Technical Telemetry:</strong> Anonymized IP address, browser user-agent, and LiveKit WebRTC connection metrics to guarantee broadcast streaming quality.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">3.</span> Purpose of Processing & Explicit Consent
            </h2>
            <p>
              We process personal data strictly pursuant to Section 6 of the DPDP Act 2023 on the basis of your explicit, informed, and unambiguous consent:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1.5 text-xs text-stone-400">
              <li>Facilitating WebRTC video delivery of temple ceremonies and astrologer interactions.</li>
              <li>Accrediting and debiting your 5 coins/min public darshan meter sessions.</li>
              <li>Notifying you of upcoming pooja broadcasts you scheduled reminders for.</li>
              <li>Complying with statutory reporting obligations under the IT Act, 2000.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">4.</span> Rights of the Data Principal
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-xl">
                <div className="flex items-center gap-2 font-bold text-white text-xs mb-1">
                  <Eye className="w-4 h-4 text-amber-400" /> Right to Access
                </div>
                <p className="text-[11px] text-stone-400">Request a summary of personal data held and processed by Shubhdarshan.</p>
              </div>
              <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-xl">
                <div className="flex items-center gap-2 font-bold text-white text-xs mb-1">
                  <Trash2 className="w-4 h-4 text-red-400" /> Right to Erasure / Forgotten
                </div>
                <p className="text-[11px] text-stone-400">Request permanent deletion of your profile, email, and live records at any time.</p>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">5.</span> Data Retention & Auto-Purge Policy
            </h2>
            <p>
              Devotional live chat messages are retained for a maximum of <strong>30 days</strong> for community moderation purposes, after which they are automatically anonymized or purged. KYC records submitted by aspiring Pandits (masked Aadhaar/certificates) are reviewed and securely deleted within 30 days of verification decision.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
