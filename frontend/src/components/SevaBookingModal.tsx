'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  VerifiedPanditBadge,
  DiyaIcon,
  CoinIcon,
  PranamIcon,
} from '@/components/icons/SpiritualIcons';
import { useToast } from '@/components/Toast';
import {
  COMPREHENSIVE_POOJA_CATALOG,
  PANDIT_PRICING_CATALOG,
  PoojaItem,
  PanditPricing,
  getPanditDakshinaForPooja,
} from '@/data/poojaCatalog';

export interface BookingRecord {
  id: string;
  refCode: string;
  poojaId: string;
  poojaName: string;
  category: string;
  panditId: string;
  panditName: string;
  panditAvatar: string;
  panditTitle: string;
  dakshinaCoins: number;
  devoteeName: string;
  devoteeGotra: string;
  scheduledDate: string;
  timeSlot: string;
  sankalpIntent: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED';
  createdAt: string;
  confirmedTime?: string;
  roomLink?: string;
  declineReason?: string;
}

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
  const toast = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(() => (initialSevaId ? 2 : 1));
  const [user, setUser] = useState<{ id: string; name?: string; email?: string } | null>(null);

  // Form selections
  const [selectedSeva, setSelectedSeva] = useState<PoojaItem>(() => {
    const found = COMPREHENSIVE_POOJA_CATALOG.find((s) => s.id === initialSevaId);
    return found || COMPREHENSIVE_POOJA_CATALOG[0];
  });
  const [selectedPandit, setSelectedPandit] = useState<PanditPricing>(PANDIT_PRICING_CATALOG[0]);
  const [devoteeName, setDevoteeName] = useState('');
  const [devoteeGotra, setDevoteeGotra] = useState('');
  const [bookingDate, setBookingDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [timeSlot, setTimeSlot] = useState('Morning (07:00 AM – 09:00 AM IST)');
  const [sankalpIntent, setSankalpIntent] = useState('Family Health, Long Life & Healing');
  const [familyMembers, setFamilyMembers] = useState('');
  const [createdBooking, setCreatedBooking] = useState<BookingRecord | null>(null);

  // Calculate current pandit's custom dakshina for chosen pooja
  const currentDakshina = getPanditDakshinaForPooja(selectedPandit, selectedSeva);

  // Check devotee authentication status and restore pending draft if returning from login
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
            const s = COMPREHENSIVE_POOJA_CATALOG.find((item) => item.id === draft.sevaId);
            if (s) setSelectedSeva(s);
          }
          if (draft.panditId) {
            const p = PANDIT_PRICING_CATALOG.find((item) => item.panditId === draft.panditId);
            if (p) setSelectedPandit(p);
          }
          if (draft.date) setBookingDate(draft.date);
          if (draft.slot) setTimeSlot(draft.slot);
          if (draft.intent) setSankalpIntent(draft.intent);
          if (draft.gotra) setDevoteeGotra(draft.gotra);
          setStep(3);
          sessionStorage.removeItem('pending_seva_booking');
        }
      } catch (e) {
        setUser(null);
      }
    }
  }, [isOpen]);

  // Update selected pooja and step when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialSevaId) {
        const found = COMPREHENSIVE_POOJA_CATALOG.find((s) => s.id === initialSevaId);
        if (found) {
          setSelectedSeva(found);
          setStep(2); // User already selected their choice on the page, skip Step 1 and go straight to Step 2 (Choose Pandit)!
          return;
        }
      }
      setStep(1);
    }
  }, [isOpen, initialSevaId]);

  if (!isOpen) return null;

  const handleAuthRedirect = (target: '/login' | '/register') => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        'pending_seva_booking',
        JSON.stringify({
          sevaId: selectedSeva.id,
          panditId: selectedPandit.panditId,
          date: bookingDate,
          slot: timeSlot,
          intent: sankalpIntent,
          gotra: devoteeGotra,
        })
      );
      const returnPath = encodeURIComponent(`${window.location.pathname}?action=booking`);
      window.location.href = `${target}?redirect=${returnPath}`;
    }
  };

  const handleConfirmAndSendRequest = () => {
    if (!user) {
      toast.error('Please sign in or register to consecrate your live pooja.');
      return;
    }

    const refCode = `SHUBH-${Math.floor(100000 + Math.random() * 900000)}`;
    const newBooking: BookingRecord = {
      id: `booking-${Date.now()}`,
      refCode,
      poojaId: selectedSeva.id,
      poojaName: selectedSeva.name,
      category: selectedSeva.category,
      panditId: selectedPandit.panditId,
      panditName: selectedPandit.name,
      panditAvatar: selectedPandit.avatar,
      panditTitle: selectedPandit.title,
      dakshinaCoins: currentDakshina,
      devoteeName: devoteeName.trim(),
      devoteeGotra: devoteeGotra.trim() || 'Kashyap',
      scheduledDate: bookingDate,
      timeSlot,
      sankalpIntent,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      roomLink: `/join/invite`,
    };

    // Save to user bookings storage
    try {
      const existing = localStorage.getItem('shubhdarshan_bookings');
      const list: BookingRecord[] = existing ? JSON.parse(existing) : [];
      list.unshift(newBooking);
      localStorage.setItem('shubhdarshan_bookings', JSON.stringify(list));
    } catch (e) {
      console.warn('Booking storage fallback:', e);
    }

    setCreatedBooking(newBooking);
    setStep(4);
    toast.success('Pooja request transmitted to Panditji! Awaiting schedule confirmation.');
  };

  const handleResetAndClose = () => {
    setStep(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-obsidian-soft border border-gold/30 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gold/15 flex items-center justify-between bg-gradient-to-r from-obsidian via-obsidian-soft to-obsidian">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center shadow-inner">
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
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="px-6 py-2.5 bg-obsidian border-b border-gold/10 flex items-center justify-between text-xs overflow-x-auto no-scrollbar">
          <span className={`font-semibold shrink-0 ${step >= 1 ? 'text-gold' : 'text-stone-500'}`}>
            1. Select Pooja
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-600 shrink-0" />
          <span className={`font-semibold shrink-0 ${step >= 2 ? 'text-gold' : 'text-stone-500'}`}>
            2. Choose Pandit &amp; Dakshina
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-600 shrink-0" />
          <span className={`font-semibold shrink-0 ${step >= 3 ? 'text-gold' : 'text-stone-500'}`}>
            3. Devotee Sankalp
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-600 shrink-0" />
          <span className={`font-semibold shrink-0 ${step >= 4 ? 'text-gold' : 'text-stone-500'}`}>
            4. Pandit Status
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: SELECT POOJA */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-white">
                    Step 1: Choose Your Sacred Ritual or Consultation
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Select a personalized Vedic pooja, katha, or astrological guidance
                  </p>
                </div>
                <Link
                  href="/pooja"
                  onClick={onClose}
                  className="text-xs text-gold-pale hover:underline font-semibold flex items-center gap-1 shrink-0"
                >
                  View full catalog ({COMPREHENSIVE_POOJA_CATALOG.length}) <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {COMPREHENSIVE_POOJA_CATALOG.slice(0, 10).map((pooja) => {
                  const isSelected = selectedSeva.id === pooja.id;
                  return (
                    <div
                      key={pooja.id}
                      onClick={() => {
                        setSelectedSeva(pooja);
                        setStep(2);
                      }}
                      className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gold/15 border-gold shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                          : 'bg-obsidian border-gold/15 hover:border-gold/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gold-pale bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">
                            {pooja.tag}
                          </span>
                          <span className="text-[11px] text-stone-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gold-soft" />
                            {pooja.duration}
                          </span>
                        </div>
                        <h4 className="font-serif text-sm font-bold text-white leading-snug">
                          {pooja.name}
                        </h4>
                        <p className="text-[11px] text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                          {pooja.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-stone-800/80 flex items-center justify-between text-xs">
                        <span className="text-stone-400 text-[10px]">Starting Dakshina:</span>
                        <span className="font-bold text-gold-pale flex items-center gap-1">
                          <CoinIcon size={12} /> {pooja.baseDakshina} Coins
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-center pt-1">
                <Link
                  href="/pooja"
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-xs text-gold hover:underline font-semibold"
                >
                  Want more choices? Browse all 24+ Poojas, Kathas &amp; Yagyas in our Full Catalog &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* STEP 2: CHOOSE PANDIT WITH SPECIFIC PRICING */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gold/10">
                <div>
                  <h3 className="font-serif text-base font-bold text-white">
                    Step 2: Choose Your Gurukul-Verified Vedic Pandit
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <p className="text-xs text-stone-400">
                      Selected Ritual: <strong className="text-gold-pale">{selectedSeva.name}</strong> ({selectedSeva.duration})
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-[11px] font-bold text-gold hover:underline bg-gold/10 px-2 py-0.5 rounded-full border border-gold/25"
                    >
                      Change Pooja
                    </button>
                  </div>
                </div>
                <span className="text-xs text-gold-soft bg-gold/10 px-3 py-1 rounded-full border border-gold/20 self-start sm:self-auto">
                  Transparent Dakshina
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {PANDIT_PRICING_CATALOG.map((pandit) => {
                  const isSelected = selectedPandit.panditId === pandit.panditId;
                  const panditDakshina = getPanditDakshinaForPooja(pandit, selectedSeva);

                  return (
                    <div
                      key={pandit.panditId}
                      onClick={() => setSelectedPandit(pandit)}
                      className={`cursor-pointer rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gold/15 border-gold shadow-[0_0_24px_rgba(245,158,11,0.25)] ring-1 ring-gold'
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
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-1.5 font-serif font-bold text-white text-sm">
                              <span className="truncate">{pandit.name}</span>
                              <VerifiedPanditBadge size={14} />
                            </div>
                          </div>
                          <p className="text-[11px] text-gold-soft font-medium leading-tight mb-1 truncate">
                            {pandit.title}
                          </p>
                          <p className="text-[10px] text-stone-400 truncate mb-2">
                            {pandit.gurukul}
                          </p>

                          <div className="flex flex-wrap gap-1">
                            <span className="text-[9px] font-semibold text-stone-300 bg-obsidian-soft border border-stone-800 px-1.5 py-0.5 rounded">
                              {pandit.experience}
                            </span>
                            <span className="text-[9px] font-semibold text-gold-pale bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded">
                              ★ {pandit.rating} ({pandit.reviewsCount})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Pandit's Specific Price for this Pooja */}
                      <div className="mt-4 pt-2.5 border-t border-stone-800 flex items-center justify-between text-xs">
                        <span className="text-stone-400 text-[11px]">Pandit Dakshina:</span>
                        <div className="text-right">
                          <span className="font-bold text-gold-pale flex items-center gap-1">
                            <CoinIcon size={13} /> {panditDakshina} Coins
                          </span>
                          <span className="text-[10px] text-stone-400 font-normal block">
                            (~₹{panditDakshina * 5})
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: DEVOTEE SANKALP & AUTH GATE (OPTION A) */}
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
                      Sign in or claim your <strong className="text-gold-pale">100 Free Welcome Coins</strong> to consecrate your Gotra and send your live pooja booking request to <strong className="text-gold-pale">{selectedPandit.name}</strong>.
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
                    Your selected ritual ({selectedSeva.name}) with {selectedPandit.name} ({currentDakshina} Coins) will be preserved automatically upon sign-in.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-gold/10 border border-gold/25 text-xs">
                    <div className="flex items-center gap-2 text-stone-200">
                      <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
                      <span>
                        Booking as <strong className="text-white">{user.name || user.email}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-gold-pale bg-gold/20 px-2.5 py-0.5 rounded-full border border-gold/30">
                      Devotee Verified
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif text-base font-bold text-white">
                      Step 3: Devotee &amp; Sacred Sankalp Details
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {selectedPandit.name} will invoke these sacred details during the live chanting and Swasti Vachan.
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
                        Gotra (Vedic Lineage) *
                      </label>
                      <input
                        type="text"
                        required
                        value={devoteeGotra}
                        onChange={(e) => setDevoteeGotra(e.target.value)}
                        placeholder="e.g. Kashyap, Bharadwaj, Vatsa (or 'Kashyap')"
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

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Family Members to Invoke (Optional)
                    </label>
                    <input
                      type="text"
                      value={familyMembers}
                      onChange={(e) => setFamilyMembers(e.target.value)}
                      placeholder="e.g. Suman Sharma (Wife), Aarav (Son)"
                      className="w-full px-3.5 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-gold"
                    />
                  </div>

                  {/* Summary Bar */}
                  <div className="rounded-2xl bg-obsidian p-4 border border-gold/20 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[11px] text-stone-400">Selected Pooja &amp; Pandit:</p>
                      <p className="font-bold text-white mt-0.5">
                        {selectedSeva.name} • <span className="text-gold-pale">{selectedPandit.name}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 block font-semibold">Total Dakshina</span>
                      <span className="font-mono font-bold text-gold-pale text-sm flex items-center gap-1 justify-end">
                        <CoinIcon size={13} /> {currentDakshina} Coins
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 4: REQUEST SENT TO POOJARI (PENDING APPROVAL) */}
          {step === 4 && createdBooking && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto shadow-[0_0_30px_rgba(245,158,11,0.25)] animate-pulse">
                <DiyaIcon size={32} />
              </div>

              <div className="space-y-1.5">
                <span className="modal-status-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm">
                  <Clock className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>Awaiting Panditji&apos;s Schedule Confirmation</span>
                </span>
                <h3 className="modal-value font-serif text-2xl font-bold mt-2">
                  Pooja Request Transmitted to Poojari!
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 max-w-md mx-auto leading-relaxed">
                Your request for <strong className="modal-value font-bold">{createdBooking.poojaName}</strong> has been sent to{' '}
                <strong className="modal-gold-value font-bold">{createdBooking.panditName}</strong>. Panditji will verify his sanctum schedule and confirm your broadcast within 2 hours.
              </p>

              {/* Booking Reference Details */}
              <div className="modal-detail-card rounded-2xl border p-5 max-w-md mx-auto text-left space-y-2 text-xs shadow-inner">
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-stone-800">
                  <span className="modal-label font-medium">Booking Reference:</span>
                  <span className="modal-gold-value font-mono font-bold">{createdBooking.refCode}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-stone-800">
                  <span className="modal-label font-medium">Pooja / Seva:</span>
                  <span className="modal-value font-semibold">{createdBooking.poojaName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-stone-800">
                  <span className="modal-label font-medium">Requested Pandit:</span>
                  <span className="modal-value font-semibold">{createdBooking.panditName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-stone-800">
                  <span className="modal-label font-medium">Auspicious Date &amp; Slot:</span>
                  <span className="modal-value font-semibold">{createdBooking.scheduledDate} • {createdBooking.timeSlot}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-stone-800">
                  <span className="modal-label font-medium">Yajman Gotra:</span>
                  <span className="modal-value font-semibold">
                    {createdBooking.devoteeGotra} Gotra • {createdBooking.devoteeName}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="modal-label font-medium">Dakshina:</span>
                  <span className="modal-gold-value font-bold flex items-center gap-1">
                    <CoinIcon size={12} /> {createdBooking.dakshinaCoins} Coins
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/account#bookings"
                  onClick={handleResetAndClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-gold hover:bg-gold-deep text-obsidian font-bold text-xs shadow-lg transition flex items-center justify-center gap-1.5"
                >
                  <User className="w-4 h-4" />
                  <span>View in My Devotee Profile</span>
                </Link>
                <button
                  onClick={handleResetAndClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-stone-700 hover:border-gold/40 text-stone-300 hover:text-white font-semibold text-xs transition"
                >
                  Return to Home
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
                onClick={handleConfirmAndSendRequest}
                disabled={!devoteeName}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-md ${
                  devoteeName
                    ? 'bg-gold hover:bg-gold-deep text-obsidian shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                    : 'bg-stone-800 text-stone-500 cursor-not-allowed'
                }`}
              >
                <DiyaIcon size={14} />
                <span>Send Booking Request to Panditji</span>
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
