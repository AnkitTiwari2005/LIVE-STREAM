'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Flame, Calendar, Users, Bell, Play, Sparkles, Zap, ShieldCheck } from 'lucide-react';
import {
  OmIcon,
  DiyaIcon,
  CoinIcon,
  PranamIcon,
  VerifiedPanditBadge,
} from '@/components/icons/SpiritualIcons';

interface Stream {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  status: 'LIVE' | 'SCHEDULED';
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

export default function HomePage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

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
        if (searchQuery) params.append('search', searchQuery);
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
  }, [selectedCategory, searchQuery]);

  const liveStreams = streams.filter((s) => s.status === 'LIVE');
  const upcomingStreams = streams.filter((s) => s.status === 'SCHEDULED');

  const handleRemindMe = async (streamId: string) => {
    const token = localStorage.getItem('pooja_token');
    if (!token) {
      alert('Please sign in to set email reminders.');
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
      alert(data.message || 'Reminder set!');
    } catch {
      alert('Failed to set reminder.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Sacred Modernized Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-orange-950/80 via-stone-900 to-amber-950/80 border border-orange-900/40 p-8 sm:p-12 mb-10 shadow-2xl">
        {/* Sacred Ambient Background Mandala */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-600/20 border border-orange-500/30 text-orange-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" /> Authentic Vedic Darshan & Consultation
          </div>

          <div className="flex items-center gap-3 mb-3">
            <OmIcon size={44} />
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Shubhdarshan{' '}
              <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-500 bg-clip-text text-transparent">
                Live Darshan & Pooja
              </span>
            </h1>
          </div>

          <p className="text-stone-300 text-sm sm:text-base mb-6 leading-relaxed max-w-2xl">
            Participate in real-time temple Aartis, Rudrabhishek, Kundli match, and personalized family sankalps with verified Vedic Pandits worldwide. Sub-second WebRTC video, zero delay chanting.
          </p>

          {/* Quick Platform Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-stone-800/80">
            <div className="flex items-center gap-2 text-xs">
              <CoinIcon size={20} />
              <div>
                <span className="font-extrabold text-white block">100 Free Coins</span>
                <span className="text-[10px] text-stone-400">Joining Bonus</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <DiyaIcon size={20} />
              <div>
                <span className="font-extrabold text-white block">5 Coins / min</span>
                <span className="text-[10px] text-stone-400">Live Metered Darshan</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <VerifiedPanditBadge size={20} />
              <div>
                <span className="font-extrabold text-white block">Verified Pandits</span>
                <span className="text-[10px] text-stone-400">Strict Gurukul KYC</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="font-extrabold text-white block">DPDP Act 2023</span>
                <span className="text-[10px] text-stone-400">100% Privacy Safe</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="space-y-4 mb-10">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pooja, pandit name, or ritual..."
            className="w-full pl-10 pr-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-sm text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === ''
                ? 'bg-orange-600 text-white'
                : 'bg-stone-900 text-stone-300 hover:bg-stone-800'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-orange-600 text-white'
                  : 'bg-stone-900 text-stone-300 hover:bg-stone-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Live Now Section */}
      <section className="mb-14">
        <div className="flex items-center gap-2 mb-6">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight">Live Darshan Right Now</h2>
        </div>

        {liveStreams.length === 0 ? (
          <div className="bg-stone-900/50 border border-stone-800/60 rounded-2xl p-8 text-center text-stone-400 text-sm">
            No live streams active at this moment. Check the upcoming schedule below.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveStreams.map((stream) => (
              <Link
                key={stream.id}
                href={`/stream/${stream.id}`}
                className="group bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden hover:border-orange-600/50 transition-all flex flex-col shadow-lg"
              >
                {/* Thumbnail / Video Box */}
                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                  {stream.thumbnailUrl ? (
                    <img
                      src={stream.thumbnailUrl}
                      alt={stream.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-stone-900 to-orange-950/40 flex items-center justify-center">
                      <OmIcon size={48} />
                    </div>
                  )}

                  {/* LIVE Pill */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600/90 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                  </div>

                  {/* Quality Pill */}
                  <div className="absolute top-3 right-3 bg-black/60 text-stone-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase backdrop-blur-sm">
                    {stream.videoQuality}
                  </div>

                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-orange-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all shadow-xl">
                      <Play className="w-5 h-5 ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider">
                      {stream.category.name}
                    </span>
                    <h3 className="font-bold text-white text-base mt-1 line-clamp-1 group-hover:text-orange-300 transition-colors">
                      {stream.title}
                    </h3>
                    <p className="text-xs text-stone-400 mt-1 line-clamp-2">
                      {stream.description || 'Join live sacred rituals and chanting.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between text-xs text-stone-300">
                    <span className="flex items-center gap-1.5 font-medium">
                      <PranamIcon size={14} />
                      <span>{stream.streamer.name}</span>
                      {stream.streamer.streamerProfile?.isVerifiedBadge && (
                        <VerifiedPanditBadge size={14} />
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-stone-400">
                      <Users className="w-3.5 h-3.5" /> {stream.peakViewers || 1} watching
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming Scheduled Streams */}
      <section id="upcoming">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="w-5 h-5 text-orange-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">Upcoming Scheduled Pooja & Discourses</h2>
        </div>

        {upcomingStreams.length === 0 ? (
          <div className="bg-stone-900/50 border border-stone-800/60 rounded-2xl p-8 text-center text-stone-400 text-sm">
            No scheduled poojas yet. Please check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingStreams.map((stream) => (
              <div
                key={stream.id}
                className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden flex flex-col p-5 justify-between shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-orange-400 uppercase tracking-wider">
                      {stream.category.name}
                    </span>
                    {stream.scheduledAt && (
                      <span className="text-[11px] bg-stone-800 px-2.5 py-0.5 rounded-full text-stone-300 font-medium">
                        {new Date(stream.scheduledAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-white text-base line-clamp-1">{stream.title}</h3>
                  <p className="text-xs text-stone-400 mt-1 line-clamp-2">
                    {stream.description || 'Upcoming pooja ceremony.'}
                  </p>
                  <p className="text-xs text-stone-300 mt-3 font-medium flex items-center gap-1.5">
                    <span>By:</span> <PranamIcon size={14} /> {stream.streamer.name}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-stone-800 flex items-center justify-between">
                  <button
                    onClick={() => handleRemindMe(stream.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-stone-800 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Bell className="w-3.5 h-3.5" /> Remind Me (Email)
                  </button>
                  <span className="text-[11px] text-stone-400">{stream.videoQuality} SD</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
