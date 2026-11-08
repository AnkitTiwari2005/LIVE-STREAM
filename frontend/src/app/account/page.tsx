'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Shield,
  KeyRound,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Wallet,
  ArrowRight,
  RefreshCw,
  Edit2,
  Check,
  X,
  Clock,
  Calendar,
  Video,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { OmIcon, CoinIcon, DiyaIcon, VerifiedPanditBadge } from '@/components/icons/SpiritualIcons';
import { useToast } from '@/components/Toast';
import SevaBookingModal, { BookingRecord } from '@/components/SevaBookingModal';
import { PANDIT_PRICING_CATALOG } from '@/data/poojaCatalog';

export default function AccountPage() {
  const router = useRouter();
  const toast = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [twoFaData, setTwoFaData] = useState<{ qrCode: string; backupCodes: string[] } | null>(null);
  const [totpInput, setTotpInput] = useState('');
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaSuccess, setTwoFaSuccess] = useState<string | null>(null);
  const [twoFaError, setTwoFaError] = useState<string | null>(null);

  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Profile Edit State
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  // Devotee Bookings State
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [bookingFilter, setBookingFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'DECLINED'>('ALL');
  const [rebookModalOpen, setRebookModalOpen] = useState(false);
  const [rebookPoojaId, setRebookPoojaId] = useState<string | undefined>(undefined);

  const loadBookings = () => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('shubhdarshan_bookings');
      if (stored) {
        setBookings(JSON.parse(stored));
      } else {
        // Seed initial sample request so devotees immediately see how live status tracking works
        const sample: BookingRecord[] = [
          {
            id: 'sample-booking-1',
            refCode: 'SHUBH-749210',
            poojaId: 'rudrabhishek',
            poojaName: 'Maha Rudrabhishek & Swasti Vachan',
            category: 'Shiva & Rudra',
            panditId: 'aarav-sharma',
            panditName: 'Pandit Aarav Sharma',
            panditAvatar: '/images/photo-1543934776-32d1cc654abb.webp',
            panditTitle: 'Senior Acharya, Kashi Vishwanath Sanctum',
            dakshinaCoins: 150,
            devoteeName: 'Ankit Sharma',
            devoteeGotra: 'Kashyap',
            scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            timeSlot: 'Morning (07:00 AM – 09:00 AM IST)',
            sankalpIntent: 'Family Health, Long Life & Healing',
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            roomLink: '/join/invite',
          },
        ];
        localStorage.setItem('shubhdarshan_bookings', JSON.stringify(sample));
        setBookings(sample);
      }
    } catch {
      setBookings([]);
    }
  };

  const updateBooking = (id: string, updates: Partial<BookingRecord>) => {
    const updated = bookings.map((b) => (b.id === id ? { ...b, ...updates } : b));
    setBookings(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('shubhdarshan_bookings', JSON.stringify(updated));
    }
  };

  const handleSimulateApprove = (id: string) => {
    updateBooking(id, {
      status: 'APPROVED',
      confirmedTime: 'Confirmed by Panditji for requested slot',
      roomLink: '/join/invite',
    });
    toast.success('Panditji has accepted and confirmed your live pooja schedule!');
  };

  const handleSimulateDecline = (id: string) => {
    updateBooking(id, {
      status: 'DECLINED',
      declineReason: 'Panditji has a conflicting temple sandhya aarti duty for this time slot.',
    });
    toast.error('Panditji is unavailable for this slot. You can choose another Pandit or auto-match.');
  };

  const handleAutoMatchPandit = (booking: BookingRecord) => {
    const nextPandit = PANDIT_PRICING_CATALOG.find((p) => p.panditId !== booking.panditId) || PANDIT_PRICING_CATALOG[1];
    updateBooking(booking.id, {
      panditId: nextPandit.panditId,
      panditName: nextPandit.name,
      panditAvatar: nextPandit.avatar,
      panditTitle: nextPandit.title,
      dakshinaCoins: nextPandit.dakshinaCoins,
      status: 'APPROVED',
      confirmedTime: `Transferred & confirmed with ${nextPandit.name}`,
      roomLink: '/join/invite',
      declineReason: undefined,
    });
    toast.success(`Ritual successfully transferred to ${nextPandit.name} and confirmed!`);
  };

  const handleChooseAnotherPandit = (booking: BookingRecord) => {
    setRebookPoojaId(booking.poojaId);
    setRebookModalOpen(true);
  };

  const handleDeleteBooking = (id: string) => {
    const updated = bookings.filter((b) => b.id !== id);
    setBookings(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('shubhdarshan_bookings', JSON.stringify(updated));
    }
    toast.info('Booking request removed.');
  };

  const loadProfile = async () => {
    setLoading(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('pooja_token') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setNameInput(data.name || '');
        localStorage.setItem('pooja_user', JSON.stringify(data));
      } else {
        router.push('/login');
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadBookings();
  }, []);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setNameSaving(true);
    setNameMsg(null);
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    try {
      const res = await fetch(`${apiUrl}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: nameInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update name');
      setUser((prev: any) => ({ ...prev, name: data.name }));
      localStorage.setItem('pooja_user', JSON.stringify({ ...user, name: data.name }));
      setIsEditingName(false);
      setNameMsg('Profile name updated successfully!');
      setTimeout(() => setNameMsg(null), 3000);
    } catch (err: any) {
      setNameMsg(err.message || 'Failed to update');
    } finally {
      setNameSaving(false);
    }
  };

  const handleResendVerify = async () => {
    setVerifyMsg(null);
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    try {
      const res = await fetch(`${apiUrl}/auth/resend-verification`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setVerifyMsg(data.message || 'Verification link sent!');
    } catch {
      setVerifyMsg('Failed to send verification link.');
    }
  };

  const handleStart2FA = async () => {
    setTwoFaError(null);
    setTwoFaSuccess(null);
    setTwoFaLoading(true);
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    try {
      const res = await fetch(`${apiUrl}/auth/setup-2fa`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to initialize 2FA');
      setTwoFaData(data);
    } catch (err: any) {
      setTwoFaError(err.message);
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleConfirm2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFaError(null);
    setTwoFaLoading(true);
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    try {
      const res = await fetch(`${apiUrl}/auth/confirm-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: totpInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed');
      setTwoFaSuccess('Two-factor authentication successfully activated!');
      setTwoFaData(null);
      loadProfile();
    } catch (err: any) {
      setTwoFaError(err.message);
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    try {
      const res = await fetch(`${apiUrl}/auth/delete-account`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        localStorage.removeItem('pooja_user');
        localStorage.removeItem('pooja_token');
        toast.success('Your account and personal data have been scheduled for deletion under DPDP Act 2023.');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        toast.error('Failed to delete account. Please contact support.');
      }
    } catch {
      toast.error('Network error while requesting deletion.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-foreground py-10 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-5 lg:px-8 w-full">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gold/15">
          <div className="p-3 rounded-2xl bg-gold/10 border border-gold/30 text-gold">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <img src="/logo.png" alt="Shubhdarshan" className="w-8 h-8 object-contain inline-block drop-shadow" /> My Sacred Profile &amp; Settings
            </h1>
            <p className="text-xs text-stone-400 mt-0.5">
              Manage your personal information, security, and devotional preferences
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-stone-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-gold" />
            Loading account details...
          </div>
        ) : (
          <div className="space-y-8">
            {/* User Info Card */}
            <div className="bg-obsidian-soft border border-gold/15 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-orange-400" /> Account Overview
              </h2>
              {/* Role Badge */}
              <div>
                {user?.role === 'ADMIN' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-500/30">
                    <Shield className="w-3.5 h-3.5" /> Platform Administrator
                  </span>
                ) : user?.role === 'STREAMER' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-400 bg-orange-950/60 px-3 py-1 rounded-full border border-orange-500/30">
                    <VerifiedPanditBadge size={16} /> Verified Vedic Pandit
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-300 bg-stone-950 px-3 py-1 rounded-full border border-stone-800">
                    Devotee Account
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name with inline edit */}
              <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-stone-400">Full Name</span>
                  {!isEditingName && (
                    <button
                      onClick={() => {
                        setNameInput(user?.name || '');
                        setIsEditingName(true);
                      }}
                      className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Edit Name
                    </button>
                  )}
                </div>
                {isEditingName ? (
                  <form onSubmit={handleUpdateName} className="flex items-center gap-2 mt-1">
                    <input
                      type="text"
                      required
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Enter name"
                      className="px-2.5 py-1 bg-stone-900 border border-stone-700 rounded-lg text-sm text-white focus:outline-none focus:border-orange-500 flex-1"
                    />
                    <button
                      type="submit"
                      disabled={nameSaving}
                      className="p-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition disabled:opacity-50"
                      title="Save Name"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <span className="text-sm font-bold text-white block">{user?.name}</span>
                )}
                {nameMsg && <p className="text-[11px] text-emerald-400 mt-1">{nameMsg}</p>}
              </div>

              <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800/80">
                <span className="text-xs text-stone-400 block mb-1">Email Address</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-white truncate">{user?.email}</span>
                  {user?.isEmailVerified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <button
                      onClick={handleResendVerify}
                      className="text-[11px] font-bold text-amber-400 bg-amber-950/60 hover:bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-500/30 transition shrink-0"
                    >
                      Verify Email
                    </button>
                  )}
                </div>
                {verifyMsg && <p className="text-xs text-emerald-400 mt-2">{verifyMsg}</p>}
              </div>
            </div>

            {/* Wallet Shortcut */}
            <div className="mt-4 p-4 bg-gradient-to-r from-gold/15 via-obsidian-soft to-obsidian rounded-2xl border border-gold/30 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gold/20 text-gold-pale border border-gold/30">
                  <CoinIcon size={20} />
                </div>
                <div>
                  <span className="text-xs font-semibold text-foreground block">Sacred Coin Wallet</span>
                  <span className="text-xs text-stone-400">View transaction history or recharge coins</span>
                </div>
              </div>
              <Link
                href="/wallet/history"
                className="inline-flex items-center gap-1 text-xs font-bold text-gold-pale hover:text-gold transition"
              >
                View Ledger <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* MY BOOKED POOJAS & SANKALPS (LIVE STATUS TRACKING) */}
          <div id="bookings" className="bg-obsidian-soft border border-gold/25 rounded-3xl p-6 sm:p-8 shadow-xl scroll-mt-24 sm:scroll-mt-28">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gold/15">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-gold-soft mb-1">
                  <DiyaIcon size={12} /> Live Devotee Requests
                </span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  My Booked Poojas &amp; Sankalps
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Live status tracking for your personalized Vedic rituals, kathas, and astrological consultations
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setRebookPoojaId(undefined);
                    setRebookModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-full bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-gold/20 hover:scale-[1.02]"
                >
                  <DiyaIcon size={14} />
                  <span>Book a Live Pooja</span>
                </button>
                <Link
                  href="/pooja"
                  className="px-4 py-2.5 rounded-full border border-gold/30 hover:border-gold text-gold-pale text-xs font-semibold transition flex items-center gap-1 bg-obsidian"
                >
                  <span>Catalog</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto py-4 no-scrollbar border-b border-stone-800">
              {(['ALL', 'PENDING', 'APPROVED', 'DECLINED'] as const).map((filter) => {
                const count =
                  filter === 'ALL'
                    ? bookings.length
                    : bookings.filter((b) => b.status === filter).length;
                const isSelected = bookingFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setBookingFilter(filter)}
                    className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                      isSelected
                        ? 'bg-gold text-obsidian shadow'
                        : 'bg-obsidian border border-gold/15 text-stone-300 hover:text-white hover:border-gold/30'
                    }`}
                  >
                    {filter === 'PENDING' && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                    {filter === 'APPROVED' && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                    {filter === 'DECLINED' && (
                      <span className="w-2 h-2 rounded-full bg-red-400" />
                    )}
                    <span>
                      {filter === 'ALL'
                        ? 'All Bookings'
                        : filter === 'PENDING'
                        ? 'Pending Confirmation'
                        : filter === 'APPROVED'
                        ? 'Confirmed / Approved'
                        : 'Pandit Unavailable'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                        isSelected
                          ? 'bg-white/25 text-white'
                          : 'bg-gold/15 text-gold-pale border border-gold/25'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bookings Card List */}
            <div className="mt-6 space-y-4">
              {bookings.filter((b) => bookingFilter === 'ALL' || b.status === bookingFilter).length === 0 ? (
                <div className="p-8 text-center bg-obsidian rounded-2xl border border-stone-800 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center text-gold mx-auto">
                    <DiyaIcon size={22} />
                  </div>
                  <p className="text-sm font-serif font-bold text-white">
                    No {bookingFilter === 'ALL' ? '' : bookingFilter.toLowerCase()} pooja requests found
                  </p>
                  <p className="text-xs text-stone-400 max-w-sm mx-auto">
                    Select a personalized Vedic pooja or 1-on-1 horoscope consultation to receive sacred live darshan.
                  </p>
                  <button
                    onClick={() => {
                      setRebookPoojaId(undefined);
                      setRebookModalOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-full bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold transition inline-flex items-center gap-1.5 shadow"
                  >
                    <DiyaIcon size={14} />
                    <span>Book a Live Pooja Now</span>
                  </button>
                </div>
              ) : (
                bookings
                  .filter((b) => bookingFilter === 'ALL' || b.status === bookingFilter)
                  .map((b) => {
                    const isPending = b.status === 'PENDING';
                    const isApproved = b.status === 'APPROVED';
                    const isDeclined = b.status === 'DECLINED';

                    return (
                      <div
                        key={b.id}
                        className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 shadow-lg space-y-4 ${
                          isApproved
                            ? 'bg-gradient-to-br from-emerald-950/20 via-obsidian to-obsidian border-emerald-500/40 shadow-[0_4px_24px_rgba(16,185,129,0.08)]'
                            : isDeclined
                            ? 'bg-gradient-to-br from-red-950/20 via-obsidian to-obsidian border-red-500/40'
                            : 'bg-gradient-to-br from-amber-950/20 via-obsidian to-obsidian border-amber-500/35 shadow-[0_4px_24px_rgba(245,158,11,0.08)]'
                        }`}
                      >
                        {/* Top Meta Line: Status Badge & Ref Code */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-800">
                          <div className="flex items-center gap-2">
                            {isPending && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40">
                                <Clock className="w-3.5 h-3.5 animate-spin" /> Awaiting Pandit Confirmation
                              </span>
                            )}
                            {isApproved && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Consecrated &amp; Approved by Panditji
                              </span>
                            )}
                            {isDeclined && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-950/80 text-red-300 border border-red-500/40">
                                <AlertTriangle className="w-3.5 h-3.5" /> Pandit Unavailable for Slot
                              </span>
                            )}
                            <span className="font-mono text-xs text-stone-400 bg-obsidian-soft px-2.5 py-0.5 rounded border border-stone-800">
                              {b.refCode}
                            </span>
                          </div>

                          <div className="text-[11px] text-stone-400">
                            Requested on: {new Date(b.createdAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>

                        {/* Middle Details Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                          {/* Ritual Details */}
                          <div className="lg:col-span-7 space-y-2">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gold-pale bg-gold/10 px-2 py-0.5 rounded-full border border-gold/25 inline-block mb-1">
                                {b.category || 'Vedic Ritual'}
                              </span>
                              <h3 className="font-serif text-lg sm:text-xl font-bold text-white leading-snug">
                                {b.poojaName}
                              </h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                              <div className="flex items-center gap-1.5 text-stone-300">
                                <Calendar className="w-3.5 h-3.5 text-gold-soft shrink-0" />
                                <span><strong>Date:</strong> {b.scheduledDate}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-stone-300">
                                <Clock className="w-3.5 h-3.5 text-gold-soft shrink-0" />
                                <span><strong>Slot:</strong> {b.timeSlot}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-stone-300">
                                <OmIcon size={14} className="text-gold shrink-0" />
                                <span><strong>Yajman:</strong> {b.devoteeName} ({b.devoteeGotra} Gotra)</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-stone-300">
                                <Sparkles className="w-3.5 h-3.5 text-gold shrink-0" />
                                <span className="truncate"><strong>Sankalp:</strong> {b.sankalpIntent}</span>
                              </div>
                            </div>
                          </div>

                          {/* Pandit & Dakshina Summary */}
                          <div className="lg:col-span-5 rounded-xl bg-obsidian-soft border border-gold/25 p-3.5 flex items-center justify-between gap-3 shadow-sm">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={b.panditAvatar || '/images/photo-1543934776-32d1cc654abb.webp'}
                                alt={b.panditName}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/images/photo-1543934776-32d1cc654abb.webp';
                                }}
                                className="w-11 h-11 rounded-full object-cover border border-gold/30 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1 font-semibold text-white text-xs truncate">
                                  <span>{b.panditName}</span>
                                  <VerifiedPanditBadge size={13} />
                                </div>
                                <p className="text-[10px] text-stone-400 truncate">
                                  {b.panditTitle}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-[10px] text-stone-400 block font-semibold">Dakshina</span>
                              <span className="font-mono font-bold text-gold-pale text-xs sm:text-sm flex items-center gap-1 justify-end">
                                <CoinIcon size={13} /> {b.dakshinaCoins} Coins
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Status Banner & Devotee Action Strip */}
                        <div className="pt-3 border-t border-stone-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          {/* Left Status Message */}
                          <div className="text-xs">
                            {isPending && (
                              <p className="text-amber-300/90 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>Panditji is verifying his sanctum altar schedule. You will be notified once confirmed.</span>
                              </p>
                            )}
                            {isApproved && (
                              <p className="text-emerald-300 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>
                                  <strong>Slot Confirmed!</strong> Join the private sanctum room at your scheduled time.
                                </span>
                              </p>
                            )}
                            {isDeclined && (
                              <p className="text-red-300/90 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                <span>
                                  {b.declineReason || 'Panditji had a conflicting sanctum duty for this specific slot.'}
                                </span>
                              </p>
                            )}
                          </div>

                          {/* Right Interactive Buttons */}
                          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
                            {isPending && (
                              <>
                                {/* Devotee Test Controls (Simulate Pandit Response) */}
                                <button
                                  onClick={() => handleSimulateApprove(b.id)}
                                  className="px-3 py-1.5 rounded-full bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition flex items-center gap-1 shadow-sm"
                                  title="Devotee Demo: Simulate Pandit Confirmation"
                                >
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Simulate Pandit Approval</span>
                                </button>
                                <button
                                  onClick={() => handleSimulateDecline(b.id)}
                                  className="px-3 py-1.5 rounded-full bg-red-950/80 hover:bg-red-900 border border-red-500/40 text-red-300 text-xs font-bold transition flex items-center gap-1 shadow-sm"
                                  title="Devotee Demo: Simulate Pandit Unavailable"
                                >
                                  <X className="w-3 h-3 text-red-400" />
                                  <span>Simulate Decline</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteBooking(b.id)}
                                  className="p-1.5 text-stone-500 hover:text-red-400 transition"
                                  title="Cancel Request"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <>
                                <Link
                                  href={b.roomLink || '/join/invite'}
                                  className="px-5 py-2 rounded-full bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold transition flex items-center gap-1.5 shadow-[0_0_18px_rgba(245,158,11,0.35)] hover:scale-105"
                                >
                                  <Video className="w-3.5 h-3.5" />
                                  <span>Join Sacred Room (Live HD)</span>
                                </Link>
                                <button
                                  onClick={() => toast.success(`Sankalp Slip for ${b.refCode}: Yajman ${b.devoteeName}, ${b.devoteeGotra} Gotra registered.`)}
                                  className="px-3 py-1.5 rounded-full border border-gold/30 hover:border-gold text-gold-pale text-xs font-semibold transition"
                                >
                                  Gotra Slip
                                </button>
                              </>
                            )}

                            {isDeclined && (
                              <>
                                {/* User options if declined: Choose another pandit OR Auto-match */}
                                <button
                                  onClick={() => handleChooseAnotherPandit(b)}
                                  className="px-4 py-1.5 rounded-full bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Choose Another Pandit</span>
                                </button>
                                <button
                                  onClick={() => handleAutoMatchPandit(b)}
                                  className="px-3.5 py-1.5 rounded-full border border-gold/40 bg-gold/10 hover:bg-gold/20 text-gold-pale text-xs font-bold transition flex items-center gap-1"
                                >
                                  <Sparkles className="w-3 h-3 text-gold" />
                                  <span>Auto-match Available Pandit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteBooking(b.id)}
                                  className="p-1.5 text-stone-500 hover:text-red-400 transition"
                                  title="Dismiss Record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

            {/* Two-Factor Authentication (2FA) */}
            <div className="bg-obsidian-soft border border-gold/25 rounded-3xl p-6 sm:p-8 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-400" /> Two-Factor Authentication (2FA)
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Add a strong cryptographic layer to safeguard your sacred account
                  </p>
                </div>
                {user?.isTwoFactorEnabled && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                  </span>
                )}
              </div>

              {twoFaSuccess && (
                <div className="p-3 mb-4 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-xs text-emerald-400">
                  {twoFaSuccess}
                </div>
              )}

              {twoFaError && (
                <div className="p-3 mb-4 bg-red-950/50 border border-red-500/30 rounded-xl text-xs text-red-400">
                  {twoFaError}
                </div>
              )}

              {!user?.isTwoFactorEnabled && !twoFaData && (
                <button
                  onClick={handleStart2FA}
                  disabled={twoFaLoading}
                  className="px-5 py-2.5 bg-gold/15 hover:bg-gold/25 text-gold-pale border border-gold/30 font-semibold rounded-xl text-xs transition"
                >
                  {twoFaLoading ? 'Generating QR...' : 'Enable Two-Factor Authentication'}
                </button>
              )}

              {twoFaData && (
                <div className="mt-4 p-5 bg-obsidian rounded-2xl border border-gold/25 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <img
                      src={twoFaData.qrCode}
                      alt="2FA QR Code"
                      className="w-40 h-40 rounded-xl border border-stone-700 bg-white p-2"
                    />
                    <div className="space-y-2 text-xs text-stone-300">
                      <p className="font-semibold text-foreground">Step 1: Scan with Authenticator</p>
                      <p>Scan this QR code using Google Authenticator, 1Password, or Microsoft Authenticator.</p>
                      <p className="font-semibold text-foreground pt-2">Emergency Backup Codes:</p>
                      <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-gold-pale bg-obsidian-soft p-2 rounded-lg border border-gold/20">
                        {twoFaData.backupCodes.map((c, i) => (
                          <span key={i}>{c}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleConfirm2FA} className="flex gap-2 max-w-sm pt-2">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={totpInput}
                      onChange={(e) => setTotpInput(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="flex-1 px-3 py-2 bg-obsidian border border-gold/25 rounded-xl text-sm text-foreground font-mono tracking-widest focus:outline-none focus:border-gold"
                    />
                    <button
                      type="submit"
                      disabled={twoFaLoading || totpInput.length !== 6}
                      className="px-4 py-2 bg-gold hover:bg-gold-deep text-obsidian rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      {twoFaLoading ? 'Verifying...' : 'Activate 2FA'}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* DPDP Act 2023 Compliance & Data Deletion */}
            <div className="bg-obsidian-soft border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-1">
                <Trash2 className="w-5 h-5" /> Data Privacy & Account Erasure
              </h2>
              <p className="text-xs text-stone-400 mb-4">
                Under Section 12(3) of the Digital Personal Data Protection Act (DPDP Act, 2023), you have the absolute statutory right to request erasure of your personal data and account records.
              </p>

              {deleteConfirm ? (
                <div className="p-4 bg-red-950/50 border border-red-500/30 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-red-400">
                    <AlertTriangle className="w-4 h-4" /> Are you certain you want to permanently erase your account?
                  </div>
                  <p className="text-[11px] text-stone-300">
                    This action will immediately revoke all access, anonymize personal identification records, and clear remaining darshan coins. This action is irreversible.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition"
                    >
                      {deleteLoading ? 'Erasing...' : 'Confirm Permanent Deletion'}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-950/60 hover:bg-red-900/60 text-red-400 border border-red-800/60 rounded-xl text-xs font-semibold transition"
                >
                  Request Account Deletion (DPDP Act)
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Seva Booking Modal */}
      <SevaBookingModal
        isOpen={rebookModalOpen}
        onClose={() => {
          setRebookModalOpen(false);
          loadBookings();
        }}
        initialSevaId={rebookPoojaId}
      />
    </div>
  );
}
