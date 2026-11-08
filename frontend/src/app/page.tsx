'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Flame,
  Calendar,
  Users,
  Bell,
  Play,
  Sparkles,
  Zap,
  ShieldCheck,
  Star,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  HelpCircle,
  Music,
  Compass,
  BookOpen,
  HeartHandshake,
  Radio,
  ChevronRight,
  Eye,
  Signal,
  HandCoins,
} from 'lucide-react';
import {
  OmIcon,
  DiyaIcon,
  CoinIcon,
  PranamIcon,
  BellIcon,
  VerifiedPanditBadge,
} from '@/components/icons/SpiritualIcons';
import { CoinTopupModal } from '@/components/CoinTopupModal';
import SevaBookingModal from '@/components/SevaBookingModal';
import { useToast } from '@/components/Toast';

interface Stream {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  status: 'LIVE' | 'SCHEDULED' | 'ENDED';
  videoQuality: string;
  scheduledAt?: string;
  peakViewers: number;
  category: { id: string; name: string; slug: string };
  streamer: {
    id: string;
    name: string;
    avatarUrl?: string;
    streamerProfile?: { isVerifiedBadge: boolean; specialties: string[] };
  };
}

const LIVE_SEVA_ACTIVITIES = [
  { initials: 'MI', name: 'Meera Iyer', action: 'booked Maha Rudrabhishek with Pandit Aarav', time: '2m ago' },
  { initials: 'PD', name: 'Priya Dave', action: 'consecrated Gotra Sankalp with Acharya Devrat', time: '5m ago' },
  { initials: 'VJ', name: 'Vikram Joshi', action: 'booked 1-on-1 Kundli Milan with Pandit Vishwanath', time: '8m ago' },
  { initials: 'LV', name: 'Lakshmi V.', action: 'joined live Satyanarayan Katha with Pandit Hariram', time: '11m ago' },
];

const CATEGORY_TILES = [
  {
    id: 'rudrabhishek',
    name: 'Maha Rudrabhishek',
    desc: 'Panchamrit abhishekam & Rudra Suktam',
    icon: DiyaIcon,
    tag: 'Shiva Pooja',
    filterKey: 'rudrabhishek',
    priceText: 'From 150 Coins',
  },
  {
    id: 'kundli_matching',
    name: 'Vedic Kundli Matching',
    desc: '1-on-1 horoscope compatibility',
    icon: Compass,
    tag: 'Vedic Jyotish',
    filterKey: 'kundli_matching',
    priceText: 'From 100 Coins',
  },
  {
    id: 'satyanarayan_katha',
    name: 'Satyanarayan Maha Katha',
    desc: 'Auspicious katha recital & hawan',
    icon: BookOpen,
    tag: 'Family Blessing',
    filterKey: 'satyanarayan_katha',
    priceText: 'From 125 Coins',
  },
  {
    id: 'navgrah',
    name: 'Navgrah Dosh Nivaran',
    desc: '9-planetary oblations & peace',
    icon: Flame,
    tag: 'Planetary Shanti',
    filterKey: 'navgrah',
    priceText: 'From 125 Coins',
  },
  {
    id: 'family_sankalp',
    name: 'Family Gotra Sankalp',
    desc: 'Gotra-Naam invocation during aarti',
    icon: HeartHandshake,
    tag: 'Gotra Chanting',
    filterKey: 'family_sankalp',
    priceText: 'From 75 Coins',
  },
  {
    id: 'griha_pravesh_vastu',
    name: 'Griha Pravesh & Vastu',
    desc: 'Purify home energies with Vedic hawan',
    icon: Shield,
    tag: 'Vastu Consecration',
    filterKey: 'griha_pravesh_vastu',
    priceText: 'From 200 Coins',
  },
  {
    id: 'mahamrityunjaya',
    name: 'Mahamrityunjaya Jaap',
    desc: 'Chanting for longevity & health',
    icon: Sparkles,
    tag: 'Healing Seva',
    filterKey: 'mahamrityunjaya',
    priceText: 'From 150 Coins',
  },
  {
    id: 'more',
    name: 'Explore All 24+ Poojas',
    desc: 'Kaal Sarp, Yagyas, Vivah & more',
    icon: ArrowRight,
    tag: 'Full Catalog',
    isMore: true,
    link: '/pooja',
    priceText: 'View All 24+ &rarr;',
  },
];

const FALLBACK_SCHEDULED_BROADCASTS = [
  {
    id: 'rudrabhishek-live',
    title: 'Maha Rudrabhishek & Swasti Vachan',
    description: 'Vedic Panchamrit Abhishek with resonant Rudra Sukta recitation for peace, health, and family prosperity.',
    category: 'Rudrabhishek',
    streamer: 'Pandit Aarav Sharma',
    isVerified: true,
    scheduledText: 'Today, 06:00 PM IST',
    quality: '1080p',
    thumbnail: '/images/photo-1681797849099-0053b1567d95.webp',
  },
  {
    id: 'navgrah-shanti',
    title: 'Navgrah Shanti & Vedic Kundli Remedial Pooja',
    description: 'Auspicious 9-graha oblations and personalized horoscope dosha nivaran chanting by Gurukul scholar.',
    category: 'Astrology & Kundli',
    streamer: 'Acharya Devrat Sharma',
    isVerified: true,
    scheduledText: 'Tomorrow, 07:30 AM IST',
    quality: '1080p HD',
    thumbnail: '/images/photo-1577083753695-e010191bacb5.webp',
  },
  {
    id: 'sandhya-aarti',
    title: 'Sandhya Deepotsav & Divine Aarti',
    description: 'Devotional evening lamp invocation with conch shell reverberations and sacred mantra pushpam.',
    category: 'Aarti & Darshan',
    streamer: 'Pandit Hariram Vyas',
    isVerified: true,
    scheduledText: 'Tomorrow, 06:30 PM IST',
    quality: '1080p',
    thumbnail: '/images/photo-1678593628844-6ea49dee8ce3.webp',
  },
];

const FALLBACK_THUMBNAILS = [
  '/images/photo-1681797849099-0053b1567d95.webp', // Ganga Sandhya Aarti
  '/images/photo-1678593628844-6ea49dee8ce3.webp', // Kashi Mangala Aarti
  '/images/photo-1763479939733-eea29c578c17.webp', // Rudrabhishek Abhishekam
  '/images/photo-1763479168649-8ffb3bbb9103.webp', // Sandhya Deep Aarti
  '/images/photo-1741358706805-a5935a200a5c.webp', // Bhasma Aarti Mahakal
  '/images/photo-1577083753695-e010191bacb5.webp', // Grand Deepotsav
];

const CURATED_PANDITS = [
  {
    slug: 'aarav-sharma',
    name: 'Pandit Aarav Sharma',
    title: 'Head Archak, Kashi Vishwanath Parampara',
    experience: '22 Years Seva',
    rating: '4.98',
    reviews: '1,420',
    specialties: ['Rudrabhishek', 'Mahamrityunjaya Jaap', 'Ganga Aarti'],
    image: '/images/photo-1543934776-32d1cc654abb.webp',
  },
  {
    slug: 'hariram-vyas',
    name: 'Pandit Hariram Vyas',
    title: 'Senior Purohit, Haridwar Ganga Sabha',
    experience: '18 Years Seva',
    rating: '4.95',
    reviews: '980',
    specialties: ['Sandhya Aarti', 'Navgrah Shanti', 'Kavach Path'],
    image: '/images/photo-1544186196-6908a9d76ab3.webp',
  },
  {
    slug: 'vishwanath-bhatt',
    name: 'Pandit Vishwanath Bhatt',
    title: 'Vedic Scholar, Tirupati Devasthanam Tradition',
    experience: '26 Years Seva',
    rating: '5.0',
    reviews: '2,140',
    specialties: ['Vishnu Sahasranama', 'Satyanarayan Katha', 'Vedic Chanting'],
    image: '/images/photo-1596604820148-da737958af16.webp',
  },
  {
    slug: 'devrishi',
    name: 'Acharya Devrishi',
    title: 'Sanskrit Acharya, Rishikesh Gurukul',
    experience: '15 Years Seva',
    rating: '4.92',
    reviews: '810',
    specialties: ['Vedic Astrology', 'Kundli Milan', 'Vastu Shanti'],
    image: '/images/photo-1762838105804-c3264c29a390.webp',
  },
];

const DEVOTEE_TESTIMONIALS = [
  {
    name: 'Dr. Ramesh Sundaram',
    location: 'London, United Kingdom',
    quote:
      'Living in London, participating in Kashi Vishwanath Mangala Aarti live at 4 AM IST with sub-second audio clarity felt like sitting right inside the temple sanctum. Shubhdarshan is a divine blessing.',
    ritual: 'Kashi Mangala Aarti',
  },
  {
    name: 'Meera & Rajesh Patel',
    location: 'Fremont, California',
    quote:
      'We booked a personalized family Sankalp for our mother’s 70th birthday. The pandit ji chanted our gotra and names with pure Vedic precision. The video quality was crystal clear.',
    ritual: 'Rudrabhishek Sankalp',
  },
  {
    name: 'Ananya Deshmukh',
    location: 'Singapore',
    quote:
      'The transparent 5 coins/min rate and instant Razorpay recharge make it so effortless. No complicated subscriptions, just pure devotion whenever I seek peace after work.',
    ritual: 'Sandhya Deep Aarti',
  },
];

export default function HomePage() {
  const toast = useToast();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedSevaId, setSelectedSevaId] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('pooja_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'booking') {
        const pending = sessionStorage.getItem('pending_seva_booking');
        if (pending) {
          try {
            const parsed = JSON.parse(pending);
            if (parsed.sevaId) {
              setSelectedSevaId(parsed.sevaId);
            }
          } catch {}
        }
        setBookingModalOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    async function loadData() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

        // Load Categories
        const catRes = await fetch(`${apiUrl}/admin/categories`);
        if (catRes.ok) {
          const cats = await catRes.json();
          setCategories(cats);
        }

        // Load Streams
        let streamUrl = `${apiUrl}/streams/public`;
        const params = new URLSearchParams();
        if (selectedCategory) params.append('categoryId', selectedCategory);
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (params.toString()) streamUrl += `?${params.toString()}`;

        const streamRes = await fetch(streamUrl);
        if (streamRes.ok) {
          const data = await streamRes.json();
          setStreams(data);
        }
      } catch (err) {
        console.error('Failed to fetch public stream data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedCategory, debouncedSearch]);

  const liveStreams = streams.filter((s) => s.status === 'LIVE');
  const upcomingStreams = streams.filter((s) => s.status === 'SCHEDULED');

  const handleRemindMe = async (streamId: string) => {
    const token = localStorage.getItem('pooja_token');
    if (!token) {
      toast.info('Please sign in to set email reminders.');
      window.location.href = '/login';
      return;
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    try {
      const res = await fetch(`${apiUrl}/notifications/remind/${streamId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      toast.success(data.message || 'Email reminder scheduled successfully!');
    } catch {
      toast.error('Failed to set reminder.');
    }
  };

  const featuredStream = liveStreams[0] || null;
  const nextUpcomingStream = upcomingStreams[0] || null;

  return (
    <div className="min-h-screen bg-obsidian text-foreground">
      {/* 1. Sacred Hero Section */}
      <section className="relative overflow-hidden pt-3.5 pb-16 lg:pt-5 lg:pb-24 border-b border-gold/15">
        {/* Background Image with Ambient Saffron Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Ambient Warm Golden Saffron Radial Glow */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.22),rgba(234,88,12,0.08)_50%,transparent_75%)] blur-2xl dark:opacity-100 opacity-20" />

          {/* Sacred Temple Photography Backdrop */}
          <img
            src="/images/photo-1681797849099-0053b1567d95.webp"
            alt="Sandhya Ganga Aarti Haridwar Sanctum"
            className="backdrop-photo h-full w-full object-cover opacity-35 scale-105"
          />

          {/* Smooth Gradient Vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-obsidian/70 via-obsidian/85 to-obsidian" />

          {/* Mandala Background Pattern */}
          <div className="mandala-bg absolute inset-0 opacity-40 [mask-image:radial-gradient(800px_500px_at_50%_30%,black,transparent)]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-12 lg:gap-8 lg:px-8 items-center">
          {/* Left Column: Sacred Copy & Value Props */}
          <div className="flex flex-col justify-center lg:col-span-7">
            <div>
              {liveStreams.length > 0 ? (
                <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 sm:px-4 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider sm:tracking-[0.24em] text-gold-pale shadow-[0_0_20px_rgba(245,158,11,0.15)] max-w-full truncate">
                  <span className="live-dot shrink-0" />
                  <span className="truncate">Live Vedic Broadcasts • Gurukul Verified</span>
                </p>
              ) : (
                <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 sm:px-4 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider sm:tracking-[0.24em] text-gold-pale shadow-[0_0_20px_rgba(245,158,11,0.15)] max-w-full truncate">
                  <DiyaIcon size={14} className="shrink-0" />
                  <span className="truncate">Live Vedic Broadcasts &bull; Gurukul Verified</span>
                </p>
              )}
            </div>

            <h1 className="mt-5 sm:mt-6 max-w-2xl font-serif text-3xl sm:text-5xl lg:text-7xl font-bold leading-[1.12] sm:leading-[1.08] tracking-tight break-words">
              Sacred Vedic rituals, <br className="hidden sm:inline" />
              <span className="gold-text italic font-serif">one tap away</span>
            </h1>

            <p className="mt-4 sm:mt-6 max-w-xl text-stone-300 text-sm sm:text-lg leading-relaxed">
              Shubhdarshan connects you directly with Gurukul-verified Vedic Pandits for personalized poojas, havans, and spiritual counseling — in ultra-low latency HD, directly to your screen.
            </p>

            {/* Hero Action Buttons */}
            <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              {liveStreams.length > 0 && featuredStream ? (
                <Link
                  href={`/stream/${featuredStream.id}`}
                  className="group inline-flex items-center justify-center gap-3 rounded-full bg-gold px-7 py-3.5 text-sm font-bold text-obsidian shadow-[0_0_36px_rgba(245,158,11,0.4)] transition hover:bg-gold-deep hover:shadow-[0_0_48px_rgba(245,158,11,0.6)] hover:scale-[1.02] w-full sm:w-auto"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-obsidian/20">
                    <Play className="h-3.5 w-3.5 fill-obsidian text-obsidian ml-0.5" />
                  </span>
                  <span>Watch Live Darshan</span>
                </Link>
              ) : (
                <button
                  onClick={() => {
                    setSelectedSevaId(undefined);
                    setBookingModalOpen(true);
                  }}
                  className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-gold px-7 py-3.5 text-sm font-bold text-obsidian shadow-[0_0_36px_rgba(245,158,11,0.4)] transition hover:bg-gold-deep hover:shadow-[0_0_48px_rgba(245,158,11,0.6)] hover:scale-[1.02] w-full sm:w-auto"
                >
                  <DiyaIcon size={20} className="transform group-hover:scale-110 transition-transform" />
                  <span>Book a Live Pooja</span>
                </button>
              )}

              <Link
                href="/schedule"
                className="hero-btn-schedule inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3.5 text-sm font-extrabold transition w-full sm:w-auto shadow-sm"
              >
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="font-extrabold">Pooja Schedule</span>
              </Link>

              {user ? (
                <button
                  onClick={() => setTopupModalOpen(true)}
                  className="hero-btn-secondary inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3.5 text-sm font-extrabold transition hover:border-amber-400 w-full sm:w-auto shadow-sm"
                >
                  <CoinIcon size={18} />
                  <span className="font-extrabold">Recharge Coins</span>
                </button>
              ) : (
                <Link
                  href="/register"
                  className="hero-btn-secondary inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3.5 text-sm font-extrabold transition hover:border-amber-400 w-full sm:w-auto shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-extrabold">Claim 100 Free Coins</span>
                </Link>
              )}
            </div>

            {/* Platform Stats Row with Grand Gold Serif Numbers */}
            <dl className="mt-8 sm:mt-12 grid grid-cols-2 gap-x-3 sm:gap-x-6 gap-y-4 sm:gap-y-6 border-t border-gold/15 pt-5 sm:pt-8 sm:grid-cols-4">
              <div>
                <dd className="font-serif text-2xl sm:text-4xl font-bold text-gold-pale">85+</dd>
                <dt className="mt-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-normal sm:tracking-[0.16em] text-stone-400">
                  Verified Pandits
                </dt>
              </div>
              <div>
                <dd className="font-serif text-2xl sm:text-4xl font-bold text-gold-pale">100%</dd>
                <dt className="mt-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-normal sm:tracking-[0.16em] text-stone-400">
                  Gurukul Verified
                </dt>
              </div>
              <div>
                <dd className="font-serif text-2xl sm:text-4xl font-bold text-gold-pale">62+</dd>
                <dt className="mt-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-normal sm:tracking-[0.16em] text-stone-400">
                  Countries Reached
                </dt>
              </div>
              <div>
                <dd className="font-serif text-2xl sm:text-4xl font-bold text-gold-pale flex items-center gap-1">
                  4.9 <Star className="w-4 h-4 sm:w-5 sm:h-5 text-gold fill-gold" />
                </dd>
                <dt className="mt-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-normal sm:tracking-[0.16em] text-stone-400">
                  Devotee Rating
                </dt>
              </div>
            </dl>
          </div>

          {/* Right Column: Hero Featured Live Stream or Placeholder Card */}
          <div className="lg:col-span-5">
            {featuredStream ? (
              <div className="relative rounded-3xl border border-stone-200 dark:border-gold/30 bg-white dark:bg-gradient-to-b dark:from-[#221810] dark:to-obsidian p-3 shadow-xl dark:shadow-[0_25px_70px_rgba(0,0,0,0.85)] group transition hover:border-amber-400 dark:hover:border-gold/60">
                <div className="on-photo video-overlay relative aspect-[16/10] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-black">
                  <img
                    src={
                      featuredStream.thumbnailUrl ||
                      '/images/photo-1678593628844-6ea49dee8ce3.webp'
                    }
                    alt={featuredStream.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-95" />

                  {/* Top Overlay Badges */}
                  <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-vermillion-deep/95 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-md">
                      <span className="live-dot" style={{ width: '6px', height: '6px' }} />
                      LIVE
                    </span>
                    <span className="rounded-full bg-black/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-amber-200 border border-amber-400/30 shadow-md">
                      Live HD
                    </span>
                  </div>

                  <div className="absolute top-3.5 right-3.5 rounded-full bg-black/80 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-stone-200 flex items-center gap-1.5 border border-white/20 shadow-md">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>{featuredStream.peakViewers || 1} watching</span>
                  </div>

                  {/* Bottom Overlay Title & Join CTA */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300 block mb-1">
                      {featuredStream.category?.name || 'Live Aarti'}
                    </span>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-white line-clamp-2 leading-snug">
                      {featuredStream.title}
                    </h3>
                    <div className="mt-3.5 flex items-center justify-between pt-2 border-t border-white/20">
                      <div className="flex items-center gap-2">
                        <PranamIcon size={16} />
                        <span className="text-xs font-semibold text-stone-200">
                          {featuredStream.streamer?.name || 'Vedic Pandit'}
                        </span>
                        <VerifiedPanditBadge size={14} />
                      </div>
                      <Link
                        href={`/stream/${featuredStream.id}`}
                        className="rounded-full bg-gold hover:bg-gold-deep text-obsidian font-bold px-4 py-2 text-xs shadow-lg transition-transform hover:scale-105 flex items-center gap-1"
                      >
                        <span>Join Darshan</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative rounded-3xl border border-stone-200 dark:border-gold/30 bg-white dark:bg-gradient-to-b dark:from-[#221810] dark:to-obsidian p-3 sm:p-4 shadow-xl dark:shadow-[0_25px_70px_rgba(0,0,0,0.85)] group transition hover:border-amber-400 dark:hover:border-gold/60">
                <div className="altar-repose-card relative aspect-[16/10] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-amber-100/80 via-orange-50/70 to-rose-50/50 dark:bg-[#0c0a09] flex flex-col justify-between p-4 sm:p-6 border border-amber-300 dark:border-gold/20 shadow-inner">
                  <img
                    src="/images/photo-1681797849099-0053b1567d95.webp"
                    alt="Sanctum Repose"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-20 dark:opacity-40 mix-blend-multiply dark:mix-blend-normal"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/70 to-transparent dark:from-obsidian dark:via-obsidian/75 dark:to-obsidian/60" />

                  {/* Top Overlay Badges */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 rounded-full bg-amber-100/95 dark:bg-black/85 backdrop-blur-md px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-400/35 shadow-sm dark:shadow-md">
                      <DiyaIcon size={14} className="text-amber-600 dark:text-amber-400" />
                      <span>Live Pooja Altar</span>
                    </span>
                    {nextUpcomingStream ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-amber-100/95 dark:bg-black/85 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-400/35 shadow-sm dark:shadow-md">
                        <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>Next: {new Date(nextUpcomingStream.scheduledAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} IST</span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100/95 dark:bg-black/85 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-amber-900 dark:text-stone-200 border border-amber-300 dark:border-white/20 shadow-sm dark:shadow-md">
                        <span>Verified Vedic Acharyas</span>
                      </span>
                    )}
                  </div>

                  {/* Center Sacred Diya & Message */}
                  <div className="relative z-10 text-center py-2 sm:py-3">
                    <div className="w-14 h-14 mx-auto mb-2 rounded-2xl bg-amber-100/70 dark:bg-gradient-to-b dark:from-amber-500/10 dark:to-transparent border border-amber-300 dark:border-gold/30 flex items-center justify-center shadow-sm dark:shadow-[0_0_24px_rgba(245,158,11,0.25)]">
                      <img src="/logo.png" alt="Shubhdarshan" className="w-10 h-10 object-contain drop-shadow" />
                    </div>
                    <h3 className="altar-repose-title font-serif text-xl sm:text-2xl font-bold tracking-tight">
                      Live Pooja Altar in Repose
                    </h3>
                    <p className="altar-repose-desc text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
                      Verified Vedic Pandits stream live whenever they conduct sacred rituals, havan poojas, or astrological discourses. Active broadcasts will appear here in real time.
                    </p>
                    {nextUpcomingStream && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-black/85 backdrop-blur-md border border-amber-300 dark:border-amber-400/40 text-[11px] shadow-sm dark:shadow-md">
                        <span className="altar-repose-upcoming-badge font-bold uppercase tracking-wider text-[10px]">Upcoming:</span>
                        <span className="altar-repose-upcoming font-bold truncate max-w-[220px]">{nextUpcomingStream.title}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="relative z-10 pt-3 border-t border-amber-200/80 dark:border-white/15 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PranamIcon size={16} className="text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                        85+ Verified Pandits
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedSevaId(undefined);
                          setBookingModalOpen(true);
                        }}
                        className="rounded-full bg-gold hover:bg-gold-deep text-obsidian font-bold px-3.5 py-1.5 text-xs shadow-md transition-transform hover:scale-105 flex items-center gap-1.5"
                      >
                        <DiyaIcon size={14} />
                        <span>Book a Pooja</span>
                      </button>
                      <Link
                        href="/schedule"
                        className="rounded-full bg-white dark:bg-black/80 hover:bg-stone-50 dark:hover:bg-black backdrop-blur-md border border-stone-300 dark:border-amber-400/35 text-stone-800 dark:text-amber-100 hover:text-stone-950 dark:hover:text-white font-bold px-3 py-1.5 text-xs transition flex items-center gap-1 shadow-sm dark:shadow-md"
                      >
                        <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Schedule</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Live Seva Activity Ticker (TEMP2 Real-Time Devotee Feed) */}
            <div className="glass rounded-3xl p-4 sm:p-5 mt-4 border border-gold/20 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gold"></span>
                  </span>
                  <span className="devotee-seva-header text-xs uppercase tracking-widest font-black">
                    Worldwide Devotee Seva
                  </span>
                </div>
                <span className="text-[11px] text-stone-600 dark:text-stone-400 font-medium">Real-time offerings</span>
              </div>
              <div className="space-y-2">
                {LIVE_SEVA_ACTIVITIES.map((act, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/15 hover:border-amber-500/40 dark:hover:border-gold/30 transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-amber-500/15 dark:bg-gold/15 flex items-center justify-center text-amber-800 dark:text-gold text-[10px] font-bold shrink-0">
                        {act.initials}
                      </div>
                      <div className="truncate">
                        <span className="devotee-seva-name font-bold">{act.name}</span>
                        <span className="text-stone-400 mx-1.5">•</span>
                        <span className="devotee-seva-action font-semibold">{act.action}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-stone-500 shrink-0 ml-2 font-mono">{act.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Category Filter & Search Section ("Book Personalized Vedic Poojas & Consultations") */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-12" id="live-section">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gold/15">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-soft">
              Sacred Pooja &amp; Seva Booking
            </p>
            <h2 className="mt-1 font-serif text-3xl sm:text-4xl font-bold text-white">
              Book Personalized Vedic Poojas &amp; Consultations
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-stone-400 max-w-xl">
              Select a sacred ritual, choose your preferred Gurukul-verified Pandit, and book a live personal broadcast.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* View Full Catalog Button */}
            <Link
              href="/pooja"
              className="catalog-explore-btn inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border text-xs font-bold transition shrink-0 shadow-sm"
            >
              <DiyaIcon size={14} />
              <span>Explore All 24+ Poojas &amp; Kathas</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            </Link>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-gold-soft" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pooja, pandit..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-obsidian-soft border border-gold/20 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-gold transition"
              />
            </div>
          </div>
        </div>

        {/* 8-Tile Sacred Category Grid (Seva Booking Flow) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 my-6">
          {CATEGORY_TILES.map((cat) => {
            const Icon = cat.icon;
            const isMoreCard = (cat as any).isMore;

            if (isMoreCard) {
              return (
                <Link
                  key={cat.id}
                  href="/pooja"
                  className="group relative cursor-pointer rounded-2xl bg-gradient-to-br from-gold/20 via-obsidian-soft to-obsidian p-4 border border-gold/40 hover:border-gold transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-[0_10px_30px_rgba(245,158,11,0.2)] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold group-hover:scale-110 transition-transform">
                        <Icon size={18} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gold-pale bg-gold/20 px-2 py-0.5 rounded-full border border-gold/30">
                        {cat.tag}
                      </span>
                    </div>
                    <h3 className="font-serif text-sm sm:text-base font-bold text-white group-hover:text-gold-pale transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-[11px] text-stone-300 mt-1 line-clamp-1 leading-snug">
                      {cat.desc}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gold/20 flex items-center justify-between text-[11px] text-gold font-bold">
                    <span>View All 24+ Sevas</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform" />
                  </div>
                </Link>
              );
            }

            return (
              <div
                key={cat.id}
                onClick={() => {
                  setSelectedSevaId(cat.filterKey || cat.id);
                  setBookingModalOpen(true);
                }}
                className="group relative cursor-pointer rounded-2xl bg-obsidian-soft p-4 border border-gold/15 hover:border-gold/50 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-[0_10px_30px_rgba(245,158,11,0.12)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold group-hover:scale-110 transition-transform">
                      <Icon size={18} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold-pale bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">
                      {cat.tag}
                    </span>
                  </div>
                  <h3 className="font-serif text-sm sm:text-base font-bold text-white group-hover:text-gold-pale transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-1 line-clamp-1 leading-snug">
                    {cat.desc}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-stone-800/60 flex items-center justify-between text-[11px] text-gold-soft font-semibold">
                  <span>{(cat as any).priceText || 'Book Live Session'}</span>
                  <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Category Filter Pills Row */}
        <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
          <button
            onClick={() => {
              setSelectedCategory('');
              setSearchQuery('');
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === '' && searchQuery === ''
                ? 'bg-gold text-obsidian shadow-[0_0_18px_rgba(245,158,11,0.3)]'
                : 'bg-obsidian-soft text-stone-300 border border-gold/15 hover:border-gold/40 hover:text-gold-pale'
            }`}
          >
            All Sacred Rituals
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-gold text-obsidian shadow-[0_0_18px_rgba(245,158,11,0.3)]'
                  : 'bg-obsidian-soft text-stone-300 border border-gold/15 hover:border-gold/40 hover:text-gold-pale'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {/* 3. Live Now or Scheduled Broadcasts Section */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-8" id="live-streams-grid">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {liveStreams.length > 0 ? (
              <>
                <span className="live-dot" />
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                  Darshan streaming this very moment
                </h2>
              </>
            ) : (
              <>
                <Calendar className="w-6 h-6 text-gold" />
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                  Scheduled Vedic Poojas &amp; Darshans
                </h2>
              </>
            )}
          </div>
          <span className="text-xs text-gold-soft/90 font-medium hidden sm:inline">
            {liveStreams.length > 0
              ? '5 Coins / min metered darshan • Live HD'
              : 'Upcoming live broadcasts scheduled by Gurukul-verified Pandits'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Active Live Streams from API */}
          {liveStreams.map((stream, idx) => {
            const fallbackImg = FALLBACK_THUMBNAILS[idx % FALLBACK_THUMBNAILS.length];
            return (
              <Link
                key={stream.id}
                href={`/stream/${stream.id}`}
                className="group rounded-2xl overflow-hidden bg-obsidian-soft border border-gold/15 hover:border-gold/50 transition-all flex flex-col shadow-xl hover:shadow-[0_12px_36px_rgba(245,158,11,0.12)]"
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-video bg-black overflow-hidden on-photo">
                  <img
                    src={stream.thumbnailUrl || fallbackImg}
                    alt={stream.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/photo-1681797849099-0053b1567d95.webp';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-80" />

                  {/* LIVE badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-red-600/90 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                  </div>

                  {/* Quality & Coin Meter */}
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <span className="rounded bg-black/75 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-stone-200">
                      1080p HD
                    </span>
                  </div>

                  {/* Play Hover Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-obsidian shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                      <Play className="h-5 w-5 fill-obsidian ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-soft">
                        {stream.category?.name || 'Aarti'}
                      </span>
                      <span className="text-[10px] font-bold text-gold-pale bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CoinIcon size={12} /> 5 C/min
                      </span>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-white line-clamp-1 group-hover:text-gold-pale transition">
                      {stream.title}
                    </h3>
                    <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                      {stream.description || 'Join live sacred rituals, Vedic chanting, and Aarti.'}
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-300">
                    <div className="flex items-center gap-1.5 font-medium">
                      <PranamIcon size={16} />
                      <span className="text-stone-200">{stream.streamer?.name || 'Vedic Pandit'}</span>
                      {stream.streamer?.streamerProfile?.isVerifiedBadge && (
                        <VerifiedPanditBadge size={14} />
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-stone-400 font-medium">
                      <Users className="w-3.5 h-3.5 text-gold" />
                      <span>{stream.peakViewers || 1}</span>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* When No Live Stream: Display Scheduled Broadcasts created by Pandits */}
          {liveStreams.length === 0 && (upcomingStreams.length > 0 ? upcomingStreams : FALLBACK_SCHEDULED_BROADCASTS).map((item: any, idx: number) => {
            const fallbackImg = FALLBACK_THUMBNAILS[idx % FALLBACK_THUMBNAILS.length];
            const dateStr = item.scheduledAt
              ? new Date(item.scheduledAt).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : (item.scheduledText || 'Today Evening');
            const streamerName = item.streamer?.name || item.streamer || 'Vedic Pandit';
            const categoryName = item.category?.name || item.category || 'Vedic Pooja';
            const thumbUrl = item.thumbnailUrl || item.thumbnail || fallbackImg;

            return (
              <div
                key={item.id}
                className="group rounded-2xl overflow-hidden bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/15 hover:border-amber-400 dark:hover:border-gold/50 transition-all flex flex-col shadow-md dark:shadow-xl hover:shadow-lg"
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-video bg-black overflow-hidden on-photo">
                  <img
                    src={thumbUrl}
                    alt={item.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/photo-1681797849099-0053b1567d95.webp';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                  {/* Scheduled badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/85 backdrop-blur-md border border-amber-400/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-100 shadow-md">
                    <Calendar className="w-3 h-3 text-amber-400" />
                    <span>{dateStr}</span>
                  </div>

                  {/* Quality & Coin Meter */}
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <span className="rounded bg-black/75 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-stone-200">
                      1080p HD
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-gold-soft">
                        {categoryName}
                      </span>
                      <span className="text-[10px] font-bold text-amber-900 dark:text-gold-pale bg-amber-500/10 dark:bg-gold/10 border border-amber-500/25 dark:border-gold/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CoinIcon size={12} /> 5 C/min
                      </span>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white line-clamp-1 group-hover:text-amber-700 dark:group-hover:text-gold-pale transition">
                      {item.title}
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-stone-200 dark:border-stone-800/80 space-y-3">
                    <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-300">
                      <div className="flex items-center gap-1.5 font-medium">
                        <PranamIcon size={16} />
                        <span className="text-stone-800 dark:text-stone-200 font-semibold">{streamerName}</span>
                        <VerifiedPanditBadge size={14} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleRemindMe(item.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-full border border-amber-300 dark:border-gold/30 bg-amber-50 dark:bg-gold/10 hover:bg-amber-100 dark:hover:bg-gold/20 text-amber-950 dark:text-gold-pale transition shadow-sm"
                      >
                        <Bell className="w-3.5 h-3.5 text-amber-600 dark:text-gold" />
                        <span>Remind Me</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedSevaId(item.category?.slug || 'rudrabhishek');
                          setBookingModalOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-full bg-gold hover:bg-gold-deep text-obsidian transition shadow"
                      >
                        <DiyaIcon size={14} />
                        <span>Book Sankalp</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Upcoming Sacred Gatherings ("Upcoming sacred gatherings") */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-14 scroll-mt-5" id="upcoming">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="calendar-tag text-xs font-bold uppercase tracking-[0.24em]">
              Pooja Calendar
            </p>
            <h2 className="calendar-title mt-1 font-serif text-2xl sm:text-3xl font-bold">
              Upcoming sacred gatherings
            </h2>
          </div>
        </div>

        {upcomingStreams.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-obsidian-soft p-8 text-center text-stone-600 dark:text-stone-400 text-xs sm:text-sm">
            All sanctum schedules for the week are currently being synchronized with mandir trusts. Please check back shortly.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingStreams.map((stream) => (
              <div
                key={stream.id}
                className="rounded-2xl bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/15 p-5 flex flex-col justify-between shadow-md dark:shadow-lg hover:border-amber-400 dark:hover:border-gold/35 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="calendar-tag text-[10px] font-bold uppercase tracking-[0.2em]">
                      {stream.category.name}
                    </span>
                    {stream.scheduledAt && (
                      <span className="calendar-date-pill text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm border">
                        <Clock className="w-3 h-3 shrink-0" />
                        {new Date(stream.scheduledAt).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    )}
                  </div>

                  <h3 className="calendar-title font-serif text-lg font-bold line-clamp-1">{stream.title}</h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                    {stream.description || 'Sacred upcoming Vedic pooja and Aarti.'}
                  </p>

                  <div className="mt-4 flex items-center gap-1.5 text-xs text-stone-700 dark:text-stone-300 font-semibold">
                    <PranamIcon size={14} />
                    <span>{stream.streamer.name}</span>
                    <VerifiedPanditBadge size={14} />
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-stone-200 dark:border-stone-800/80 flex items-center justify-between">
                  <button
                    onClick={() => handleRemindMe(stream.id)}
                    className="calendar-remind-btn flex items-center gap-1.5 text-xs font-black border px-3.5 py-1.5 rounded-full transition shadow-sm"
                  >
                    <Bell className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-black">Remind Me</span>
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Live HD
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Meet the Custodians of Tradition ("Verified Pandits & Acharyas") */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-16 border-t border-gold/15 scroll-mt-4" id="pandits">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold-soft">
            Gurukul Verification
          </p>
          <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-bold text-white">
            Meet the custodians of tradition
          </h2>
          <p className="mt-3 text-stone-400 text-xs sm:text-sm leading-relaxed">
            Every pandit on Shubhdarshan undergoes rigorous background verification, Gurukul lineage scrutiny, and Sanskrit pronunciation auditing before being authorized to broadcast.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CURATED_PANDITS.map((p) => (
            <div
              key={p.name}
              className="rounded-2xl bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/15 overflow-hidden shadow-lg dark:shadow-xl hover:border-amber-400 dark:hover:border-gold/40 transition group"
            >
              <div className="relative aspect-square overflow-hidden bg-stone-900 on-photo">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute top-3 right-3 rounded-full bg-black/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-amber-200 flex items-center gap-1 border border-amber-400/40 shadow-md">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-amber-200">{p.rating}</span>
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-amber-400/40 text-amber-200 font-bold text-xs shadow-md">
                    <VerifiedPanditBadge size={14} />
                    <span className="text-amber-200">Gurukul Verified</span>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-2">
                <h3 className="pandit-name font-serif text-lg font-bold">{p.name}</h3>
                <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-tight">{p.title}</p>
                <div className="pandit-stats flex items-center justify-between text-[11px] pt-1 font-semibold">
                  <span>{p.experience}</span>
                  <span>{p.reviews} sevas conducted</span>
                </div>
                <div className="flex flex-wrap gap-1 pt-2">
                  {p.specialties.map((s) => (
                    <span
                      key={s}
                      className="pandit-specialty-tag text-[9px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <div className="pt-3 border-t border-stone-200 dark:border-gold/10 flex items-center justify-between gap-2">
                  <Link
                    href={`/pandit/${p.slug}`}
                    className="pandit-btn-profile flex-1 py-1.5 px-3 border rounded-xl text-center text-xs font-black transition shadow-sm"
                  >
                    <span className="font-black">View Profile &amp; Sevas</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Three Steps to Your First Darshan ("How It Works") */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-16 border-t border-gold/15">
        <div className="text-center max-w-xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold-soft">
            Seamless Devotional Journey
          </p>
          <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-bold text-white">
            Three steps to your sacred live pooja
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-2xl bg-obsidian-soft border border-gold/15 p-6 shadow-xl relative">
            <span className="font-serif text-5xl font-black text-amber-600/70 block mb-2 step-num">01</span>
            <h3 className="font-serif text-xl font-bold text-white mb-2">
              Select Ritual &amp; Verified Pandit
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
              Choose from authentic Vedic rituals — Rudrabhishek, Navgrah Shanti, Kundli guidance, or Family Sankalp. Select your preferred Gurukul-verified Pandit.
            </p>
          </div>

          <div className="rounded-2xl bg-obsidian-soft border border-gold/15 p-6 shadow-xl relative">
            <span className="font-serif text-5xl font-black text-amber-600/70 block mb-2 step-num">02</span>
            <h3 className="font-serif text-xl font-bold text-white mb-2">
              Join Live Consecrated Broadcast
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
              Connect to our ultra-low latency WebRTC stream with zero audio lag. Hear authentic Vedic mantras and ritual chants with pure acoustics directly on your screen.
            </p>
          </div>

          <div className="rounded-2xl bg-obsidian-soft border border-gold/15 p-6 shadow-xl relative">
            <span className="font-serif text-5xl font-black text-amber-600/70 block mb-2 step-num">03</span>
            <h3 className="font-serif text-xl font-bold text-white mb-2">
              Offer Sankalp &amp; Dakshina
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
              Provide your family Gotra for personal chanting, interact directly in the consecrated chatroom, and offer voluntary Dakshina using your Sacred Coin wallet.
            </p>
          </div>
        </div>
      </section>

      {/* 7. One Currency for Every Seva ("Devotional Coins & Transparent Seva") */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-16 border-t border-gold/15">
        <div className="rounded-3xl border border-gold/25 bg-obsidian-soft p-8 sm:p-12 shadow-xl relative overflow-hidden">
          <div className="mandala-bg absolute inset-0 opacity-30 pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-gold-pale">
                <CoinIcon size={16} /> Transparent Devotional Economy
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
                One currency for every seva
              </h2>
              <p className="text-stone-300 text-xs sm:text-sm leading-relaxed max-w-xl">
                No hidden subscriptions or recurring credit card traps. You receive 100 free coins upon signup. Metered Darshan costs a transparent 5 coins per minute, deducted smoothly as you watch. Top up securely anytime via UPI, Cards, or NetBanking.
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => setTopupModalOpen(true)}
                  className="rounded-full bg-gold px-6 py-3 text-xs font-black text-obsidian shadow-lg hover:bg-gold-deep transition"
                >
                  View Coin Packages (from ₹200)
                </button>
                <Link
                  href="/faq"
                  className="text-xs font-semibold text-stone-300 hover:text-gold-pale transition flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" /> How do coins work?
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-obsidian border border-gold/15">
                <span className="font-serif text-2xl font-bold text-gold-pale block">100 Coins</span>
                <span className="text-[11px] text-stone-400">Free Joining Bonus</span>
              </div>
              <div className="p-4 rounded-2xl bg-obsidian border border-gold/15">
                <span className="font-serif text-2xl font-bold text-gold-pale block">5 Coins/min</span>
                <span className="text-[11px] text-stone-400">Live Metered Stream</span>
              </div>
              <div className="p-4 rounded-2xl bg-obsidian border border-gold/15">
                <span className="font-serif text-2xl font-bold text-gold-pale block">100% Secure</span>
                <span className="text-[11px] text-stone-400">Razorpay Encrypted</span>
              </div>
              <div className="p-4 rounded-2xl bg-obsidian border border-gold/15">
                <span className="font-serif text-2xl font-bold text-gold-pale block">No Expiry</span>
                <span className="text-[11px] text-stone-400">Coins Valid Forever</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Devotee Testimonials ("Blessings received across the world") */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-16 border-t border-gold/15">
        <div className="text-center max-w-xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold-soft">
            Global Sangha
          </p>
          <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-bold text-white">
            Blessings received, across the seas
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DEVOTEE_TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl bg-obsidian-soft border border-gold/15 p-6 shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-gold">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-gold" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-stone-300 leading-relaxed italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white block">{t.name}</span>
                  <span className="text-[10px] text-stone-400">{t.location}</span>
                </div>
                <span className="text-[10px] font-bold text-gold-soft bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">
                  {t.ritual}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 9. Final Sacred Call to Action Banner ("Your first Darshan is on us") */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-16">
        <div className="rounded-3xl border border-gold/25 bg-obsidian-soft p-8 sm:p-16 text-center shadow-xl relative overflow-hidden">
          <div className="mandala-bg absolute inset-0 opacity-40 pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gold-pale">
              <Sparkles className="w-4 h-4 text-gold" /> 100 Free Coins on Joining
            </span>

            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-white">
              Your first Darshan is on us
            </h2>

            <p className="text-stone-300 text-xs sm:text-base leading-relaxed">
              Experience authentic Vedic rituals and personalized poojas today. Join over 40,000 devotees across the globe receiving live blessings from Gurukul-verified Pandits.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="rounded-full bg-gold px-8 py-3.5 text-sm font-bold text-obsidian shadow-[0_0_36px_rgba(245,158,11,0.4)] hover:bg-gold-deep transition"
              >
                Join Free &amp; Claim 100 Coins
              </Link>
              <button
                onClick={() => {
                  setSelectedSevaId(undefined);
                  setBookingModalOpen(true);
                }}
                className="rounded-full border border-gold/40 bg-obsidian-soft hover:bg-gold/10 px-6 py-3.5 text-sm font-bold text-gold-pale transition"
              >
                Book a Live Pooja Session
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Coin Topup Modal */}
      <CoinTopupModal
        isOpen={topupModalOpen}
        onClose={() => setTopupModalOpen(false)}
        onSuccess={() => {}}
      />

      {/* Seva Booking Modal */}
      <SevaBookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        initialSevaId={selectedSevaId}
      />
    </div>
  );
}
