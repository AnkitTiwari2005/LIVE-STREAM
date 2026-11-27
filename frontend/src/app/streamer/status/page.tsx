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
import { useLang } from '@/lib/i18n/context';

export default function StreamerStatusPage() {
  const router = useRouter();
  const { t: L } = useLang();
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
        setError(err.message || L('Unable to retrieve verification status', 'सत्यापन स्थिति प्राप्त नहीं हो सकी'));
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
        <span className="text-xs uppercase tracking-wider font-semibold">
          {L('Checking Verification Status...', 'सत्यापन स्थिति जाँची जा रही है...')}
        </span>
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
            {L('Pandit Verification Portal', 'पंडित सत्यापन पोर्टल')}
          </h1>
          <p className="text-xs text-center text-stone-400 mb-6">
            {L('Official Vedic Broadcaster Status & KYC Verification', 'आधिकारिक वैदिक प्रसारक स्थिति व KYC सत्यापन')}
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
                {L(
                  'You have not submitted a Pandit or Acharya verification application yet.',
                  'आपने अभी तक पंडित या आचार्य सत्यापन आवेदन जमा नहीं किया है।',
                )}
              </div>
              <Link
                href="/streamer/apply"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold rounded-full shadow-lg transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>{L('Apply to Become a Verified Pandit Ji', 'सत्यापित पंडित जी बनने हेतु आवेदन करें')}</span>
              </Link>
            </div>
          ) : profile.kycStatus === 'APPROVED' ? (
            <div className="space-y-6 text-center">
              <div className="inline-flex p-3 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 mb-2">
                  <VerifiedPanditBadge size={14} /> {L('VERIFIED ACHARYA ACTIVE', 'सत्यापित आचार्य सक्रिय')}
                </span>
                <h2 className="text-lg font-bold text-white">
                  {L('Your Credentials Are Fully Verified', 'आपके प्रमाणपत्र पूर्णतः सत्यापित हैं')}
                </h2>
                <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                  {L(
                    'Congratulations! You have complete broadcast access to conduct public darshan, private consultations, and accept devotee dakshina.',
                    'बधाई हो! अब आपको सार्वजनिक दर्शन, निजी परामर्श संचालित करने और भक्तों से दक्षिणा प्राप्त करने का पूर्ण प्रसारण अधिकार प्राप्त है।',
                  )}
                </p>
              </div>

              <div className="pt-4 border-t border-gold/15 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/studio/create"
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold rounded-full shadow-lg transition"
                >
                  <Video className="w-4 h-4" /> {L('Go Live in Studio', 'स्टूडियो में लाइव जाएँ')}
                </Link>
                <Link
                  href="/streamer/earnings"
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-obsidian border border-gold/30 hover:bg-gold/10 text-gold-pale text-xs font-semibold rounded-full transition"
                >
                  <span>{L('View Earnings', 'आय देखें')}</span>
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
                  {L('APPLICATION UNDER REVIEW', 'आवेदन समीक्षाधीन है')}
                </span>
                <h2 className="text-lg font-bold text-white">
                  {L('Vedic Credentials Inspection in Progress', 'वैदिक प्रमाणपत्रों की जाँच प्रगति पर है')}
                </h2>
                <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                  {L(
                    'Our compliance desk is currently validating your Vedic lineage, temple affiliation, and submitted government identity documents under the DPDP Act 2023.',
                    'हमारी अनुपालन टीम वर्तमान में DPDP अधिनियम 2023 के तहत आपकी वैदिक परंपरा, मंदिर संबद्धता और प्रस्तुत सरकारी पहचान दस्तावेजों का सत्यापन कर रही है।',
                  )}
                </p>
                <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-2">
                  {L(
                    'Reviews typically conclude within 24 to 48 hours. You will receive an email upon decision.',
                    'समीक्षा सामान्यतः 24 से 48 घंटों में पूरी होती है। निर्णय होने पर आपको ईमेल प्राप्त होगा।',
                  )}
                </p>
              </div>

              <div className="pt-4 border-t border-gold/15">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs text-gold hover:underline"
                >
                  <span>{L('Return to Sacred Network Home', 'मुख्य पृष्ठ पर लौटें')}</span>
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
                  {L('ADDITIONAL INFORMATION REQUIRED', 'अतिरिक्त जानकारी आवश्यक है')}
                </span>
                <h2 className="text-lg font-bold text-white">
                  {L('Document Clarification Requested', 'दस्तावेज़ स्पष्टीकरण अनुरोधित')}
                </h2>
                {profile.rejectionReason && (
                  <div className="mt-3 p-3.5 rounded-xl bg-orange-950/40 border border-orange-800/60 text-xs text-orange-200 text-left">
                    <span className="font-bold block text-orange-300 mb-1">
                      {L('Moderator Note:', 'मॉडरेटर टिप्पणी:')}
                    </span>
                    {profile.rejectionReason}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gold/15">
                <Link
                  href="/streamer/apply"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold rounded-full shadow-lg transition"
                >
                  <FileText className="w-4 h-4" /> {L('Re-upload Credentials', 'प्रमाणपत्र पुनः अपलोड करें')}
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
                  {L('APPLICATION NOT APPROVED', 'आवेदन स्वीकृत नहीं हुआ')}
                </span>
                <h2 className="text-lg font-bold text-white">
                  {L('Verification Could Not Be Completed', 'सत्यापन पूरा नहीं हो सका')}
                </h2>
                {profile.rejectionReason && (
                  <div className="mt-3 p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-200 text-left">
                    <span className="font-bold block text-red-300 mb-1">{L('Reason:', 'कारण:')}</span>
                    {profile.rejectionReason}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gold/15">
                <Link
                  href="/streamer/apply"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold rounded-full shadow-lg transition"
                >
                  <span>{L('Submit New Application', 'नया आवेदन जमा करें')}</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
