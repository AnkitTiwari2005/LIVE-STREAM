import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, Globe, Shield, HeartHandshake, Zap, Users, Flame, CheckCircle2 } from 'lucide-react';
import { OmIcon, DiyaIcon, LotusIcon, CoinIcon, VerifiedPanditBadge } from '@/components/icons/SpiritualIcons';

export const metadata: Metadata = {
  title: 'About Us - Sacred Devotion Meets Modern Technology',
  description:
    'Discover the vision behind Shubhdarshan: connecting devotees worldwide with authentic Vedic rituals, live temple aartis, and verified astrologers in real time.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-obsidian text-foreground py-12 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-5 lg:px-8">
        {/* Sacred Hero Header */}
        <div className="text-center mb-16 relative">
          <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-gold-pale mb-5">
            <Flame className="w-3.5 h-3.5 text-gold animate-flame" />
            Sanatana Dharma Worldwide
          </p>
          <h1 className="font-serif text-4xl sm:text-6xl font-bold text-white tracking-tight leading-tight">
            Ancient ritual, carried by{' '}
            <span className="gold-text italic font-serif">modern hands</span>
          </h1>
          <p className="mt-5 text-stone-300 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Bridging timeless Vedic traditions with real-time WebRTC technology to bring the sacred darshan of Bharat’s holy sanctums into devotees’ homes around the world.
          </p>
        </div>

        {/* Hero Temple Image Banner */}
        <div className="on-photo relative rounded-3xl overflow-hidden border border-gold/25 mb-16 shadow-2xl">
          <img
            src="/images/photo-1561361058-c24cecae35ca.webp"
            alt="Morning bathers at the sacred ghats of Varanasi"
            className="w-full h-72 sm:h-96 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-soft">
                Kashi Mokshadayini
              </span>
              <h3 className="font-serif text-2xl font-bold text-white">
                Varanasi Ghats &amp; Kashi Vishwanath
              </h3>
            </div>
            <span className="text-xs text-gold-pale bg-obsidian/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-gold/25">
              Live WebRTC broadcast point
            </span>
          </div>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-obsidian-soft border border-gold/15 rounded-3xl p-6 shadow-xl relative">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-4">
              <DiyaIcon size={28} />
            </div>
            <h3 className="font-serif text-xl font-bold text-white mb-2">Authentic Vedic Lineage</h3>
            <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
              Every ritual, aarti, and sankalp is led by verified Acharyas and Purohits trained in authentic Sanskrit scriptures, maintaining scriptural fidelity.
            </p>
          </div>

          <div className="bg-obsidian-soft border border-gold/15 rounded-3xl p-6 shadow-xl relative">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-4">
              <Zap className="w-6 h-6 text-gold" />
            </div>
            <h3 className="font-serif text-xl font-bold text-white mb-2">Real-Time LiveKit SFU</h3>
            <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
              Unlike buffered social media video feeds, our dedicated WebRTC SFU delivers real-time video and clear acoustic chanting so devotees can participate along with the ritual.
            </p>
          </div>

          <div className="bg-obsidian-soft border border-gold/15 rounded-3xl p-6 shadow-xl relative">
            <div className="w-12 h-12 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-4">
              <Shield className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            </div>
            <h3 className="font-serif text-xl font-bold text-white mb-2">DPDP Act 2023 Compliant</h3>
            <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
              Engineered with strict adherence to the Digital Personal Data Protection Act 2023, closed-loop wallet security, zero tracker leakage, and end-to-end respect for devotee privacy.
            </p>
          </div>
        </div>

        {/* KYC & Compliance Verification Section */}
        <div className="bg-obsidian-soft border border-gold/25 rounded-3xl p-8 sm:p-12 mb-16 shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-soft">
              Priesthood Integrity
            </p>
            <h2 className="mt-1 font-serif text-3xl font-bold text-white">
              KYC &amp; platform verification before going live
            </h2>
            <p className="mt-2 text-stone-300 text-xs sm:text-sm leading-relaxed">
              Every broadcaster passes administrator identity review before receiving streaming privileges on Shubhdarshan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-obsidian border border-gold/10">
              <CheckCircle2 className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white text-xs sm:text-sm block">1. Government Identity KYC</span>
                <span className="text-[11px] text-stone-400">Submitted government photo identification documents reviewed by administrators.</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-obsidian border border-gold/10">
              <CheckCircle2 className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white text-xs sm:text-sm block">2. Lineage &amp; Temple Background</span>
                <span className="text-[11px] text-stone-400">Applicants declare ritual specialties, years of experience, and temple affiliation.</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-obsidian border border-gold/10">
              <CheckCircle2 className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white text-xs sm:text-sm block">3. Anti-Superstition &amp; Ethics Pledge</span>
                <span className="text-[11px] text-stone-400">Strict adherence to our policy prohibiting fear-based coercions and false guarantees.</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-obsidian border border-gold/10">
              <CheckCircle2 className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white text-xs sm:text-sm block">4. Active Moderation &amp; Emergency Controls</span>
                <span className="text-[11px] text-stone-400">Ongoing safety reporting, chat word filters, and admin broadcast controls.</span>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Box */}
        <div className="rounded-3xl border border-gold/30 bg-obsidian-soft p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
          <h2 className="font-serif text-3xl font-bold text-white mb-3">
            Begin with 100 free coins and your first live Darshan
          </h2>
          <p className="text-stone-300 text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed">
            Create your account in under 30 seconds and receive divine blessings directly from Bharat’s holy sanctums.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="rounded-full bg-gold px-8 py-3.5 text-xs sm:text-sm font-bold text-obsidian shadow-xl hover:bg-gold-deep transition"
            >
              Join Free &amp; Claim 100 Coins
            </Link>
            <Link
              href="/"
              className="rounded-full border border-gold/40 bg-obsidian-soft px-6 py-3.5 text-xs sm:text-sm font-bold text-gold-pale hover:bg-gold/10 transition"
            >
              Watch Live Mandir Darshan
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
