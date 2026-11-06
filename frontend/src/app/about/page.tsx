import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, Globe, Shield, HeartHandshake, Zap, Users } from 'lucide-react';
import { OmIcon, DiyaIcon, LotusIcon } from '@/components/icons/SpiritualIcons';

export const metadata: Metadata = {
  title: 'About Us - Sacred Devotion Meets Modern Technology',
  description:
    'Discover the vision behind Shubhdarshan: connecting millions of devotees worldwide with authentic Vedic rituals, live temple aartis, and certified astrologers in real-time.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Header */}
      <div className="text-center mb-16 relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-600/20 text-orange-400 text-xs font-bold border border-orange-500/30 mb-4">
          <Sparkles className="w-3.5 h-3.5" /> Sanatana Dharma Worldwide
        </div>
        <div className="flex items-center justify-center gap-3 mb-4">
          <OmIcon size={44} />
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            About Shubhdarshan
          </h1>
        </div>
        <p className="text-stone-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Bridging timeless Vedic traditions with real-time WebRTC technology to bring the sacred energy of India&apos;s holiest temples directly into your home.
        </p>
      </div>

      {/* Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 mb-4">
            <DiyaIcon size={28} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Authentic Vedic Lineage</h3>
          <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
            Every ritual, aarti, and sankalp is led by verified Acharyas and Purohits trained in authentic Sanskrit scriptures, maintaining scriptural fidelity.
          </p>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
            <Zap className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Sub-Second LiveKit SFU</h3>
          <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
            Unlike delayed social media video feeds, our self-hosted WebRTC SFU delivers ultra-low latency chanting, allowing devotees to chant along in real time.
          </p>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">DPDP & RBI Compliance</h3>
          <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
            Engineered with strict adherence to the Digital Personal Data Protection Act 2023, closed-loop wallet security, and zero data leakage.
          </p>
        </div>
      </div>

      {/* Mission & Holy Temples */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-amber-950/40 border border-stone-800 rounded-3xl p-8 sm:p-12 mb-16 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <LotusIcon size={28} /> Connecting Sacred Teerth Kshtras
        </h2>
        <p className="text-stone-300 text-sm leading-relaxed mb-6">
          Whether you are in Mumbai, New Delhi, London, New York, or Singapore, Shubhdarshan enables you to take part in daily Mangala Aarti from Kashi Vishwanath, Bhasma Aarti from Ujjain, evening Sandhya Aarti on the banks of Maa Ganga in Haridwar, and divine Darshan from Ayodhya.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-stone-950/70 border border-stone-800/80 rounded-2xl">
            <span className="block text-2xl font-extrabold text-amber-400">100%</span>
            <span className="text-[11px] text-stone-400">Verified Pandits</span>
          </div>
          <div className="p-4 bg-stone-950/70 border border-stone-800/80 rounded-2xl">
            <span className="block text-2xl font-extrabold text-amber-400">&lt; 300ms</span>
            <span className="text-[11px] text-stone-400">Live Video Latency</span>
          </div>
          <div className="p-4 bg-stone-950/70 border border-stone-800/80 rounded-2xl">
            <span className="block text-2xl font-extrabold text-amber-400">100 Coins</span>
            <span className="text-[11px] text-stone-400">Free Devotee Bonus</span>
          </div>
          <div className="p-4 bg-stone-950/70 border border-stone-800/80 rounded-2xl">
            <span className="block text-2xl font-extrabold text-amber-400">DPDP 2023</span>
            <span className="text-[11px] text-stone-400">Protected Privacy</span>
          </div>
        </div>
      </div>

      {/* CTA Box */}
      <div className="text-center">
        <Link
          href="/register"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-2xl shadow-xl shadow-orange-950/50 text-sm transition-all"
        >
          <span>Join Free & Claim 100 Sacred Coins</span>
        </Link>
      </div>
    </div>
  );
}
