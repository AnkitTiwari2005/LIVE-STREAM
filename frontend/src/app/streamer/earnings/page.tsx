'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Video,
  Users,
  RefreshCw,
  ShieldCheck,
  Coins,
  Radio,
} from 'lucide-react';
import {
  OmIcon,
  CoinIcon,
  DiyaIcon,
  PranamIcon,
  VerifiedPanditBadge,
} from '@/components/icons/SpiritualIcons';
import {
  COINS_PER_100_INR,
  COINS_PER_MINUTE,
  STREAMER_SHARE_PERCENT,
  formatInrAmount,
} from '@/lib/economy';
import { useLang } from '@/lib/i18n/context';
import { formatCoins, formatLocaleDateTime, formatMins, translateCategoryLabel } from '@/lib/i18n/format';

interface PerStreamEarningItem {
  streamId: string;
  title: string;
  visibility: string;
  status: string;
  startedAt: string | null;
  dakshinaCoins: number;
  watchTimeCoins: number;
  totalCoins: number;
  grossInr: number;
  netInr: number;
  platformFeeInr: number;
}

interface RecentDakshinaItem {
  id: string;
  coins: number;
  isLegacyInr: boolean;
  legacyAmountInr: number | null;
  grossInr: number;
  netInr: number;
  platformFeeInr: number;
  devoteeName: string;
  createdAt: string;
  streamId: string;
  streamTitle: string;
}

interface EarningsData {
  totalStreams: number;
  totalCoins: number;
  dakshinaCoins: number;
  watchTimeCoins: number;
  grossInr: number;
  netEarningsInr: number;
  platformFeeInr: number;
  panditSharePercentage: number;
  coinsPer100Inr: number;
  totalWatchMinutes: number;
  totalCoinsConsumed: number;
  perStreamEarnings: PerStreamEarningItem[];
  recentDakshina: RecentDakshinaItem[];
  legacyInr?: {
    totalDakshinaInr: number;
    netEarningsInr: number;
    platformFeeInr: number;
    count: number;
  };
}

export default function StreamerEarningsPage() {
  const router = useRouter();
  const { lang, t: L } = useLang();
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [pastStreams, setPastStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'perStream' | 'dakshina' | 'pastStreams'>('perStream');

  const loadData = async () => {
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('pooja_token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('pooja_user') : null;

    if (!token || !storedUser) {
      router.push('/login?redirect=/streamer/earnings');
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role !== 'STREAMER' && parsedUser.role !== 'ADMIN') {
        router.push('/');
        return;
      }
    } catch {
      router.push('/login');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [earningsRes, pastRes] = await Promise.all([
        fetch(`${apiUrl}/streamers/earnings`, { headers, cache: 'no-store' }),
        fetch(`${apiUrl}/streams/streamer/past`, { headers, cache: 'no-store' }),
      ]);

      if (earningsRes.ok) {
        setEarnings(await earningsRes.json());
      }
      if (pastRes.ok) {
        setPastStreams(await pastRes.json());
      }
    } catch (err) {
      console.error('Failed to load streamer earnings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sharePercent = earnings?.panditSharePercentage ?? STREAMER_SHARE_PERCENT;
  const coinsPer100 = earnings?.coinsPer100Inr ?? COINS_PER_100_INR;

  return (
    <div className="min-h-screen bg-obsidian text-foreground py-10 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-5 lg:px-8 w-full">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-gold/15">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 text-gold-pale text-xs font-bold border border-gold/30 mb-2">
              <VerifiedPanditBadge size={14} /> {L('Acharya Coin Revenue & Dakshina Portal', 'आचार्य कॉइन आय व दक्षिणा पोर्टल')}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white flex items-center gap-2.5">
              <OmIcon size={28} /> {L('Pandit Ji Earnings Dashboard', 'पंडित जी आय डैशबोर्ड')}
            </h1>
            <p className="text-stone-400 text-xs sm:text-sm mt-1">
              {lang === 'hi'
                ? `कॉइन-आधारित दक्षिणा व लाइव मंत्रोच्चार समय बही (${coinsPer100} कॉइन = ₹100 • ${sharePercent}% आचार्य हिस्सा)।`
                : `Coin-based Dakshina & live chanting watch-time ledger (${coinsPer100} coins = ₹100 • ${sharePercent}% Acharya share).`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="p-2.5 bg-obsidian-soft hover:bg-stone-800 border border-gold/20 rounded-full text-stone-300 transition"
              title={L('Refresh Data', 'डेटा ताज़ा करें')}
            >
              <RefreshCw className={`w-4 h-4 text-gold ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/studio/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs shadow-lg shadow-gold/20 transition"
            >
              <Video className="w-4 h-4" /> {L('Go Live Now', 'अभी लाइव जाएँ')}
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-stone-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-orange-500" />
            <p className="text-sm">{L('Calculating sacred coin earnings and dakshina records...', 'पावन कॉइन आय व दक्षिणा रिकॉर्ड की गणना हो रही है...')}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Primary Coin-First KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Coins Earned */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm dark:shadow-lg">
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                  {L('Total Coins Earned', 'कुल अर्जित कॉइन')}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <CoinIcon size={24} />
                  <span className="text-2xl font-black text-amber-700 dark:text-gold">
                    {formatCoins(earnings?.totalCoins ?? 0, lang)}
                  </span>
                </div>
                <span className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 block">
                  {L('Gross Value:', 'सकल मूल्य:')} ₹{formatInrAmount(earnings?.grossInr ?? 0)}
                </span>
              </div>

              {/* Net INR Payout */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm dark:shadow-lg">
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                  {L(`Net INR Equivalent (${sharePercent}% Share)`, `शुद्ध ₹ समतुल्य (${sharePercent}% हिस्सा)`)}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                    ₹{formatInrAmount(earnings?.netEarningsInr ?? 0)}
                  </span>
                </div>
                <span className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                  <span>
                    {L(`Fee (${100 - sharePercent}%):`, `शुल्क (${100 - sharePercent}%):`)} ₹{formatInrAmount(earnings?.platformFeeInr ?? 0)}
                  </span>
                </span>
              </div>

              {/* Dakshina vs Watch-Time Split */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm dark:shadow-lg">
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                  {L('Dakshina vs Watch-Time Split', 'दक्षिणा बनाम दर्शन-समय विभाजन')}
                </span>
                <div className="mt-1 space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-900 dark:text-white">
                    <span className="inline-flex items-center gap-1.5">
                      <DiyaIcon size={15} className="text-amber-700 dark:text-amber-400" />
                      {L('Dakshina', 'दक्षिणा')}
                    </span>
                    <span className="text-amber-700 dark:text-amber-400">
                      {formatCoins(earnings?.dakshinaCoins ?? 0, lang)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-stone-900 dark:text-white">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-orange-700 dark:text-orange-400" />
                      {L('Watch-Time', 'दर्शन-समय')}
                    </span>
                    <span className="text-orange-700 dark:text-orange-400">
                      {formatCoins(earnings?.watchTimeCoins ?? 0, lang)}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-stone-600 dark:text-stone-400 mt-1.5 block">
                  {lang === 'hi'
                    ? `${COINS_PER_MINUTE} कॉइन / देखा गया मिनट`
                    : `${COINS_PER_MINUTE} coins / watched minute`}
                </span>
              </div>

              {/* Watch Minutes & Streams */}
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm dark:shadow-lg">
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 block mb-1">
                  {L('Devotee Chanting Minutes', 'भक्त मंत्रोच्चार मिनट')}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-5 h-5 text-orange-700 dark:text-orange-400" />
                  <span className="text-2xl font-black text-orange-700 dark:text-orange-400">
                    {formatMins(earnings?.totalWatchMinutes ?? 0, lang)}
                  </span>
                </div>
                <span className="text-[11px] text-stone-600 dark:text-stone-400 mt-1 block">
                  {lang === 'hi'
                    ? `कुल ${earnings?.totalStreams ?? 0} पावन प्रसारणों में`
                    : `Across ${earnings?.totalStreams ?? 0} sacred broadcasts`}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-gold/20 bg-stone-900/70 p-4 text-xs text-stone-300 leading-relaxed">
              <strong className="text-gold-pale">{L('Payout Eligibility Notice:', 'भुगतान पात्रता सूचना:')}</strong>{' '}
              {L(
                'Only coins earned here through live broadcasts and Devotee Dakshina are eligible for cash payout settlement. Initial welcome/free or bonus coins in your personal wallet cannot be redeemed for payouts. If you request account deletion, pending payout dues are settled before an administrator finalizes erasure.',
                'केवल लाइव प्रसारण और भक्त दक्षिणा के माध्यम से अर्जित कॉइन ही नकद भुगतान निपटान के लिए पात्र हैं। आपके व्यक्तिगत वॉलेट में मिले शुरुआती स्वागत/निःशुल्क या बोनस कॉइन को नकद भुगतान के लिए भुनाया नहीं जा सकता। यदि आप खाता विलोपन का अनुरोध करते हैं, तो व्यवस्थापक द्वारा विलोपन पूर्ण करने से पहले लंबित भुगतान निपटाए जाते हैं।',
              )}
            </div>

            {/* Conditional Legacy INR History Notice (pre-cutover direct Razorpay rows) */}
            {earnings?.legacyInr && earnings.legacyInr.count > 0 && (
              <div className="rounded-2xl border border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-950/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-950 dark:text-amber-200">
                <div>
                  <span className="font-bold">
                    {lang === 'hi'
                      ? `पूर्व प्रत्यक्ष-INR दक्षिणा इतिहास (${earnings.legacyInr.count} अर्पण): `
                      : `Legacy Direct-INR Dakshina History (${earnings.legacyInr.count} offerings): `}
                  </span>
                  <span>
                    {L('Gross', 'सकल')} ₹{formatInrAmount(earnings.legacyInr.totalDakshinaInr)} • {L('Net', 'शुद्ध')} ({sharePercent}%) ₹
                    {formatInrAmount(earnings.legacyInr.netEarningsInr)}
                  </span>
                </div>
                <span className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
                  {L('Preserved separately from Coin Ledger', 'कॉइन बही से अलग सुरक्षित रखा गया')}
                </span>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-3">
              <button
                onClick={() => setActiveTab('perStream')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'perStream'
                    ? 'bg-orange-700 text-white shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-900'
                }`}
              >
                {L('Per-Stream Breakdown', 'प्रति-प्रसारण विवरण')} ({earnings?.perStreamEarnings?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('dakshina')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'dakshina'
                    ? 'bg-orange-700 text-white shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-900'
                }`}
              >
                {L('Recent Dakshina', 'हालिया दक्षिणा')} ({earnings?.recentDakshina?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('pastStreams')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'pastStreams'
                    ? 'bg-orange-700 text-white shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-900'
                }`}
              >
                {L('Past Broadcasts', 'पिछले प्रसारण')} ({pastStreams.length})
              </button>
            </div>

            {/* Tab 1: Per-Stream Coin & INR Earnings Breakdown */}
            {activeTab === 'perStream' && (
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
                <div className="p-4 bg-stone-50 dark:bg-stone-950/60 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                    <Coins className="w-4 h-4 text-amber-700 dark:text-amber-400" /> {L('Earnings by Broadcast', 'प्रसारण-अनुसार आय')}
                  </h3>
                  <span className="text-xs text-stone-600 dark:text-stone-400 font-medium">
                    {lang === 'hi'
                      ? `${coinsPer100} कॉइन = ₹100 (${sharePercent}% शुद्ध)`
                      : `${coinsPer100} Coins = ₹100 (${sharePercent}% Net)`}
                  </span>
                </div>

                {!earnings?.perStreamEarnings || earnings.perStreamEarnings.length === 0 ? (
                  <div className="p-12 text-center text-stone-600 dark:text-stone-400 text-sm space-y-2">
                    <PranamIcon size={36} className="mx-auto" />
                    <p>{L('No broadcast earnings recorded yet.', 'अभी तक कोई प्रसारण आय दर्ज नहीं हुई है।')}</p>
                    <p className="text-xs">
                      {L(
                        'Go live to start earning Watch-Time coins and Sacred Dakshina from devotees.',
                        'दर्शन-समय कॉइन और भक्तों से पावन दक्षिणा अर्जित करने के लिए लाइव जाएँ।',
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-100 dark:bg-stone-950/80 border-b border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-3 px-4">{L('Broadcast', 'प्रसारण')}</th>
                          <th className="py-3 px-4 text-right">{L('Dakshina', 'दक्षिणा')}</th>
                          <th className="py-3 px-4 text-right">{L('Watch-Time', 'दर्शन-समय')}</th>
                          <th className="py-3 px-4 text-right">{L('Total Coins', 'कुल कॉइन')}</th>
                          <th className="py-3 px-4 text-right">{L(`Net INR (${sharePercent}%)`, `शुद्ध ₹ (${sharePercent}%)`)}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                        {earnings.perStreamEarnings.map((item) => (
                          <tr
                            key={item.streamId}
                            className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2 mb-0.5">
                                {item.status === 'LIVE' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600 text-white text-[9px] font-bold">
                                    <Radio className="w-2.5 h-2.5" /> {L('LIVE', 'लाइव')}
                                  </span>
                                )}
                                <span className="text-[10px] font-semibold text-stone-600 dark:text-stone-400 uppercase">
                                  {item.visibility === 'PRIVATE' ? L('PRIVATE', 'निजी') : L('PUBLIC', 'सार्वजनिक')}
                                </span>
                              </div>
                              <div className="font-bold text-stone-900 dark:text-white">{item.title}</div>
                              <div className="text-[11px] text-stone-500 dark:text-stone-400">
                                {formatLocaleDateTime(item.startedAt, lang, 'Not yet started', 'अभी शुरू नहीं हुआ')}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right font-semibold text-stone-800 dark:text-stone-200 whitespace-nowrap">
                              {formatCoins(item.dakshinaCoins, lang)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-semibold text-stone-800 dark:text-stone-200 whitespace-nowrap">
                              {formatCoins(item.watchTimeCoins, lang)}
                            </td>
                            <td className="py-3.5 px-4 text-right font-extrabold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                              {formatCoins(item.totalCoins, lang)}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                                ₹{formatInrAmount(item.netInr)}
                              </span>
                              <span className="block text-[10px] text-stone-500 dark:text-stone-400">
                                {L('Gross', 'सकल')} ₹{formatInrAmount(item.grossInr)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Devotee Dakshina */}
            {activeTab === 'dakshina' && (
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
                <div className="p-4 bg-stone-50 dark:bg-stone-950/60 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                    <DiyaIcon size={18} className="text-amber-700 dark:text-amber-400" /> {L('Recent Sacred Dakshina Offerings', 'हालिया पावन दक्षिणा अर्पण')}
                  </h3>
                  <span className="text-xs text-stone-600 dark:text-stone-400 font-medium">
                    {L(`${sharePercent}% Net Disbursal`, `${sharePercent}% शुद्ध वितरण`)}
                  </span>
                </div>

                {!earnings?.recentDakshina || earnings.recentDakshina.length === 0 ? (
                  <div className="p-12 text-center text-stone-600 dark:text-stone-400 text-sm space-y-2">
                    <PranamIcon size={36} className="mx-auto" />
                    <p>{L('No dakshina offerings recorded yet.', 'अभी तक कोई दक्षिणा अर्पण दर्ज नहीं हुआ है।')}</p>
                    <p className="text-xs text-stone-600 dark:text-stone-400">
                      {L(
                        'When devotees offer Coin Dakshina during your live poojas, they appear here instantly.',
                        'जब भक्त आपकी लाइव पूजा के दौरान कॉइन दक्षिणा अर्पित करेंगे, तो वे तुरंत यहाँ दिखेंगी।',
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-200 dark:divide-stone-800">
                    {earnings.recentDakshina.map((d) => (
                      <div
                        key={d.id}
                        className="p-4 flex items-center justify-between gap-4 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-600/30 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
                            <CoinIcon size={20} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-stone-900 dark:text-white">{d.devoteeName}</h4>
                              {d.isLegacyInr && (
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                                  {L('Legacy INR', 'पूर्व INR')}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-stone-600 dark:text-stone-400 block">{d.streamTitle}</span>
                            <span className="text-[11px] text-stone-600 dark:text-stone-400">
                              {formatLocaleDateTime(d.createdAt, lang)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          {d.isLegacyInr ? (
                            <span className="text-base font-extrabold text-amber-700 dark:text-amber-400">
                              ₹{formatInrAmount(d.legacyAmountInr ?? d.grossInr)}
                            </span>
                          ) : (
                            <span className="text-base font-extrabold text-amber-700 dark:text-amber-400 inline-flex items-center gap-1 justify-end">
                              <CoinIcon size={15} />
                              <span>{formatCoins(d.coins, lang)}</span>
                            </span>
                          )}
                          <span className="text-[10px] text-stone-600 dark:text-stone-400 block">
                            {L('Gross', 'सकल')} ₹{formatInrAmount(d.grossInr)} • {L('Net', 'शुद्ध')} ₹{formatInrAmount(d.netInr)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Past Broadcasts */}
            {activeTab === 'pastStreams' && (
              <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl">
                <div className="p-4 bg-stone-50 dark:bg-stone-950/60 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                    <Video className="w-4 h-4 text-orange-700 dark:text-orange-400" /> {L('Completed Ritual Broadcasts', 'पूर्ण हुए अनुष्ठान प्रसारण')}
                  </h3>
                  <span className="text-xs text-stone-600 dark:text-stone-400 font-medium">
                    {L('Recorded Session Ledger', 'सत्र रिकॉर्ड बही')}
                  </span>
                </div>

                {pastStreams.length === 0 ? (
                  <div className="p-12 text-center text-stone-600 dark:text-stone-400 text-sm space-y-2">
                    <Video className="w-8 h-8 mx-auto text-stone-500 dark:text-stone-600" />
                    <p>{L('No past broadcasts found.', 'कोई पिछला प्रसारण नहीं मिला।')}</p>
                    <Link
                      href="/studio/create"
                      className="inline-block mt-2 px-4 py-2 bg-orange-700 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition"
                    >
                      {L('Setup First Broadcast', 'पहला प्रसारण सेटअप करें')}
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-200 dark:divide-stone-800">
                    {pastStreams.map((s) => (
                      <div
                        key={s.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded">
                              {translateCategoryLabel(s.category?.name || 'Vedic Ritual', lang)}
                            </span>
                            <span className="text-[10px] font-semibold text-stone-600 dark:text-stone-400">
                              {s.visibility === 'PRIVATE'
                                ? L('Private Consultation', 'निजी परामर्श')
                                : L('Public Darshan', 'सार्वजनिक दर्शन')}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-stone-900 dark:text-white">{s.title}</h4>
                          <span className="text-xs text-stone-600 dark:text-stone-400">
                            {formatLocaleDateTime(s.startedAt, lang, 'Date not recorded', 'तिथि दर्ज नहीं')}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-stone-600 dark:text-stone-300">
                          {s.durationSeconds && (
                            <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400">
                              <Clock className="w-3.5 h-3.5" />
                              {formatMins(Math.floor(s.durationSeconds / 60), lang)}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-stone-500 dark:text-stone-400">
                            <Users className="w-3.5 h-3.5" />
                            {lang === 'hi'
                              ? `${s.peakViewers || 0} अधिकतम दर्शक`
                              : `${s.peakViewers || 0} peak viewers`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
