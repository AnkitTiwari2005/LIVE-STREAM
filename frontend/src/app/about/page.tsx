import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Sparkles,
  Globe,
  Shield,
  HeartHandshake,
  Zap,
  Users,
  Flame,
  CheckCircle2,
  MapPin,
  Award,
  Compass,
  Building2,
  BookOpen,
  ScrollText,
} from 'lucide-react';
import {
  OmIcon,
  DiyaIcon,
  LotusIcon,
  CoinIcon,
  VerifiedPanditBadge,
} from '@/components/icons/SpiritualIcons';

export const metadata: Metadata = {
  title: 'About Us - Founded by Pt. Rohit Tiwari & Pt. Santosh Kumar Shastri | Shubhdarshan',
  description:
    'Shubhdarshan is founded in Delhi by revered Vedic astrologers पंडित रोहित तिवारी (ज्योतिषाचार्य) and पंडित संतोष कुमार शास्त्री (ज्योतिष एवं वास्तु विशेषज्ञ) to connect devotees worldwide with authentic live darshan and shastric wisdom.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-obsidian text-foreground py-12 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-5 lg:px-8">
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

        {/* ======================================================== */}
        {/* FOUNDERS & VEDIC LEADERSHIP SECTION */}
        {/* ======================================================== */}
        <section className="mb-20 relative">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-gold-pale mb-3">
              <OmIcon size={14} className="text-gold" />
              संस्थापक एवं आध्यात्मिक नेतृत्व • Founders &amp; Leadership
            </div>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
              Guided by Vedic Wisdom,{' '}
              <span className="gold-text italic font-serif">Rooted in Delhi</span>
            </h2>
            <p className="font-serif text-base sm:text-lg text-gold-soft mt-2">
              पंडित रोहित तिवारी (ज्योतिषाचार्य) एवं पंडित संतोष कुमार शास्त्री (ज्योतिष एवं वास्तु विशेषज्ञ)
            </p>
            <p className="mt-4 text-stone-300 text-xs sm:text-sm max-w-3xl mx-auto leading-relaxed">
              Based in the historic spiritual capital of <strong className="text-white font-semibold">Delhi (NCR)</strong>, 
              Shubhdarshan was founded under the spiritual vision of two revered Vedic masters. Conceived as a sacred bridge between scriptural purity and 21st-century live streaming, our mission is to empower devotees globally with truthful astrological guidance, authentic live rituals, and direct sanctuary darshan.
            </p>
          </div>

          {/* Founders Showcase Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-8">
            {/* Left Column: Duo Hero Portrait Card */}
            <div className="lg:col-span-5 bg-gradient-to-b from-obsidian-soft via-obsidian-soft/90 to-obsidian border border-gold/30 rounded-3xl p-4 sm:p-5 shadow-2xl relative flex flex-col justify-between group overflow-hidden">
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

              {/* Photo Container */}
              <div className="relative rounded-2xl overflow-hidden border border-gold/25 shadow-xl bg-black/40">
                <img
                  src="/images/founders/founders-upper.webp"
                  alt="Founders of Shubhdarshan: Pandit Rohit Tiwari and Pandit Santosh Kumar Shastri"
                  className="w-full h-[380px] sm:h-[440px] lg:h-[420px] object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

                {/* Delhi Badge Overlay (Top Left) */}
                <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-gold/30 text-white text-[11px] font-bold shadow-lg">
                  <MapPin className="w-3.5 h-3.5 text-gold" />
                  <span>Delhi, Bharat</span>
                </div>

                {/* Spiritual Emblem (Top Right) */}
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gold/20 backdrop-blur-md border border-gold/40 flex items-center justify-center text-gold shadow-lg">
                  <OmIcon size={16} />
                </div>

                {/* Bottom Overlay Label */}
                <div className="absolute bottom-4 left-4 right-4">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-soft block mb-0.5">
                    संस्थापक द्वय • Co-Founders
                  </span>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-white leading-snug">
                    पंडित रोहित तिवारी &amp; पंडित संतोष कुमार शास्त्री
                  </h3>
                  <p className="text-[11px] text-stone-300 mt-1 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                    <span>Guardians of Vedic Astrology &amp; Vastu Vidya • New Delhi</span>
                  </p>
                </div>
              </div>

              {/* Quick Pillars under photo */}
              <div className="mt-4 pt-3 border-t border-gold/15 grid grid-cols-2 gap-3 text-center">
                <div className="bg-obsidian/60 rounded-xl p-2.5 border border-gold/10">
                  <span className="text-gold font-serif font-bold text-sm block">दिल्ली मुख्यालय</span>
                  <span className="text-[10px] text-stone-400">Delhi Operational Helm</span>
                </div>
                <div className="bg-obsidian/60 rounded-xl p-2.5 border border-gold/10">
                  <span className="text-gold font-serif font-bold text-sm block">वैदिक शुचिता</span>
                  <span className="text-[10px] text-stone-400">100% Shastric Integrity</span>
                </div>
              </div>
            </div>

            {/* Right Column: Individual Detailed Dossiers */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-6">
              {/* Founder 1: Pandit Rohit Tiwari */}
              <div className="bg-obsidian-soft border border-gold/25 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden transition-all hover:border-gold/45">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                  <div className="relative flex-shrink-0">
                    <img
                      src="/images/founders/pandit-rohit-tiwari.webp"
                      alt="पंडित रोहित तिवारी (ज्योतिषाचार्य)"
                      className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl object-cover object-top border-2 border-gold/60 shadow-lg ring-4 ring-gold/15"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-gold text-obsidian rounded-full p-1 shadow">
                      <VerifiedPanditBadge size={14} />
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-gold/15 text-gold-pale text-[10px] font-bold tracking-wider uppercase border border-gold/30">
                        सह-संस्थापक • Co-Founder
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-stone-400">
                        <MapPin className="w-3 h-3 text-gold" />
                        Delhi, India
                      </span>
                    </div>
                    <h3 className="font-serif text-2xl font-bold text-white tracking-wide">
                      पंडित रोहित तिवारी
                    </h3>
                    <p className="text-xs sm:text-sm font-medium text-gold-soft flex items-center gap-1.5 mt-0.5">
                      <span>ज्योतिषाचार्य (Jyotishacharya)</span>
                    </p>
                  </div>
                </div>

                <p className="text-stone-300 text-xs sm:text-sm leading-relaxed mb-4">
                  Distinguished scholar of classical Parashari and Vedic astrology based in Delhi. Pandit Rohit Tiwari champions an enlightened, fear-free astrological approach—empowering devotees with truthful planetary insights, auspicious muhurat selection, and spiritually uplifting remedies rooted in scriptural discipline.
                </p>

                {/* Specialties Tags */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg bg-obsidian border border-gold/15 text-[11px] text-stone-300 font-medium">
                    वैदिक ज्योतिष (Vedic Astrology)
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-obsidian border border-gold/15 text-[11px] text-stone-300 font-medium">
                    कुंडली विश्लेषण (Horoscope Analysis)
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-obsidian border border-gold/15 text-[11px] text-stone-300 font-medium">
                    शुभ मुहूर्त निर्णय (Auspicious Muhurat)
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-obsidian border border-gold/15 text-[11px] text-stone-300 font-medium">
                    ग्रह शांति एवं उपाय (Planetary Remedies)
                  </span>
                </div>
              </div>

              {/* Founder 2: Pandit Santosh Kumar Shastri */}
              <div className="bg-obsidian-soft border border-gold/25 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden transition-all hover:border-gold/45">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                  <div className="relative flex-shrink-0">
                    <img
                      src="/images/founders/pandit-santosh-shastri.webp"
                      alt="पंडित संतोष कुमार शास्त्री ( ज्योतिष एवं वास्तु विशेषज्ञ)"
                      className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl object-cover object-top border-2 border-gold/60 shadow-lg ring-4 ring-gold/15"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-gold text-obsidian rounded-full p-1 shadow">
                      <VerifiedPanditBadge size={14} />
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-gold/15 text-gold-pale text-[10px] font-bold tracking-wider uppercase border border-gold/30">
                        सह-संस्थापक • Co-Founder
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-stone-400">
                        <MapPin className="w-3 h-3 text-gold" />
                        Delhi, India
                      </span>
                    </div>
                    <h3 className="font-serif text-2xl font-bold text-white tracking-wide">
                      पंडित संतोष कुमार शास्त्री
                    </h3>
                    <p className="text-xs sm:text-sm font-medium text-gold-soft flex items-center gap-1.5 mt-0.5">
                      <span>ज्योतिष एवं वास्तु विशेषज्ञ (Jyotish &amp; Vastu Specialist)</span>
                    </p>
                  </div>
                </div>

                <p className="text-stone-300 text-xs sm:text-sm leading-relaxed mb-4">
                  Revered master of spatial cosmic alignment (Vastu Shastra) and classical Karmakand rituals in Delhi. Shastri ji specializes in balancing residential and commercial energy fields, presiding over sacred Maha Yagyas, and sanctifying pivotal life transitions through shastric puja vidhis.
                </p>

                {/* Specialties Tags */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg bg-obsidian border border-gold/15 text-[11px] text-stone-300 font-medium">
                    वास्तु शास्त्र (Vastu Shastra)
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-obsidian border border-gold/15 text-[11px] text-stone-300 font-medium">
                    फलित ज्योतिष (Predictive Astrology)
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-obsidian border border-gold/15 text-[11px] text-stone-300 font-medium">
                    गृह प्रवेश एवं वास्तु शुद्धि (Energy Cleansing)
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-obsidian border border-gold/15 text-[11px] text-stone-300 font-medium">
                    वैदिक कर्मकांड एवं महायज्ञ (Ritual Havans)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Delhi Operational Helm Strip */}
          <div className="rounded-2xl bg-gradient-to-r from-obsidian-soft via-obsidian to-obsidian-soft border border-gold/20 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold flex-shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-serif font-bold text-white text-sm block">
                  दिल्ली स्थित मुख्यालय • Headquartered in Delhi (NCR)
                </span>
                <span className="text-[11px] text-stone-400 block mt-0.5">
                  Coordinating authenticated live temple broadcasts, priest verifications, and astrological consultations across India.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-[11px] font-bold text-gold-pale flex items-center gap-1.5">
                <Compass className="w-3 h-3 text-gold" />
                Capital of Bharat • Delhi
              </span>
            </div>
          </div>
        </section>

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
            <span className="text-xs text-white bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/25">
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
              Every ritual, aarti, and sankalp is led by verified Acharyas and Purohits trained in authentic Sanskrit scriptures, maintaining scriptural fidelity under our founders’ guidance.
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
