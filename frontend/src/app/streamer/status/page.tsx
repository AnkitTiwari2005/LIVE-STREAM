'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Clock,
  AlertCircle,
  XCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  FileText,
  Video,
} from 'lucide-react';
import { OmIcon, DiyaIcon, VerifiedPanditBadge, PranamIcon } from '@/components/icons/SpiritualIcons';
import { apiFetch } from '@/lib/api';

export default function StreamerStatusPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const data = await apiFetch('/streamers/me');
        setProfile(data);
      } catch (err: any) {
        if (err.status === 401) {
          router.push('/login?redirect=/streamer/status');
          return;
        }
        setError(err.message || 'Unable to retrieve verification status');
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-stone-400 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold" />
        <span className="text-xs uppercase tracking-wider font-semibold">Checking Verification Status...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian text-foreground py-12 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-xl mx-auto px-4 sm:px-6">
        <div className="bg-obsidian-soft border border-gold/25 rounded-3xl p-8 shadow-2xl">
          <div className="flex justify-center mb-4">
            <OmIcon size={44} />
          </div>

          <h1 className="font-serif text-2xl font-bold text-center text-white mb-2">
            Pandit Verification Portal
          </h1>
          <p className="text-xs text-center text-stone-400 mb-6">
            Official Vedic Broadcaster Status &amp; KYC Verification
          </p>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!profile ? (
            <div className="text-center py-6 space-y-4">
              <div className="p-4 rounded-2xl bg-gold/10 border border-gold/20 text-stone-300 text-xs">
                You have not submitted a Pandit or Acharya verification application yet.
              </div>
              <Link
                href="/streamer/apply"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold rounded-full shadow-lg transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>Apply to Become a Verified Pandit</span>
              </Link>
            </div>
          ) : profile.kycStatus === 'APPROVED' ? (
            <div className="space-y-6 text-center">
              <div className="inline-flex p-3 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 mb-2">
                  <VerifiedPanditBadge size={14} /> VERIFIED ACHARYA ACTIVE
                </span>
                <h2 className="text-lg font-bold text-white">Your Credentials Are Fully Verified</h2>
                <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                  Congratulations! You have complete broadcast access to conduct public darshan, private consultations, and accept devotee dakshina.
                </p>
              </div>

              <div className="pt-4 border-t border-gold/15 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/studio/create"
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold rounded-full shadow-lg transition"
                >
                  <Video className="w-4 h-4" /> Go Live in Studio
                </Link>
                <Link
                  href="/streamer/earnings"
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-obsidian border border-gold/30 hover:bg-gold/10 text-gold-pale text-xs font-semibold rounded-full transition"
                >
                  <span>View Earnings</span>
                </Link>
              </div>
            </div>
          ) : profile.kycStatus === 'PENDING' ? (
            <div className="space-y-6 text-center">
              <div className="inline-flex p-3 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-400 animate-pulse">
                <Clock className="w-8 h-8" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-700/60 mb-2">
                  APPLICATION UNDER REVIEW
                </span>
                <h2 className="text-lg font-bold text-white">Vedic Credentials Inspection in Progress</h2>
                <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                  Our compliance desk is currently validating your Vedic lineage, temple affiliation, and submitted government identity documents under the DPDP Act 2023.
                </p>
                <p className="text-[11px] text-stone-500 mt-2">
                  Reviews typically conclude within 24 to 48 hours. You will receive an email upon decision.
                </p>
              </div>

              <div className="pt-4 border-t border-gold/15">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs text-gold hover:underline"
                >
                  <span>Return to Sacred Network Home</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : profile.kycStatus === 'MORE_INFO_NEEDED' ? (
            <div className="space-y-6 text-center">
              <div className="inline-flex p-3 rounded-full bg-orange-950/80 border border-orange-500/50 text-orange-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-950 text-orange-300 border border-orange-700/60 mb-2">
                  ADDITIONAL INFORMATION REQUIRED
                </span>
                <h2 className="text-lg font-bold text-white">Document Clarification Requested</h2>
                {profile.rejectionReason && (
                  <div className="mt-3 p-3.5 rounded-xl bg-orange-950/40 border border-orange-800/60 text-xs text-orange-200 text-left">
                    <span className="font-bold block text-orange-300 mb-1">Moderator Note:</span>
                    {profile.rejectionReason}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gold/15">
                <Link
                  href="/streamer/apply"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold rounded-full shadow-lg transition"
                >
                  <FileText className="w-4 h-4" /> Re-upload Credentials
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-center">
              <div className="inline-flex p-3 rounded-full bg-red-950/80 border border-red-500/50 text-red-400">
                <XCircle className="w-8 h-8" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-950 text-red-300 border border-red-700/60 mb-2">
                  APPLICATION NOT APPROVED
                </span>
                <h2 className="text-lg font-bold text-white">Verification Could Not Be Completed</h2>
                {profile.rejectionReason && (
                  <div className="mt-3 p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-200 text-left">
                    <span className="font-bold block text-red-300 mb-1">Reason:</span>
                    {profile.rejectionReason}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gold/15">
                <Link
                  href="/streamer/apply"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold rounded-full shadow-lg transition"
                >
                  <span>Submit New Application</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
