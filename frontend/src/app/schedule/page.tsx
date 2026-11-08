'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Bell,
  Sparkles,
  ChevronRight,
  Filter,
  Users,
  Video,
} from 'lucide-react';
import { VerifiedPanditBadge, DiyaIcon, CoinIcon, PranamIcon } from '@/components/icons/SpiritualIcons';
import SevaBookingModal from '@/components/SevaBookingModal';
import { useToast } from '@/components/Toast';

interface StreamItem {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  status: string;
  scheduledAt?: string;
  videoQuality?: string;
  category: { id: string; name: string; slug: string };
  streamer: {
    id: string;
    name: string;
    streamerProfile?: { isVerifiedBadge?: boolean; specialties?: string[] };
  };
}

const FALLBACK_SCHEDULE = [
  {
    id: 'sched-1',
    title: 'Maha Rudrabhishek & Swasti Vachan',
    description: 'Vedic Panchamrit Abhishek with resonant Rudra Sukta recitation for peace, health, and family prosperity.',
    thumbnailUrl: '/images/photo-1681797849099-0053b1567d95.webp',
    status: 'SCHEDULED',
    scheduledAt: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
    videoQuality: '1080p',
    category: { id: 'c1', name: 'Pooja', slug: 'pooja' },
    streamer: {
      id: 'p1',
      name: 'Pandit Aarav Sharma',
      streamerProfile: { isVerifiedBadge: true, specialties: ['Rudrabhishek', 'Vedic Pooja'] },
    },
  },
  {
    id: 'sched-2',
    title: 'Navgrah Shanti & Vedic Kundli Remedial Pooja',
    description: 'Auspicious 9-graha oblations and personalized horoscope dosha nivaran chanting by Gurukul scholar.',
    thumbnailUrl: '/images/photo-1577083753695-e010191bacb5.webp',
    status: 'SCHEDULED',
    scheduledAt: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    videoQuality: '1080p HD',
    category: { id: 'c2', name: 'Astrology and Kundli', slug: 'astrology-kundli' },
    streamer: {
      id: 'p2',
      name: 'Acharya Devrat Sharma',
      streamerProfile: { isVerifiedBadge: true, specialties: ['Navgrah Shanti', 'Karmakand'] },
    },
  },
  {
    id: 'sched-3',
    title: 'Sandhya Deepotsav & Divine Aarti',
    description: 'Devotional evening lamp invocation with conch shell reverberations and sacred mantra pushpam.',
    thumbnailUrl: '/images/photo-1678593628844-6ea49dee8ce3.webp',
    status: 'SCHEDULED',
    scheduledAt: new Date(Date.now() + 28 * 3600 * 1000).toISOString(),
    videoQuality: '1080p',
    category: { id: 'c3', name: 'Aarti and Darshan', slug: 'aarti-darshan' },
    streamer: {
      id: 'p3',
      name: 'Pandit Hariram Vyas',
      streamerProfile: { isVerifiedBadge: true, specialties: ['Aarti', 'Ganga Seva'] },
    },
  },
];

export default function SchedulePage() {
  const toast = useToast();
  const [streams, setStreams] = useState<StreamItem[]>(FALLBACK_SCHEDULE);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [remindStatus, setRemindStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadStreams() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
        const res = await fetch(`${apiUrl}/streams/public`);
        if (res.ok) {
          const data: StreamItem[] = await res.json();
          const scheduled = data.filter((s) => s.status === 'SCHEDULED');
          if (scheduled.length > 0) {
            setStreams(scheduled);
          }
        }
      } catch (err) {
        console.error('Failed to load schedule:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStreams();

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'booking') {
        setBookingModalOpen(true);
      }
    }
  }, []);

  const handleRemindMe = async (streamId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pooja_token') : null;
    if (!token) {
      toast.info('Please sign in to set email reminders.');
      window.location.href = '/login?redirect=/schedule';
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const res = await fetch(`${apiUrl}/notifications/remind/${streamId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRemindStatus((prev) => ({ ...prev, [streamId]: true }));
      toast.success(data.message || 'Email reminder scheduled successfully!');
    } catch {
      toast.error('Failed to set reminder.');
    }
  };

  const filteredStreams = streams.filter((s) => {
    if (selectedCategory === 'ALL') return true;
    return s.category?.name.toLowerCase().includes(selectedCategory.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-obsidian text-stone-200">
      {/* Hero Section */}
      <section className="relative py-16 px-5 lg:px-8 border-b border-gold/15 overflow-hidden">
        <div className="mandala-bg absolute inset-0 opacity-25 pointer-events-none" />
        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-amber-500/10 to-transparent border border-gold/30 flex items-center justify-center mx-auto mb-2 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
            <img src="/logo.png" alt="Shubhdarshan" className="w-11 h-11 object-contain drop-shadow" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold-soft">
            Sacred Pooja Calendar
          </p>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Upcoming Vedic Broadcasts &amp; Darshans
          </h1>
          <p className="text-xs sm:text-base text-stone-300 max-w-2xl mx-auto leading-relaxed">
            Gurukul-verified Vedic Pandits schedule sacred poojas, havans, and spiritual counseling in real time. Set reminders or book your personal live session.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setBookingModalOpen(true)}
              className="px-6 py-2.5 rounded-full bg-gold hover:bg-gold-deep text-obsidian font-bold text-xs shadow-lg transition flex items-center gap-1.5"
            >
              <DiyaIcon size={15} />
              <span>Book a Personal Pooja Session</span>
            </button>
            <Link
              href="/#pandits"
              className="px-5 py-2.5 rounded-full bg-obsidian-soft border border-gold/25 hover:border-gold/50 text-gold-pale font-semibold text-xs transition"
            >
              View Verified Pandits
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-5 lg:px-8 py-10">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {['ALL', 'Pooja', 'Aarti', 'Astrology', 'Katha', 'Discourse'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-gold text-obsidian shadow-[0_0_18px_rgba(245,158,11,0.3)]'
                  : 'bg-obsidian-soft text-stone-300 border border-gold/15 hover:border-gold/40 hover:text-gold-pale'
              }`}
            >
              {cat === 'ALL' ? 'All Scheduled Broadcasts' : cat}
            </button>
          ))}
        </div>

        {/* Schedule Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredStreams.map((stream) => {
            const isReminded = remindStatus[stream.id];
            const dateStr = stream.scheduledAt
              ? new Date(stream.scheduledAt).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Upcoming';

            return (
              <div
                key={stream.id}
                className="group rounded-2xl overflow-hidden bg-obsidian-soft border border-gold/15 hover:border-gold/50 transition-all flex flex-col shadow-xl hover:shadow-[0_12px_36px_rgba(245,158,11,0.12)]"
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-video bg-black overflow-hidden on-photo">
                  <img
                    src={stream.thumbnailUrl || '/images/photo-1681797849099-0053b1567d95.webp'}
                    alt={stream.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/photo-1681797849099-0053b1567d95.webp';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-80" />

                  {/* Scheduled badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-stone-900/90 border border-gold/30 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-pale">
                    <Calendar className="w-3 h-3 text-gold" />
                    <span>{dateStr}</span>
                  </div>

                  {/* Quality */}
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <span className="rounded bg-black/60 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-stone-300">
                      1080p HD
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-soft">
                        {stream.category?.name || 'Vedic Pooja'}
                      </span>
                      <span className="text-[10px] font-bold text-gold-pale bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CoinIcon size={12} /> 5 C/min
                      </span>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-white line-clamp-1 group-hover:text-gold-pale transition">
                      {stream.title}
                    </h3>
                    <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                      {stream.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-stone-800/80 space-y-3">
                    <div className="flex items-center justify-between text-xs text-stone-300">
                      <div className="flex items-center gap-1.5 font-medium">
                        <PranamIcon size={16} />
                        <span className="text-stone-200">{stream.streamer?.name || 'Vedic Pandit'}</span>
                        <VerifiedPanditBadge size={14} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleRemindMe(stream.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-full border transition ${
                          isReminded
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : 'bg-gold/10 hover:bg-gold/20 border-gold/30 text-gold-pale'
                        }`}
                      >
                        <Bell className="w-3.5 h-3.5 text-gold" />
                        <span>{isReminded ? 'Reminder Set' : 'Remind Me'}</span>
                      </button>

                      <button
                        onClick={() => setBookingModalOpen(true)}
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
      </main>

      {/* Seva Booking Modal */}
      <SevaBookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
      />
    </div>
  );
}
