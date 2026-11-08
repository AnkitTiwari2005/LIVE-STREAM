'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  User,
  Heart,
  Video,
  Lock,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { VerifiedPanditBadge, DiyaIcon, CoinIcon } from '@/components/icons/SpiritualIcons';
import { useToast } from '@/components/Toast';

export interface SevaOption {
  id: string;
  name: string;
  category: string;
  duration: string;
  dakshinaSuggested: number; // in coins
  description: string;
}

export interface PanditOption {
  id: string;
  name: string;
  title: string;
  experience: string;
  specialties: string[];
  avatar: string;
}

export const SEVA_CATALOG: SevaOption[] = [
  {
    id: 'rudrabhishek',
    name: 'Maha Rudrabhishek & Swasti Vachan',
    category: 'Pooja',
    duration: '45 mins',
    dakshinaSuggested: 150,
    description: 'Panchamrit Abhishek with resonant Rudra Sukta recitation for health, peace, and overcoming obstacles.',
  },
  {
    id: 'navgrah',
    name: 'Navgrah Shanti & Dosh Nivaran',
    category: 'Astrology & Kundli',
    duration: '40 mins',
    dakshinaSuggested: 125,
    description: 'Auspicious oblations to pacify unfavorable planetary transits and establish harmony.',
  },
  {
    id: 'kundli_astrology',
    name: 'Personal Vedic Kundli Consultation',
    category: 'Vedic Guidance',
    duration: '30 mins',
    dakshinaSuggested: 100,
    description: '1-on-1 private astrological chart reading, Dasha analysis, and practical Vedic remedies.',
  },
  {
    id: 'family_sankalp',
    name: 'Personalized Family Sankalp & Chanting',
    category: 'Family Seva',
    duration: '30 mins',
    dakshinaSuggested: 75,
    description: 'Special Gotra-Naam chanting invoking divine blessings for family well-being and prosperity.',
  },
  {
    id: 'vastu_griha',
    name: 'Vastu & Griha Pravesh Swasti Pooja',
    category: 'Vastu',
    duration: '50 mins',
    dakshinaSuggested: 200,
    description: 'Harmonize cosmic energy flows across your home or workspace with Vedic consecration.',
  },
  {
    id: 'mahamrityunjaya',
    name: 'Mahamrityunjaya Jaap & Healing Mantra',
    category: 'Pooja',
    duration: '45 mins',
    dakshinaSuggested: 150,
    description: 'Potent Vedic mantra chanting dedicated to Bhagwan Shiva for recovery, vitality, and longevity.',
  },
];

export const PANDIT_CATALOG: PanditOption[] = [
  {
    id: '73b080c9-8bfb-41e6-8c5a-dba40c9409c5',
    name: 'Pandit Aarav Sharma',
    title: 'Varanasi Gurukul Parampara',
    experience: '15+ Years',
    specialties: ['Rudrabhishek', 'Vedic Pooja', 'Kundli Matching'],
    avatar: '/images/photo-1543934776-32d1cc654abb.webp',
  },
  {
    id: '8cfb4f7f-f337-4475-8885-d0d91ae0939e',
    name: 'Acharya Devrat Sharma',
    title: 'Shukla Yajurveda Acharya',
    experience: '18+ Years',
    specialties: ['Navgrah Shanti', 'Karmakand', 'Horoscope Analysis'],
    avatar: '/images/photo-1762838105804-c3264c29a390.webp',
  },
  {
    id: 'pandit_vyas',
    name: 'Pandit Hariram Vyas',
    title: 'Prayagraj Tirth Purohit',
    experience: '20+ Years',
    specialties: ['Family Sankalp', 'Ganga Aarti', 'Vastu'],
    avatar: '/images/photo-1544186196-6908a9d76ab3.webp',
  },
  {
    id: 'pandit_bhatt',
    name: 'Pandit Vishwanath Bhatt',
    title: 'Mahakal Ujjain Ved Vidyalaya',
    experience: '14+ Years',
    specialties: ['Mahamrityunjaya', 'Rudrabhishek', 'Numerology'],
    avatar: '/images/photo-1596604820148-da737958af16.webp',
  },
];

interface SevaBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSevaId?: string;
}

export default function SevaBookingModal({
  isOpen,
  onClose,
  initialSevaId,
}: SevaBookingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const toast = useToast();
  const [user, setUser] = useState<{ id: string; name?: string; email?: string } | null>(null);

  // Check devotee authentication status and restore pending bookings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('pooja_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          if (!devoteeName) {
            setDevoteeName(parsed.name || parsed.fullName || parsed.email?.split('@')[0] || '');
          }
        } else {
          setUser(null);
        }

        // Restore pending draft if user just signed in
        const pending = sessionStorage.getItem('pending_seva_booking');
        if (pending && isOpen) {
          const draft = JSON.parse(pending);
          if (draft.sevaId) {
            const s = SEVA_CATALOG.find((item) => item.id === draft.sevaId);
            if (s) setSelectedSeva(s);
          }
          if (draft.panditId) {
            const p = PANDIT_CATALOG.find((item) => item.id === draft.panditId);
            if (p) setSelectedPandit(p);
          }
          if (draft.date) setBookingDate(draft.date);
          if (draft.slot) setTimeSlot(draft.slot);
          if (draft.intent) setSankalpIntent(draft.intent);
          setStep(3);
          sessionStorage.removeItem('pending_seva_booking');
        }
      } catch (e) {
        setUser(null);
      }
    }
  }, [isOpen]);

  // Form selections
  const [selectedSeva, setSelectedSeva] = useState<SevaOption>(() => {
    const found = SEVA_CATALOG.find((s) => s.id === initialSevaId);
    return found || SEVA_CATALOG[0];
  });
  const [selectedPandit, setSelectedPandit] = useState<PanditOption>(PANDIT_CATALOG[0]);
  const [devoteeName, setDevoteeName] = useState('');
  const [devoteeGotra, setDevoteeGotra] = useState('');
  const [bookingDate, setBookingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState('Morning (07:00 AM – 09:00 AM IST)');
  const [sankalpIntent, setSankalpIntent] = useState('Family Health & Prosperity');
  const [bookingRef, setBookingRef] = useState('');

  if (!isOpen) return null;

  const handleAuthRedirect = (target: '/login' | '/register') => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        'pending_seva_booking',
        JSON.stringify({
          sevaId: selectedSeva.id,
          panditId: selectedPandit.id,
          date: bookingDate,
          slot: timeSlot,
          intent: sankalpIntent,
        })
      );
      const returnPath = encodeURIComponent(`${window.location.pathname}?action=booking`);
      window.location.href = `${target}?redirect=${returnPath}`;
    }
  };

  const handleConfirmBooking = () => {
    if (!user) {
      toast.error('Please sign in or register to consecrate your live pooja.');
      return;
    }
    const refCode = `SHUBH-${Math.floor(100000 + Math.random() * 900000)}`;
    setBookingRef(refCode);
    setStep(4);
    toast.success('Sankalp registered successfully! Sacred details transmitted to Panditji.');
  };

  const handleResetAndClose = () => {
    setStep(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="relative w-full max-w-2xl rounded-3xl bg-obsidian-soft border border-gold/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gold/15 flex items-center justify-between bg-gradient-to-r from-obsidian via-obsidian-soft to-obsidian">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center">
              <img src="/logo.png" alt="Shubhdarshan" className="w-7 h-7 object-contain drop-shadow" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-soft">
                Sacred Seva Booking
              </p>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-white">
                Book a Live Vedic Pooja Session
              </h2>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="rounded-full p-2 text-stone-400 hover:text-white hover:bg-gold/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="px-6 py-2.5 bg-obsidian border-b border-gold/10 flex items-center justify-between text-xs">
          <span className={`font-semibold ${step >= 1 ? 'text-gold' : 'text-stone-500'}`}>
            1. Select Seva
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
          <span className={`font-semibold ${step >= 2 ? 'text-gold' : 'text-stone-500'}`}>
            2. Choose Pandit
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
          <span className={`font-semibold ${step >= 3 ? 'text-gold' : 'text-stone-500'}`}>
            3. Devotee Sankalp
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
          <span className={`font-semibold ${step >= 4 ? 'text-gold' : 'text-stone-500'}`}>
            4. Confirmation
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: SELECT SEVA */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-white">
                  Step 1: Choose Your Sacred Ritual or Consultation
                </h3>
                <span className="text-xs text-gold-soft">{SEVA_CATALOG.length} Sevas Available</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {SEVA_CATALOG.map((seva) => {
                  const isSelected = selectedSeva.id === seva.id;
                  return (
                    <div
                      key={seva.id}
                      onClick={() => setSelectedSeva(seva)}
                      className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                        isSelected
                          ? 'bg-gold/15 border-gold shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                          : 'bg-obsidian border-gold/15 hover:border-gold/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gold-pale bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">
                          {seva.category}
                        </span>
                        <span className="text-[11px] font-semibold text-stone-300">
                          {seva.duration}
                        </span>
                      </div>
                      <h4 className="font-serif text-sm font-bold text-white mb-1">
                        {seva.name}
                      </h4>
                      <p className="text-[11px] text-stone-400 leading-snug line-clamp-2">
                        {seva.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: CHOOSE PANDIT */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-white">
                  Step 2: Select Your Gurukul-Verified Vedic Pandit
                </h3>
                <span className="text-xs text-gold-soft">All 100% Verified</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {PANDIT_CATALOG.map((pandit) => {
                  const isSelected = selectedPandit.id === pandit.id;
                  return (
                    <div
                      key={pandit.id}
                      onClick={() => setSelectedPandit(pandit)}
                      className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gold/15 border-gold shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                          : 'bg-obsidian border-gold/15 hover:border-gold/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={pandit.avatar}
                          alt={pandit.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/photo-1543934776-32d1cc654abb.webp';
                          }}
                          className="w-12 h-12 rounded-full object-cover border border-gold/30 shrink-0 shadow-md"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5 font-serif font-bold text-white text-sm">
                              <span className="truncate">{pandit.name}</span>
                              <VerifiedPanditBadge size={14} />
                            </div>
                            <span className="text-[10px] font-bold text-gold-pale bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20 shrink-0">
                              {pandit.experience}
                            </span>
                          </div>
                          <p className="text-[11px] text-gold-soft font-medium mb-2 truncate">
                            {pandit.title}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {pandit.specialties.map((spec) => (
                              <span
                                key={spec}
                                className="text-[9px] font-semibold text-stone-300 bg-obsidian-soft border border-stone-800 px-1.5 py-0.5 rounded"
                              >
                                {spec}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: DEVOTEE SANKALP DETAILS */}
          {step === 3 && (
            <div className="space-y-4">
              {!user ? (
                <div className="rounded-2xl bg-obsidian border border-gold/30 p-6 sm:p-8 text-center space-y-4 shadow-xl">
                  <div className="w-14 h-14 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center text-gold mx-auto shadow-[0_0_24px_rgba(245,158,11,0.25)]">
                    <DiyaIcon size={26} />
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-gold-soft">
                      Consecrate Your Gotra &amp; Sankalp
                    </span>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                      Devotee Sign-in Required
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                      Sign in or claim your <strong className="text-gold-pale">100 Free Welcome Coins</strong> to consecrate your Gotra and confirm your live pooja session with <strong className="text-gold-pale">{selectedPandit.name}</strong>.
                    </p>
                  </div>

                  {/* 100 Free Coins Pill */}
                  <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1 text-xs font-semibold text-gold-pale">
                    <Sparkles className="w-3.5 h-3.5 text-gold" />
                    <span>100 Free Coins credited instantly on registration</span>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={() => handleAuthRedirect('/login')}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-gold/40 bg-obsidian-soft hover:bg-gold/10 text-gold-pale font-bold text-xs transition flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-4 h-4 text-gold" />
                      <span>Sign In to Account</span>
                    </button>
                    <button
                      onClick={() => handleAuthRedirect('/register')}
                      className="w-full sm:w-auto px-7 py-2.5 rounded-full bg-gold hover:bg-gold-deep text-obsidian font-bold text-xs shadow-lg transition flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Register &amp; Claim 100 Coins</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-stone-400 italic">
                    Your selected ritual ({selectedSeva.name}) with {selectedPandit.name} will be preserved automatically upon sign-in.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-gold/10 border border-gold/25 text-xs">
                    <div className="flex items-center gap-2 text-stone-200">
                      <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
                      <span>
                        Consecrating as <strong className="text-white">{user.name || user.email}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-gold-pale bg-gold/20 px-2 py-0.5 rounded-full border border-gold/30">
                      Devotee Verified
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif text-base font-bold text-white">
                      Step 3: Devotee &amp; Sacred Sankalp Details
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      The Pandit will invoke these sacred details during the live chanting and Swasti Vachan.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">
                        Yajman (Devotee) Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={devoteeName}
                        onChange={(e) => setDevoteeName(e.target.value)}
                        placeholder="e.g. Ramesh Chandra Sharma"
                        className="w-full px-3.5 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">
                        Gotra (Vedic Lineage)
                      </label>
                      <input
                        type="text"
                        value={devoteeGotra}
                        onChange={(e) => setDevoteeGotra(e.target.value)}
                        placeholder="e.g. Kashyap, Bharadwaj (or 'Kashyap')"
                        className="w-full px-3.5 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">
                        Preferred Auspicious Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs sm:text-sm text-white focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">
                        Preferred Time Slot *
                      </label>
                      <select
                        value={timeSlot}
                        onChange={(e) => setTimeSlot(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs sm:text-sm text-white focus:outline-none focus:border-gold"
                      >
                        <option>Morning (07:00 AM – 09:00 AM IST)</option>
                        <option>Madhyahna (11:30 AM – 01:00 PM IST)</option>
                        <option>Sandhya (06:00 PM – 08:00 PM IST)</option>
                        <option>Night (08:30 PM – 10:00 PM IST)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Sankalp / Prayer Intention
                    </label>
                    <select
                      value={sankalpIntent}
                      onChange={(e) => setSankalpIntent(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs sm:text-sm text-white focus:outline-none focus:border-gold"
                    >
                      <option>Family Health, Long Life &amp; Healing</option>
                      <option>Peace, Harmony &amp; Removal of Domestic Obstacles</option>
                      <option>Business Growth, Career &amp; Financial Abundance</option>
                      <option>Planetary Dosh Nivaran &amp; Shanti</option>
                      <option>Child Education &amp; Saraswati Blessing</option>
                      <option>Ancestral Pitru Tarpana &amp; Swasti</option>
                    </select>
                  </div>
                </>
              )}

              {/* Summary Pill */}
              <div className="rounded-2xl bg-obsidian p-4 border border-gold/20 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-stone-400">Selected Seva &amp; Pandit:</p>
                  <p className="text-xs font-bold text-white mt-0.5">
                    {selectedSeva.name} • <span className="text-gold-pale">{selectedPandit.name}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gold-pale bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">
                    Live Session
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: CONFIRMATION */}
          {step === 4 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_30px_rgba(16,185,129,0.25)]">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="font-serif text-2xl font-bold text-white">
                Sankalp Registered Successfully!
              </h3>
              <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto leading-relaxed">
                Your live pooja request has been transmitted to{' '}
                <strong className="text-gold-pale">{selectedPandit.name}</strong>. You will receive an email confirmation and live room link prior to the broadcast.
              </p>

              <div className="rounded-2xl bg-obsidian border border-gold/25 p-5 max-w-md mx-auto text-left space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-stone-800">
                  <span className="text-stone-400">Booking Reference:</span>
                  <span className="font-mono font-bold text-gold-pale">{bookingRef}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-800">
                  <span className="text-stone-400">Pooja / Seva:</span>
                  <span className="font-semibold text-white">{selectedSeva.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-800">
                  <span className="text-stone-400">Assigned Pandit:</span>
                  <span className="font-semibold text-white">{selectedPandit.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-800">
                  <span className="text-stone-400">Scheduled Date &amp; Slot:</span>
                  <span className="font-semibold text-white">{bookingDate} • {timeSlot.split(' ')[0]}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-stone-400">Yajman Gotra &amp; Name:</span>
                  <span className="font-semibold text-white">
                    {devoteeGotra ? `${devoteeGotra} Gotra • ` : ''}{devoteeName || 'Devotee'}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={handleResetAndClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-gold hover:bg-gold-deep text-obsidian font-bold text-xs shadow-lg transition"
                >
                  Return to Live Platform
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        {step < 4 && (
          <div className="p-4 px-6 border-t border-gold/15 bg-obsidian flex items-center justify-between">
            {step > 1 ? (
              <button
                onClick={() => setStep((s) => (s - 1) as any)}
                className="px-4 py-2 rounded-full border border-stone-700 text-stone-300 hover:text-white text-xs font-semibold transition"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep((s) => (s + 1) as any)}
                className="px-6 py-2 rounded-full bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold transition flex items-center gap-1.5 shadow-md"
              >
                <span>Continue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : user ? (
              <button
                onClick={handleConfirmBooking}
                disabled={!devoteeName}
                className={`px-6 py-2 rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-md ${
                  devoteeName
                    ? 'bg-gold hover:bg-gold-deep text-obsidian'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <DiyaIcon size={14} />
                <span>Confirm &amp; Register Sankalp</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAuthRedirect('/login')}
                  className="px-4 py-2 rounded-full border border-gold/40 text-gold-pale hover:bg-gold/10 text-xs font-bold transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleAuthRedirect('/register')}
                  className="px-5 py-2 rounded-full bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                >
                  <DiyaIcon size={13} />
                  <span>Register Free</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
