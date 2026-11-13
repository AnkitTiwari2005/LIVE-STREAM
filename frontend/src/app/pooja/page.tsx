'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Filter,
  CheckCircle2,
  Calendar,
  Flame,
  BookOpen,
  Compass,
  Heart,
  ArrowRight,
} from 'lucide-react';
import {
  OmIcon,
  DiyaIcon,
  CoinIcon,
  PranamIcon,
  VerifiedPanditBadge,
} from '@/components/icons/SpiritualIcons';
import {
  COMPREHENSIVE_POOJA_CATALOG,
  PoojaItem,
} from '@/data/poojaCatalog';
import { formatInrFromCoins } from '@/lib/economy';
import SevaBookingModal from '@/components/SevaBookingModal';

const CATEGORY_TABS = [
  'ALL',
  'Shiva & Rudra',
  'Astrology & Kundli',
  'Vedic Kathas',
  'Havans & Yagyas',
  'Samskaras & Family',
  'Dosha Remedies',
] as const;

export default function PoojaCatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPoojaId, setSelectedPoojaId] = useState<string | undefined>(undefined);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  const filteredPoojas = useMemo(() => {
    return COMPREHENSIVE_POOJA_CATALOG.filter((item) => {
      const matchesCat =
        selectedCategory === 'ALL' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.hindiName && item.hindiName.toLowerCase().includes(q)) ||
        item.description.toLowerCase().includes(q) ||
        item.significance.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleBookPooja = (poojaId: string) => {
    setSelectedPoojaId(poojaId);
    setBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-obsidian text-foreground py-10 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
        {/* Header Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-stone-400 mb-6">
          <Link href="/" className="hover:text-gold transition">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
          <span className="text-gold-soft font-semibold">Pooja Catalog &amp; Sevas</span>
        </div>

        {/* Hero Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-gold/15">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-gold-pale mb-3">
              <DiyaIcon size={14} /> Consecrated Vedic Rituals
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight">
              Book Personalized Vedic Poojas &amp; Kathas
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-stone-300 leading-relaxed">
              Explore 24+ sacred rituals, Vedic kathas, and astrological remedies conducted by KYC-verified Pandits. Select your preferred Acharya and review ritual traditions in real-time interactive HD.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gold-soft" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by pooja, dosha, katha..."
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-obsidian-soft border border-gold/25 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-gold transition shadow-inner"
            />
          </div>
        </div>

        {/* Filter Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto w-full max-w-full min-w-0 py-5 no-scrollbar border-b border-gold/10">
          {CATEGORY_TABS.map((tab) => {
            const count =
              tab === 'ALL'
                ? COMPREHENSIVE_POOJA_CATALOG.length
                : COMPREHENSIVE_POOJA_CATALOG.filter((p) => p.category === tab).length;
            const isSelected = selectedCategory === tab;

            return (
              <button
                key={tab}
                onClick={() => setSelectedCategory(tab)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-gold text-obsidian shadow-lg'
                    : 'bg-obsidian-soft border border-gold/15 text-stone-300 hover:text-white hover:border-gold/40'
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                    isSelected
                      ? 'bg-black/25 text-white dark:bg-stone-950/20 dark:text-stone-950'
                      : 'bg-gold/15 text-gold-pale border border-gold/25'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Catalog Results Grid */}
        <div className="my-8">
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs text-stone-400">
              Showing <strong className="text-white">{filteredPoojas.length}</strong> consecrated poojas &amp; consults
            </p>
            <span className="text-xs text-gold-soft flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              100% KYC-Verified Pandits
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPoojas.map((pooja) => {
              return (
                <div
                  key={pooja.id}
                  className="group rounded-3xl bg-obsidian-soft border border-gold/20 hover:border-gold/60 p-6 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(245,158,11,0.15)] flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    {/* Top Meta Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gold-pale bg-gold/10 px-2.5 py-1 rounded-full border border-gold/25">
                        {pooja.tag}
                      </span>
                      <span className="text-[11px] font-semibold text-stone-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gold-soft" />
                        {pooja.duration}
                      </span>
                    </div>

                    {/* Titles */}
                    <div>
                      <h3 className="font-serif text-lg sm:text-xl font-bold text-white group-hover:text-gold-pale transition-colors leading-snug">
                        {pooja.name}
                      </h3>
                      {pooja.hindiName && (
                        <p className="text-xs text-gold-soft font-medium mt-0.5">
                          {pooja.hindiName}
                        </p>
                      )}
                    </div>

                    {/* Description & Significance */}
                    <p className="text-xs text-stone-300 leading-relaxed">
                      {pooja.description}
                    </p>

                    <div className="p-3 rounded-2xl bg-obsidian border border-stone-800/80 text-[11px] text-stone-300 space-y-1">
                      <div className="flex items-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-gold shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-gold-soft">Significance: </strong>
                          {pooja.significance}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-400 pt-1 border-t border-stone-800">
                        Tradition: <span className="text-stone-300">{pooja.mantraTradition}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pricing & CTA Button */}
                  <div className="mt-6 pt-4 border-t border-stone-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-stone-400 block font-semibold">
                        Starting Dakshina
                      </span>
                      <div className="flex items-center gap-1.5 text-sm font-bold text-gold-pale">
                        <CoinIcon size={14} />
                        <span>{pooja.baseDakshina} Coins</span>
                        <span className="text-[10px] text-stone-400 font-normal">
                          (~₹{formatInrFromCoins(pooja.baseDakshina)})
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleBookPooja(pooja.id)}
                      className="px-5 py-2.5 rounded-full bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold transition flex items-center gap-1.5 shadow-md group-hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                    >
                      <DiyaIcon size={14} />
                      <span>Book Session</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Devotee Sangha Guarantee Section */}
        <div className="my-16 rounded-3xl border border-gold/30 bg-gradient-to-r from-obsidian via-obsidian-soft to-obsidian p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-gold-soft">
              <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" /> Sacred Devotional Guarantee
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
              Authentic Vedic Precision, Straight From Sacred Sanctums
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Every Acharya on Shubhdarshan undergoes government identity KYC review and profile verification before receiving broadcasting privileges.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-stone-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-gold" /> Real-Time LiveKit SFU HD
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-gold" /> Transparent Coin Dakshina
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-gold" /> KYC-Verified Broadcasters
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <SevaBookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        initialSevaId={selectedPoojaId}
      />
    </div>
  );
}
