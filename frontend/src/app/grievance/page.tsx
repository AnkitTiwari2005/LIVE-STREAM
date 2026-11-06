import React from 'react';
import type { Metadata } from 'next';
import { ShieldCheck, Mail, MapPin, Clock, ExternalLink } from 'lucide-react';
import { OmIcon } from '@/components/icons/SpiritualIcons';

export const metadata: Metadata = {
  title: 'Grievance Redressal Mechanism',
  description:
    'Designated Resident Grievance Officer details and statutory dispute escalation procedures under Rule 3(2) of the Information Technology Rules, 2021.',
  alternates: { canonical: '/grievance' },
};

export default function GrievancePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-6">
          <OmIcon size={32} />
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest block">
              IT Rules 2021 Compliance
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Grievance Redressal Mechanism
            </h1>
          </div>
        </div>

        <p className="text-xs text-stone-400 mb-8 pb-4 border-b border-stone-800">
          Published pursuant to Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.
        </p>

        <div className="space-y-8 text-stone-300 text-sm leading-relaxed">
          {/* Section 1 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">1.</span> Designated Resident Grievance Officer
            </h2>
            <p>
              In accordance with the Information Technology Rules, 2021 and DPDP Act 2023, the details of our designated Resident Grievance Officer and Data Protection Officer are as follows:
            </p>
            <div className="mt-4 p-5 bg-stone-950 border border-stone-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <span className="text-white font-bold text-base">Acharya Devrat Sharma</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-600/20 text-orange-400 border border-orange-500/30">
                  Resident Grievance Officer
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-stone-400 block font-medium">Official Grievance Email</span>
                    <a href="mailto:grievance@shubhdarshan.com" className="text-orange-400 hover:underline font-semibold">
                      grievance@shubhdarshan.com
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-stone-400 block font-medium">Physical Postal Address</span>
                    <span>Level 5, Lotus Spiritual Tower, Andheri East, Mumbai 400069, MH, India</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">2.</span> Mandatory Resolution Timelines
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
                  <Clock className="w-4 h-4" /> 24 Hours Acknowledgment
                </div>
                <p className="text-[11px] text-stone-400">
                  Every user complaint or report of objectionable content received will be formally acknowledged with a unique ticket reference number within 24 hours.
                </p>
              </div>
              <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
                  <ShieldCheck className="w-4 h-4" /> 15 Days Complete Redressal
                </div>
                <p className="text-[11px] text-stone-400">
                  The Grievance Officer will investigate and dispose of the complaint within 15 calendar days from the date of receipt, issuing a reasoned determination.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-amber-400 font-mono">3.</span> Grievance Appellate Committee (GAC)
            </h2>
            <p>
              If a user is dissatisfied with the decision of our Grievance Officer, they may prefer an appeal before the central <strong>Grievance Appellate Committee (GAC)</strong> established by the Central Government under Rule 3A of the Information Technology Rules, 2021 via their portal:
            </p>
            <div className="mt-2 text-xs">
              <a
                href="https://gac.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-orange-400 hover:text-orange-300 font-semibold"
              >
                <span>Visit MeitY Grievance Appellate Committee (gac.gov.in)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
