'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Calendar,
  Share2,
  Sparkles,
  ArrowLeft,
  Radio,
  AlertCircle,
  Clock,
} from 'lucide-react';
import {
  OmIcon,
  DiyaIcon,
  VerifiedPanditBadge,
} from '@/components/icons/SpiritualIcons';
import { apiFetch } from '@/lib/api';

interface PanditData {
  id?: string;
  name: string;
  title: string;
  experience: string;
  specialties: string[];
  languages: string[];
  image: string;
  bio: string;
  temple: string;
  followerCount: number;
  isCurated?: boolean;
  upcoming: Array<{
    id: string;
    title: string;
    category?: string;
    time?: string;
    isLive?: boolean;
  }>;
}

const CURATED_SHOWCASE: Record<string, PanditData> = {
  'aarav-sharma': {
    name: 'Pandit Aarav Sharma',
    title: 'Head Archak, Kashi Vishwanath Parampara',
    experience: '22 Years Seva',
    specialties: ['Rudrabhishek', 'Mahamrityunjaya Jaap', 'Ganga Aarti', 'Vedic Chanting'],
    languages: ['Hindi', 'Sanskrit', 'English'],
    image: '/images/photo-1543934776-32d1cc654abb.webp',
    bio: 'Initiated at the sacred ghats of Varanasi under the Dashashwamedh Parampara, Pandit Aarav Sharma has consecrated authentic Vedic ceremonies and sacred Rudrabhisheks with Shukla Yajurveda mantra uccharan.',
    temple: 'Kashi Vishwanath Corridor, Varanasi',
    followerCount: 0,
    isCurated: true,
    upcoming: [],
  },
  'hariram-vyas': {
    name: 'Pandit Hariram Vyas',
    title: 'Senior Purohit, Haridwar Ganga Sabha',
    experience: '18 Years Seva',
    specialties: ['Sandhya Aarti', 'Navgrah Shanti', 'Kavach Path'],
    languages: ['Hindi', 'Sanskrit'],
    image: '/images/photo-1544186196-6908a9d76ab3.webp',
    bio: 'Custody of the sacred Ganga Sabha ritual traditions at Har Ki Pauri. Specializes in peace and prosperity sankalps and Navgrah dosha nivaran.',
    temple: 'Har Ki Pauri, Haridwar',
    followerCount: 0,
    isCurated: true,
    upcoming: [],
  },
  'vishwanath-bhatt': {
    name: 'Pandit Vishwanath Bhatt',
    title: 'Vedic Scholar, Tirupati Devasthanam Tradition',
    experience: '26 Years Seva',
    specialties: ['Vishnu Sahasranama', 'Satyanarayan Katha', 'Vedic Chanting'],
    languages: ['Telugu', 'Sanskrit', 'Hindi', 'English'],
    image: '/images/photo-1596604820148-da737958af16.webp',
    bio: 'Trained in Krishna Yajurveda and Vaikhanasa Agama, leading divine katha recitals and Tirupati suprabhatam chanting for devotees worldwide.',
    temple: 'Tirupati Tradition Sanctuary',
    followerCount: 0,
    isCurated: true,
    upcoming: [],
  },
  'devrishi': {
    name: 'Acharya Devrishi',
    title: 'Sanskrit Acharya, Rishikesh Gurukul',
    experience: '15 Years Seva',
    specialties: ['Vedic Astrology', 'Kundli Milan', 'Vastu Shanti'],
    languages: ['Hindi', 'Sanskrit', 'English'],
    image: '/images/photo-1762838105804-c3264c29a390.webp',
    bio: 'Gurukul-certified Jyotish Acharya providing astronomical Kundli analysis, Vastu energy alignments, and Vedic muhurta calculations.',
    temple: 'Rishikesh Tapovan Gurukul',
    followerCount: 0,
    isCurated: true,
    upcoming: [],
  },
};

export default function PanditProfileClient() {
  const router = useRouter();
  const { id: paramId } = useParams() as { id: string };

  const [id, setId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
      const urlId = parts[parts.length - 1];
      if (urlId && urlId !== 'pandit') {
        return urlId;
      }
    }
    return paramId || '';
  });

  const [pandit, setPandit] = useState<PanditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingAction, setFollowingAction] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
      const urlId = parts[parts.length - 1];
      if (urlId && urlId !== 'pandit') {
        setId(urlId);
      }
      const stored = localStorage.getItem('pooja_user');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch {}
      }
    }
  }, [paramId]);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    setLoading(true);
    setNotFound(false);

    async function loadProfile() {
      try {
        // N-07: Query real backend streamer profile
        const res = await apiFetch(`/streamers/profile/${id}`);
        if (!isMounted) return;

        if (res && res.profile) {
          const prof = res.profile;
          const userFollowed = currentUser?.id && Array.isArray(prof.followers)
            ? prof.followers.some((f: any) => f.followerId === currentUser.id)
            : false;

          setPandit({
            id: prof.id,
            name: prof.name || 'Vedic Pandit',
            title: prof.templeAffiliation ? `${prof.templeAffiliation} Acharya` : 'Verified Vedic Acharya',
            experience: prof.experienceYears ? `${prof.experienceYears} Years Seva` : 'Traditional Lineage',
            specialties: prof.specialties || [],
            languages: prof.languages || ['Hindi', 'Sanskrit'],
            image: prof.avatarUrl || '/images/photo-1543934776-32d1cc654abb.webp',
            bio: prof.bio || 'Vedic Acharya consecrated to daily Darshan and sacred Pooja rituals.',
            temple: prof.templeAffiliation || 'Vedic Tradition Sanctuary',
            followerCount: prof.followerCount || 0,
            isCurated: false,
            upcoming: (res.streams || []).map((s: any) => ({
              id: s.id,
              title: s.title,
              category: s.category?.name || 'Pooja',
              time: s.scheduledAt ? new Date(s.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Live Broadcast',
              isLive: s.status === 'LIVE',
            })),
          });
          setIsFollowing(userFollowed);
          setFollowerCount(prof.followerCount || 0);
          setLoading(false);
          return;
        }
      } catch (err: any) {
        // Fallback check against curated lineage tradition items
        const curated = CURATED_SHOWCASE[id];
        if (curated) {
          if (!isMounted) return;
          setPandit(curated);
          setFollowerCount(curated.followerCount);
          setLoading(false);
          return;
        }

        // Neither real profile nor valid curated tradition: 404
        if (!isMounted) return;
        setNotFound(true);
        setPandit(null);
        setLoading(false);
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [id, currentUser?.id]);

  const toggleFollow = async () => {
    if (!pandit) return;

    if (!currentUser) {
      if (confirm('Please sign in to follow verified Pandits and receive live darshan alerts.')) {
        router.push(`/login?redirect=/pandit/${id}`);
      }
      return;
    }

    if (pandit.isCurated || !pandit.id) {
      alert('This is an introductory lineage showcase. You can follow live pandits directly during their active broadcasts.');
      return;
    }

    setFollowingAction(true);
    const nextState = !isFollowing;

    try {
      if (nextState) {
        await apiFetch(`/streamers/${pandit.id}/follow`, { method: 'POST' });
        setIsFollowing(true);
        setFollowerCount((prev) => prev + 1);
      } else {
        await apiFetch(`/streamers/${pandit.id}/follow`, { method: 'DELETE' });
        setIsFollowing(false);
        setFollowerCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update follow status');
    } finally {
      setFollowingAction(false);
    }
  };

  const handleShare = () => {
    if (!pandit) return;
    if (navigator.share) {
      navigator.share({
        title: `${pandit.name} - Verified Vedic Pandit on Shubhdarshan`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Pandit profile link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian text-foreground py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-gold mb-4" />
        <p className="text-xs text-stone-400">Loading Vedic Acharya Profile...</p>
      </div>
    );
  }

  if (notFound || !pandit) {
    return (
      <div className="min-h-screen bg-obsidian text-foreground py-20 max-w-xl mx-auto px-4 text-center">
        <AlertCircle className="w-12 h-12 text-gold mx-auto mb-4" />
        <h1 className="font-serif text-2xl font-bold text-white mb-2">Pandit Profile Not Found</h1>
        <p className="text-xs text-stone-400 mb-6">
          The requested Pandit profile ID does not exist or has not yet completed Gurukul verification.
        </p>
        <Link
          href="/#pandits"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold transition shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Verified Pandits</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-obsidian text-foreground py-10 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back navigation */}
        <Link
          href="/#pandits"
          className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-gold-pale mb-6 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Verified Pandits</span>
        </Link>

        {/* Profile Header Card */}
        <div className="bg-obsidian-soft border border-gold/25 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden border-2 border-gold/40 shadow-xl shrink-0 bg-stone-900">
              <img src={pandit.image} alt={pandit.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            </div>

            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gold/15 text-gold border border-gold/30">
                  <VerifiedPanditBadge size={14} /> Gurukul Verified
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-900 border border-stone-800 text-stone-300">
                  <Sparkles className="w-3 h-3 text-gold" /> {pandit.experience}
                </span>
              </div>

              <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white tracking-tight">
                {pandit.name}
              </h1>
              <p className="text-xs sm:text-sm text-gold-pale font-medium">{pandit.title}</p>
              <p className="text-xs text-stone-400">{pandit.temple}</p>

              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed pt-2">
                {pandit.bio}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3">
                <button
                  onClick={toggleFollow}
                  disabled={followingAction}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition shadow-md ${
                    isFollowing
                      ? 'bg-stone-800 text-gold-pale border border-gold/40'
                      : 'bg-gold hover:bg-gold-deep text-obsidian shadow-gold/20'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>
                    {isFollowing ? 'Following' : 'Follow Pandit'} ({followerCount})
                  </span>
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-obsidian border border-gold/20 hover:bg-stone-900 text-stone-300 text-xs font-semibold transition"
                >
                  <Share2 className="w-3.5 h-3.5 text-gold-soft" />
                  <span>Share Profile</span>
                </button>
              </div>
            </div>
          </div>

          {/* Specialties & Languages */}
          <div className="mt-8 pt-6 border-t border-gold/15 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-bold text-gold uppercase tracking-wider block mb-2">Sacred Ritual Specialties</span>
              <div className="flex flex-wrap gap-1.5">
                {pandit.specialties.length > 0 ? (
                  pandit.specialties.map((s: string) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-lg bg-obsidian border border-gold/15 text-stone-200"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-stone-500 italic">Vedic Pooja &amp; Hawan</span>
                )}
              </div>
            </div>

            <div>
              <span className="font-bold text-gold uppercase tracking-wider block mb-2">Languages Spoken</span>
              <div className="flex flex-wrap gap-1.5">
                {pandit.languages.map((l: string) => (
                  <span
                    key={l}
                    className="px-2.5 py-1 rounded-lg bg-obsidian border border-gold/15 text-stone-200"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Ceremonies & Darshan Broadcasts */}
        <div className="space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-gold" />
            <span>Sacred Broadcasts &amp; Ceremonies</span>
          </h2>

          {pandit.upcoming.length === 0 ? (
            <div className="p-8 rounded-2xl bg-obsidian-soft border border-gold/15 text-center text-stone-400 text-xs">
              No live ceremonies currently scheduled for today. Follow this Pandit to receive notifications when a live broadcast begins.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pandit.upcoming.map((u: any) => (
                <div
                  key={u.id}
                  className="p-5 rounded-2xl bg-obsidian-soft border border-gold/20 shadow-lg flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold text-gold-soft bg-gold/10 px-2 py-0.5 rounded">
                        {u.category}
                      </span>
                      {u.isLive && (
                        <span className="text-[10px] font-bold text-red-400 flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> LIVE NOW
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">{u.title}</h3>
                    <p className="text-xs text-stone-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gold-soft" />
                      <span>{u.time}</span>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gold/10">
                    <Link
                      href={`/stream/${u.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold rounded-full transition shadow-md"
                    >
                      <span>Join Live Darshan</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
