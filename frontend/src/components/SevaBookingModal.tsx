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
import { SpecialPanditBadge } from '@/components/SpecialPanditBadge';
import { useToast } from '@/components/Toast';
import { decodeJwtClaims } from '@/lib/auth-session';
import {
  COMPREHENSIVE_POOJA_CATALOG,
  PANDIT_PRICING_CATALOG,
  PoojaItem,
  PanditPricing,
  getPanditDakshinaForPooja,
  getLocalizedPooja,
  getLocalizedPanditPricing,
} from '@/data/poojaCatalog';
import { formatInrFromCoins } from '@/lib/economy';
import { useLang } from '@/lib/i18n/context';
import { formatCoins } from '@/lib/i18n/format';

const BOOKINGS_ENABLED = process.env.NEXT_PUBLIC_BOOKINGS_ENABLED === 'true';

const TIME_SLOT_OPTIONS = [
  { value: 'Morning (07:00 AM – 09:00 AM IST)', en: 'Morning (07:00 AM – 09:00 AM IST)', hi: 'प्रातःकाल (07:00 AM – 09:00 AM IST)' },
  { value: 'Madhyahna (11:30 AM – 01:00 PM IST)', en: 'Madhyahna (11:30 AM – 01:00 PM IST)', hi: 'मध्याह्न (11:30 AM – 01:00 PM IST)' },
  { value: 'Sandhya (06:00 PM – 08:00 PM IST)', en: 'Sandhya (06:00 PM – 08:00 PM IST)', hi: 'संध्या (06:00 PM – 08:00 PM IST)' },
  { value: 'Night (08:30 PM – 10:00 PM IST)', en: 'Night (08:30 PM – 10:00 PM IST)', hi: 'रात्रि (08:30 PM – 10:00 PM IST)' },
];

const SANKALP_INTENT_OPTIONS = [
  { value: 'Family Health, Long Life & Healing', en: 'Family Health, Long Life & Healing', hi: 'पारिवारिक स्वास्थ्य, दीर्घायु एवं आरोग्य' },
  { value: 'Peace, Harmony & Removal of Domestic Obstacles', en: 'Peace, Harmony & Removal of Domestic Obstacles', hi: 'गृह शांति, सद्भाव एवं बाधा निवारण' },
  { value: 'Business Growth, Career & Financial Abundance', en: 'Business Growth, Career & Financial Abundance', hi: 'व्यापार वृद्धि, करियर एवं आर्थिक समृद्धि' },
  { value: 'Planetary Dosh Nivaran & Shanti', en: 'Planetary Dosh Nivaran & Shanti', hi: 'ग्रह दोष निवारण एवं शांति' },
  { value: 'Child Education & Saraswati Blessing', en: 'Child Education & Saraswati Blessing', hi: 'संतान शिक्षा एवं सरस्वती कृपा' },
  { value: 'Ancestral Pitru Tarpana & Swasti', en: 'Ancestral Pitru Tarpana & Swasti', hi: 'पितृ तर्पण एवं स्वस्ति कामना' },
];

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
  initialPanditId?: string;
}

export default function SevaBookingModal(props: SevaBookingModalProps) {
  const { lang } = useLang();
  const L = (en: string, hi: string) => (lang === 'hi' ? hi : en);

  if (BOOKINGS_ENABLED) {
    return <SevaBookingFlow {...props} />;
  }
  if (!props.isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
      onClick={props.onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="seva-coming-soon-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/30 p-6 sm:p-8 shadow-2xl text-center space-y-4"
      >
        <button
          type="button"
          onClick={props.onClose}
          className="rounded-full p-2 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-gold/10 transition absolute top-4 right-4"
          aria-label={L('Close', 'बंद करें')}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto">
          <DiyaIcon size={28} />
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-800 dark:text-gold-soft">
            {L('Launching Soon', 'शीघ्र आरंभ')}
          </p>
          <h2 id="seva-coming-soon-title" className="font-serif text-xl sm:text-2xl font-bold text-stone-900 dark:text-white">
            {L('Private Pooja Booking — Coming Soon', 'निजी पूजा बुकिंग — शीघ्र आ रही है')}
          </h2>
        </div>

        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
          {L(
            'Private 1-on-1 Pandit Ji booking and custom sankalp scheduling is not yet live. Browse our upcoming live broadcasts and join a ceremony from the daily schedule.',
            'निजी 1-पर-1 पंडित जी बुकिंग एवं कस्टम संकल्प शेड्यूलिंग अभी लाइव नहीं है। हमारी आगामी लाइव प्रसारण सूची देखें और दैनिक समय-सारिणी से अनुष्ठान में जुड़ें।',
          )}
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/schedule"
            onClick={props.onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-gold hover:bg-gold-deep text-obsidian font-bold text-xs shadow-md transition inline-flex items-center justify-center gap-1.5"
          >
            <Calendar className="w-4 h-4" />
            <span>{L('View Live Schedule', 'लाइव समय-सारिणी देखें')}</span>
          </Link>
          <button
            type="button"
            onClick={props.onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold text-xs transition"
          >
            {L('Close', 'बंद करें')}
          </button>
        </div>
      </div>
    </div>
  );
}

function SevaBookingFlow({
  isOpen,
  onClose,
  initialSevaId,
  initialPanditId,
}: SevaBookingModalProps) {
  const toast = useToast();
  const { lang } = useLang();
  const L = (en: string, hi: string) => (lang === 'hi' ? hi : en);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(() => (initialSevaId ? 2 : 1));
  const [user, setUser] = useState<{ id: string; name?: string; email?: string } | null>(null);

  // Form selections
  const [selectedSeva, setSelectedSeva] = useState<PoojaItem>(() => {
    const found = COMPREHENSIVE_POOJA_CATALOG.find((s) => s.id === initialSevaId);
    return found || COMPREHENSIVE_POOJA_CATALOG[0];
  });
  const [selectedPandit, setSelectedPandit] = useState<PanditPricing>(() => {
    if (initialPanditId) {
      const found = PANDIT_PRICING_CATALOG.find(
        (p) =>
          p.panditId === initialPanditId ||
          p.name.toLowerCase().includes(initialPanditId.toLowerCase()) ||
          (initialPanditId === 'rohit-tiwari' && p.name.includes('रोहित')) ||
          (initialPanditId === 'santosh-shastri' && p.name.includes('संतोष')) ||
          (initialPanditId === 'ravi-pathak' && p.name.includes('रवि')) ||
          (initialPanditId === 'nitin-sharma' && p.name.includes('नितिन')) ||
          (initialPanditId === 'umesh-shastri' && p.name.includes('उमेश')) ||
          (initialPanditId === 'kuber-tripathi' && p.name.includes('कुबेर')) ||
          (initialPanditId === 'subhash-shastri' && p.name.includes('सुभाष'))
      );
      if (found) return found;
    }
    return PANDIT_PRICING_CATALOG[0];
  });
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
  const localizedSelectedSeva = getLocalizedPooja(selectedSeva, lang);
  const localizedSelectedPandit = getLocalizedPanditPricing(selectedPandit, lang);

  // Check devotee authentication status and restore pending draft if returning from login
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('pooja_user');
        const storedToken = localStorage.getItem('pooja_token');
        const claims = decodeJwtClaims(storedToken);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!claims?.sub || parsed.id === claims.sub) {
            setUser(parsed);
            setDevoteeName(parsed.name || parsed.fullName || parsed.email?.split('@')[0] || '');
          } else {
            setUser(null);
            setDevoteeName('');
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

  const handleConfirmAndSendRequest = async () => {
    if (!user) {
      toast.error(L('Please sign in or register to consecrate your live pooja.', 'अपनी लाइव पूजा का संकल्प लेने के लिए कृपया साइन इन या रजिस्टर करें।'));
      return;
    }

    if (BOOKINGS_ENABLED) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('pooja_token') : null;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      try {
        const res = await fetch(`${apiUrl}/pooja-bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({
            panditIdOrSlug: selectedPandit.panditId,
            poojaId: selectedSeva.id,
            poojaName: selectedSeva.name,
            category: selectedSeva.category,
            dakshinaCoins: currentDakshina,
            devoteeName: devoteeName.trim(),
            devoteeGotra: devoteeGotra.trim() || 'Kashyap',
            scheduledDate: bookingDate,
            timeSlot,
            sankalpIntent,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.message || L('Unable to submit pooja booking request.', 'पूजा बुकिंग अनुरोध सबमिट नहीं हो सका।'));
          return;
        }
        setCreatedBooking(data);
        setStep(4);
        toast.success(L('Pooja request sent to Pandit Ji. Check My Booked Poojas for confirmation.', 'पंडित जी को पूजा अनुरोध भेज दिया गया है। पुष्टि के लिए मेरी बुक की गई पूजा देखें।'));
        return;
      } catch {
        toast.error(L('Network error while submitting pooja booking request.', 'पूजा बुकिंग अनुरोध भेजते समय नेटवर्क त्रुटि हुई।'));
        return;
      }
    }

    const refCode = `PD-${Math.floor(100000 + Math.random() * 900000)}`;
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

    // Bug #1 fix: Save to per-user scoped bookings key so each account has its own booking list
    try {
      const userId = user?.id || 'guest';
      const bookingKey = `paramdarshan_bookings_${userId}`;
      const legacyKey = `shubhdarshan_bookings_${userId}`;
      const existing = localStorage.getItem(bookingKey) ?? localStorage.getItem(legacyKey);
      const list: BookingRecord[] = existing ? JSON.parse(existing) : [];
      list.unshift(newBooking);
      localStorage.setItem(bookingKey, JSON.stringify(list));
    } catch (e) {
      console.warn('Booking storage fallback:', e);
    }

    setCreatedBooking(newBooking);
    setStep(4);
    toast.success(L('Booking request saved. We will notify you once Pandit Ji confirms availability.', 'बुकिंग अनुरोध सहेजा गया। पंडित जी की उपलब्धता की पुष्टि होने पर हम आपको सूचित करेंगे।'));
  };

  const handleResetAndClose = () => {
    setStep(1);
    onClose();
  };

  const displayCreatedPoojaName = (() => {
    if (!createdBooking) return '';
    const match = COMPREHENSIVE_POOJA_CATALOG.find((p) => p.id === createdBooking.poojaId || p.name === createdBooking.poojaName);
    return match ? getLocalizedPooja(match, lang).displayName : createdBooking.poojaName;
  })();

  const displayCreatedSlot = (() => {
    if (!createdBooking) return '';
    const match = TIME_SLOT_OPTIONS.find((o) => o.value === createdBooking.timeSlot);
    return match ? (lang === 'hi' ? match.hi : match.en) : createdBooking.timeSlot;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-obsidian-soft border border-gold/30 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gold/15 flex items-center justify-between bg-gradient-to-r from-obsidian via-obsidian-soft to-obsidian">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center shadow-inner">
              <img src="/logo.webp" alt={L('Param Darshan', 'परम दर्शन')} className="w-7 h-7 object-contain drop-shadow" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-soft">
                {L('Sacred Seva Booking', 'पवित्र सेवा बुकिंग')}
              </p>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-white">
                {L('Book a Live Vedic Pooja Session', 'लाइव वैदिक पूजा सत्र बुक करें')}
              </h2>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="rounded-full p-2 text-stone-400 hover:text-white hover:bg-gold/10 transition"
            aria-label={L('Close', 'बंद करें')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="px-6 py-2.5 bg-obsidian border-b border-gold/10 flex items-center justify-between text-xs overflow-x-auto no-scrollbar">
          <span className={`font-semibold shrink-0 ${step >= 1 ? 'text-gold' : 'text-stone-600 dark:text-stone-400'}`}>
            {L('1. Select Pooja', '1. पूजा चुनें')}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 shrink-0" />
          <span className={`font-semibold shrink-0 ${step >= 2 ? 'text-gold' : 'text-stone-600 dark:text-stone-400'}`}>
            {L('2. Choose Pandit Ji & Dakshina', '2. पंडित जी एवं दक्षिणा चुनें')}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 shrink-0" />
          <span className={`font-semibold shrink-0 ${step >= 3 ? 'text-gold' : 'text-stone-600 dark:text-stone-400'}`}>
            {L('3. Devotee Sankalp', '3. भक्त संकल्प')}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 shrink-0" />
          <span className={`font-semibold shrink-0 ${step >= 4 ? 'text-gold' : 'text-stone-600 dark:text-stone-400'}`}>
            {L('4. Pandit Ji Status', '4. पंडित जी की स्थिति')}
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
                    {L('Step 1: Choose Your Sacred Ritual or Consultation', 'चरण 1: अपना पवित्र अनुष्ठान या परामर्श चुनें')}
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {L('Select a personalized Vedic pooja, katha, or astrological guidance', 'व्यक्तिगत वैदिक पूजा, कथा या ज्योतिषीय मार्गदर्शन चुनें')}
                  </p>
                </div>
                <Link
                  href="/pooja"
                  onClick={onClose}
                  className="text-xs text-gold-pale hover:underline font-semibold flex items-center gap-1 shrink-0"
                >
                  {L(`View full catalog (${COMPREHENSIVE_POOJA_CATALOG.length})`, `पूरी सूची देखें (${COMPREHENSIVE_POOJA_CATALOG.length})`)} <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {COMPREHENSIVE_POOJA_CATALOG.slice(0, 10).map((pooja) => {
                  const isSelected = selectedSeva.id === pooja.id;
                  const locPooja = getLocalizedPooja(pooja, lang);
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
                            {locPooja.tag}
                          </span>
                          <span className="text-[11px] text-stone-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gold-soft" />
                            {locPooja.duration}
                          </span>
                        </div>
                        <h4 className="font-serif text-sm font-bold text-white leading-snug">
                          {locPooja.displayName}
                        </h4>
                        <p className="text-[11px] text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                          {locPooja.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-stone-800/80 flex items-center justify-between text-xs">
                        <span className="text-stone-400 text-[10px]">{L('Starting Dakshina:', 'प्रारंभिक दक्षिणा:')}</span>
                        <span className="font-bold text-gold-pale flex items-center gap-1">
                          <CoinIcon size={12} /> {formatCoins(pooja.baseDakshina, lang)}
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
                  {L('Want more choices? Browse all 24+ Poojas, Kathas & Yagyas in our Full Catalog →', 'और विकल्प चाहिए? हमारी संपूर्ण सूची में सभी 24+ पूजा, कथा एवं यज्ञ देखें →')}
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
                    {L('Step 2: Choose Your Verified Vedic Pandit Ji', 'चरण 2: अपने सत्यापित वैदिक पंडित जी चुनें')}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <p className="text-xs text-stone-400">
                      {L('Selected Ritual:', 'चयनित अनुष्ठान:')} <strong className="text-gold-pale">{localizedSelectedSeva.displayName}</strong> ({localizedSelectedSeva.duration})
                    </p>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-[11px] font-bold text-gold hover:underline bg-gold/10 px-2 py-0.5 rounded-full border border-gold/25"
                    >
                      {L('Change Pooja', 'पूजा बदलें')}
                    </button>
                  </div>
                </div>
                <span className="text-xs text-gold-soft bg-gold/10 px-3 py-1 rounded-full border border-gold/20 self-start sm:self-auto">
                  {L('Transparent Dakshina', 'पारदर्शी दक्षिणा')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {PANDIT_PRICING_CATALOG.map((pandit) => {
                  const isSelected = selectedPandit.panditId === pandit.panditId;
                  const panditDakshina = getPanditDakshinaForPooja(pandit, selectedSeva);
                  const locPandit = getLocalizedPanditPricing(pandit, lang);

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
                            (e.target as HTMLImageElement).src = '/images/pandits/pandit-rohit-tiwari.webp';
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
                          {pandit.hasSpecialBadge && (
                            <div className="mb-1">
                              <SpecialPanditBadge title={pandit.specialBadgeTitle} size="sm" />
                            </div>
                          )}
                          <p className="text-[11px] text-gold-soft font-medium leading-tight mb-1 truncate">
                            {locPandit.title}
                          </p>
                          <p className="text-[10px] text-stone-400 truncate mb-2">
                            {locPandit.lineage}
                          </p>

                          <div className="flex flex-wrap gap-1">
                            <span className="text-[9px] font-semibold text-stone-300 bg-obsidian-soft border border-stone-800 px-1.5 py-0.5 rounded">
                              {locPandit.experience}
                            </span>
                            <span className="text-[9px] font-semibold text-gold-pale bg-gold/10 border border-gold/20 px-1.5 py-0.5 rounded">
                              ★ {pandit.rating} ({pandit.reviewsCount})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Pandit's Specific Price for this Pooja */}
                      <div className="mt-4 pt-2.5 border-t border-stone-800 flex items-center justify-between text-xs">
                        <span className="text-stone-400 text-[11px]">{L('Pandit Ji Dakshina:', 'पंडित जी दक्षिणा:')}</span>
                        <div className="text-right">
                          <span className="font-bold text-gold-pale flex items-center gap-1">
                            <CoinIcon size={13} /> {formatCoins(panditDakshina, lang)}
                          </span>
                          <span className="text-[10px] text-stone-400 font-normal block">
                            (~{formatInrFromCoins(panditDakshina)})
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
                      {L('Consecrate Your Gotra & Sankalp', 'अपना गोत्र एवं संकल्प अंकित करें')}
                    </span>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-white">
                      {L('Devotee Sign-in Required', 'भक्त लॉगिन आवश्यक है')}
                    </h3>
                    <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                      {lang === 'hi' ? (
                        <>
                          अपना गोत्र संकल्पित करने और <strong className="text-gold-pale">{selectedPandit.name}</strong> को लाइव पूजा बुकिंग अनुरोध भेजने के लिए साइन इन करें या <strong className="text-gold-pale">100 मुफ़्त स्वागत कॉइन</strong> प्राप्त करें।
                        </>
                      ) : (
                        <>
                          Sign in or claim your <strong className="text-gold-pale">100 Free Welcome Coins</strong> to consecrate your Gotra and send your live pooja booking request to <strong className="text-gold-pale">{selectedPandit.name}</strong>.
                        </>
                      )}
                    </p>
                  </div>

                  {/* 100 Free Coins Pill */}
                  <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-1 text-xs font-semibold text-gold-pale">
                    <Sparkles className="w-3.5 h-3.5 text-gold" />
                    <span>{L('100 Free Coins credited instantly on registration', 'पंजीकरण पर तुरंत 100 मुफ़्त कॉइन प्राप्त हों')}</span>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={() => handleAuthRedirect('/login')}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-gold/40 bg-obsidian-soft hover:bg-gold/10 text-gold-pale font-bold text-xs transition flex items-center justify-center gap-2"
                    >
                      <LogIn className="w-4 h-4 text-gold" />
                      <span>{L('Sign In to Account', 'खाते में लॉगिन करें')}</span>
                    </button>
                    <button
                      onClick={() => handleAuthRedirect('/register')}
                      className="w-full sm:w-auto px-7 py-2.5 rounded-full bg-gold hover:bg-gold-deep text-obsidian font-bold text-xs shadow-lg transition flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{L('Register & Claim 100 Coins', 'रजिस्टर करें और 100 कॉइन पाएँ')}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-stone-400 italic">
                    {L(
                      `Your selected ritual (${localizedSelectedSeva.displayName}) with ${selectedPandit.name} (${formatCoins(currentDakshina, lang)}) will be preserved automatically upon sign-in.`,
                      `लॉगिन के बाद आपका चुना अनुष्ठान (${localizedSelectedSeva.displayName}) और ${selectedPandit.name} (${formatCoins(currentDakshina, lang)}) स्वतः सुरक्षित रहेगा।`,
                    )}
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-gold/10 border border-gold/25 text-xs">
                    <div className="flex items-center gap-2 text-stone-200">
                      <CheckCircle2 className="w-4 h-4 text-gold shrink-0" />
                      <span>
                        {L('Booking as', 'इस खाते से बुकिंग:')} <strong className="text-white">{user.name || user.email}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-gold-pale bg-gold/20 px-2.5 py-0.5 rounded-full border border-gold/30">
                      {L('Devotee Verified', 'सत्यापित भक्त')}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-serif text-base font-bold text-white">
                      {L('Step 3: Devotee & Sacred Sankalp Details', 'चरण 3: भक्त एवं पवित्र संकल्प विवरण')}
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {L(
                        `${selectedPandit.name} will invoke these sacred details during the live chanting and Swasti Vachan.`,
                        `लाइव मंत्रोच्चार एवं स्वस्ति वाचन के समय ${selectedPandit.name} इन पवित्र विवरणों का उच्चारण करेंगे।`,
                      )}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">
                        {L('Yajman (Devotee) Full Name *', 'यजमान (भक्त) का पूरा नाम *')}
                      </label>
                      <input
                        type="text"
                        required
                        value={devoteeName}
                        onChange={(e) => setDevoteeName(e.target.value)}
                        placeholder={L('e.g. Ramesh Chandra Sharma', 'उदा. रमेश चंद्र शर्मा')}
                        className="w-full px-3.5 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">
                        {L('Gotra (Vedic Lineage) *', 'गोत्र (वैदिक परंपरा) *')}
                      </label>
                      <input
                        type="text"
                        required
                        value={devoteeGotra}
                        onChange={(e) => setDevoteeGotra(e.target.value)}
                        placeholder={L("e.g. Kashyap, Bharadwaj, Vatsa (or 'Kashyap')", "उदा. कश्यप, भारद्वाज, वत्स (या 'कश्यप')")}
                        className="w-full px-3.5 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-300 mb-1">
                        {L('Preferred Auspicious Date *', 'पसंदीदा शुभ तिथि *')}
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
                        {L('Preferred Time Slot *', 'पसंदीदा समय *')}
                      </label>
                      <select
                        value={timeSlot}
                        onChange={(e) => setTimeSlot(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs sm:text-sm text-white focus:outline-none focus:border-gold"
                      >
                        {TIME_SLOT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {lang === 'hi' ? opt.hi : opt.en}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      {L('Sankalp / Prayer Intention', 'संकल्प / प्रार्थना उद्देश्य')}
                    </label>
                    <select
                      value={sankalpIntent}
                      onChange={(e) => setSankalpIntent(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs sm:text-sm text-white focus:outline-none focus:border-gold"
                    >
                      {SANKALP_INTENT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {lang === 'hi' ? opt.hi : opt.en}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      {L('Family Members to Invoke (Optional)', 'संकल्प में सम्मिलित परिवारजन (वैकल्पिक)')}
                    </label>
                    <input
                      type="text"
                      value={familyMembers}
                      onChange={(e) => setFamilyMembers(e.target.value)}
                      placeholder={L('e.g. Suman Sharma (Wife), Aarav (Son)', 'उदा. सुमन शर्मा (पत्नी), आरव (पुत्र)')}
                      className="w-full px-3.5 py-2 rounded-xl bg-obsidian border border-gold/20 text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-gold"
                    />
                  </div>

                  {/* Summary Bar */}
                  <div className="rounded-2xl bg-obsidian p-4 border border-gold/20 flex items-center justify-between text-xs">
                    <div>
                      <p className="text-[11px] text-stone-400">{L('Selected Pooja & Pandit:', 'चयनित पूजा एवं पंडित:')}</p>
                      <p className="font-bold text-white mt-0.5">
                        {localizedSelectedSeva.displayName} • <span className="text-gold-pale">{selectedPandit.name}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 block font-semibold">{L('Total Dakshina', 'कुल दक्षिणा')}</span>
                      <span className="font-mono font-bold text-gold-pale text-sm flex items-center gap-1 justify-end">
                        <CoinIcon size={13} /> {formatCoins(currentDakshina, lang)}
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
                  <span>{L("Awaiting Pandit Ji's Schedule Confirmation", 'पंडित जी के समय की पुष्टि की प्रतीक्षा')}</span>
                </span>
                <h3 className="modal-value font-serif text-2xl font-bold mt-2">
                  {L('Booking Request Saved', 'बुकिंग अनुरोध सहेजा गया')}
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 max-w-md mx-auto leading-relaxed">
                {lang === 'hi' ? (
                  <>
                    <strong className="modal-value font-bold">{displayCreatedPoojaName}</strong> के लिए आपका अनुरोध{' '}
                    <strong className="modal-gold-value font-bold">{createdBooking.panditName}</strong> को भेज दिया गया है। पंडित जी अपने समय की जांच कर 2 घंटे के भीतर प्रसारण की पुष्टि करेंगे।
                  </>
                ) : (
                  <>
                    Your request for <strong className="modal-value font-bold">{displayCreatedPoojaName}</strong> has been sent to{' '}
                    <strong className="modal-gold-value font-bold">{createdBooking.panditName}</strong>. Pandit Ji will verify his sanctum schedule and confirm your broadcast within 2 hours.
                  </>
                )}
              </p>

              {/* Booking Reference Details */}
              <div className="modal-detail-card rounded-2xl border p-5 max-w-md mx-auto text-left space-y-2 text-xs shadow-inner">
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-stone-800">
                  <span className="modal-label font-medium">{L('Booking Reference:', 'बुकिंग संदर्भ कोड:')}</span>
                  <span className="modal-gold-value font-mono font-bold">{createdBooking.refCode}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-stone-800">
                  <span className="modal-label font-medium">{L('Pooja / Seva:', 'पूजा / सेवा:')}</span>
                  <span className="modal-value font-semibold">{displayCreatedPoojaName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-stone-800">
                  <span className="modal-label font-medium">{L('Requested Pandit Ji:', 'चयनित पंडित जी:')}</span>
                  <span className="modal-value font-semibold">{createdBooking.panditName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-stone-800">
                  <span className="modal-label font-medium">{L('Auspicious Date & Slot:', 'शुभ तिथि एवं समय:')}</span>
                  <span className="modal-value font-semibold">{createdBooking.scheduledDate} • {displayCreatedSlot}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-stone-200 dark:border-stone-800">
                  <span className="modal-label font-medium">{L('Yajman Gotra:', 'यजमान गोत्र:')}</span>
                  <span className="modal-value font-semibold">
                    {createdBooking.devoteeGotra} {L('Gotra', 'गोत्र')} • {createdBooking.devoteeName}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="modal-label font-medium">{L('Dakshina:', 'दक्षिणा:')}</span>
                  <span className="modal-gold-value font-bold flex items-center gap-1">
                    <CoinIcon size={12} /> {formatCoins(createdBooking.dakshinaCoins, lang)}
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
                  <span>{L('View in My Devotee Profile', 'मेरी भक्त प्रोफ़ाइल में देखें')}</span>
                </Link>
                <button
                  onClick={handleResetAndClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-stone-700 hover:border-gold/40 text-stone-300 hover:text-white font-semibold text-xs transition"
                >
                  {L('Return to Home', 'होम पेज पर लौटें')}
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
                {L('Back', 'पीछे')}
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                onClick={() => setStep((s) => (s + 1) as any)}
                className="px-6 py-2 rounded-full bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold transition flex items-center gap-1.5 shadow-md"
              >
                <span>{L('Continue', 'आगे बढ़ें')}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : user ? (
              <button
                onClick={handleConfirmAndSendRequest}
                disabled={!devoteeName}
                className={`px-6 py-2.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 shadow-md ${
                  devoteeName
                    ? 'bg-gold hover:bg-gold-deep text-obsidian shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 cursor-not-allowed'
                }`}
              >
                <DiyaIcon size={14} />
                <span>{L('Send Booking Request to Pandit Ji', 'पंडित जी को बुकिंग अनुरोध भेजें')}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAuthRedirect('/login')}
                  className="px-4 py-2 rounded-full border border-gold/40 text-gold-pale hover:bg-gold/10 text-xs font-bold transition"
                >
                  {L('Sign In', 'लॉगिन करें')}
                </button>
                <button
                  onClick={() => handleAuthRedirect('/register')}
                  className="px-5 py-2 rounded-full bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                >
                  <DiyaIcon size={13} />
                  <span>{L('Register Free', 'निःशुल्क रजिस्टर करें')}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
