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
  Lock,
  LogOut,
  Bell,
} from 'lucide-react';
import { OmIcon, CoinIcon, DiyaIcon, VerifiedPanditBadge } from '@/components/icons/SpiritualIcons';
import { useToast } from '@/components/Toast';
import SevaBookingModal, { BookingRecord } from '@/components/SevaBookingModal';
import {
  decodeJwtClaims,
  getAccountCapabilities,
  purgeClientSession,
  setClientSession,
} from '@/lib/auth-session';

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
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Profile Edit & Preferences State
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [prefSaving, setPrefSaving] = useState(false);

  // Password & Session Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [resetEmailSending, setResetEmailSending] = useState(false);
  const [resetEmailMsg, setResetEmailMsg] = useState<string | null>(null);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [logoutAllMsg, setLogoutAllMsg] = useState<string | null>(null);

  // 2FA Rotation & Disable State
  const [rotateOpen, setRotateOpen] = useState(false);
  const [rotateCurrentToken, setRotateCurrentToken] = useState('');
  const [disable2faOpen, setDisable2faOpen] = useState(false);
  const [disable2faPassword, setDisable2faPassword] = useState('');
  const [disable2faToken, setDisable2faToken] = useState('');

  // Devotee Bookings State (Viewers only)
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [bookingFilter, setBookingFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'DECLINED'>('ALL');
  const [rebookModalOpen, setRebookModalOpen] = useState(false);
  const [rebookPoojaId, setRebookPoojaId] = useState<string | undefined>(undefined);

  // Pandit Incoming Requests State (Approved Pandits & Pandit-Admins)
  const [panditRequests, setPanditRequests] = useState<BookingRecord[]>([]);
  const [panditFilter, setPanditFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'DECLINED'>('ALL');
  const [panditBusyId, setPanditBusyId] = useState<string | null>(null);
  const [declineDraftId, setDeclineDraftId] = useState<string | null>(null);
  const [declineReasonInput, setDeclineReasonInput] = useState('');
  const [approveTimeInput, setApproveTimeInput] = useState<Record<string, string>>({});

  const { isApprovedPandit, isViewer, isAdmin } = getAccountCapabilities(user);

  const loadBookings = async (userId?: string) => {
    if (typeof window === 'undefined') return;
    const uid = userId || user?.id || 'guest';
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

    let remoteRows: BookingRecord[] = [];
    if (token) {
      try {
        const res = await fetch(`${apiUrl}/pooja-bookings/mine?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const parsed = await res.json();
          if (Array.isArray(parsed)) remoteRows = parsed;
        }
      } catch {
        // Fallback to local records below if network is temporarily unavailable
      }
    }

    let localRows: BookingRecord[] = [];
    try {
      const key = `paramdarshan_bookings_${uid}`;
      const legacyKey = `shubhdarshan_bookings_${uid}`;
      const stored = localStorage.getItem(key) ?? localStorage.getItem(legacyKey);
      if (stored) {
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, stored);
        }
        const parsedLocal = JSON.parse(stored);
        if (Array.isArray(parsedLocal)) localRows = parsedLocal;
      }
    } catch {
      localRows = [];
    }

    const seen = new Set(remoteRows.map((r) => `${r.id}|${r.refCode}`));
    const merged = [
      ...remoteRows,
      ...localRows.filter((l) => !seen.has(`${l.id}|${l.refCode}`) && !remoteRows.some((r) => r.refCode === l.refCode)),
    ];
    setBookings(merged);
  };

  const loadPanditRequests = async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('pooja_token');
    if (!token) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    try {
      const res = await fetch(`${apiUrl}/pooja-bookings/streamer/requests?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const rows = await res.json();
        setPanditRequests(Array.isArray(rows) ? rows : []);
      }
    } catch {
      // Ignore network hiccup
    }
  };

  const handleRespondToRequest = async (id: string, decision: 'APPROVED' | 'DECLINED') => {
    const token = localStorage.getItem('pooja_token');
    if (!token) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    setPanditBusyId(id);
    try {
      const payload =
        decision === 'APPROVED'
          ? { decision, confirmedTime: approveTimeInput[id]?.trim() || undefined }
          : { decision, declineReason: declineReasonInput.trim() || undefined };
      const res = await fetch(`${apiUrl}/pooja-bookings/${encodeURIComponent(id)}/respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Unable to update pooja request');
      }
      setPanditRequests((prev) => prev.map((r) => (r.id === id ? data : r)));
      if (decision === 'DECLINED') {
        setDeclineDraftId(null);
        setDeclineReasonInput('');
      }
      toast.success(
        decision === 'APPROVED'
          ? 'Pooja request confirmed. Devotee can now see the approved slot.'
          : 'Pooja request marked unavailable.',
      );
    } catch (err: any) {
      toast.error(err.message || 'Could not update pooja request.');
    } finally {
      setPanditBusyId(null);
    }
  };

  const handleChooseAnotherPandit = (booking: BookingRecord) => {
    setRebookPoojaId(booking.poojaId);
    setRebookModalOpen(true);
  };

  const handleDeleteBooking = async (id: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pooja_token') : null;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    if (token && !id.startsWith('booking-')) {
      try {
        const res = await fetch(`${apiUrl}/pooja-bookings/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data.message || 'Unable to cancel booking request.');
          return;
        }
      } catch {
        toast.error('Network error while cancelling booking.');
        return;
      }
    }

    const updated = bookings.filter((b) => b.id !== id);
    setBookings(updated);
    if (typeof window !== 'undefined') {
      const userId = JSON.parse(localStorage.getItem('pooja_user') || '{}')?.id || 'guest';
      localStorage.setItem(`paramdarshan_bookings_${userId}`, JSON.stringify(updated));
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
      const cacheBust = Date.now();
      const res = await fetch(`${apiUrl}/auth/me?_t=${cacheBust}`, {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
      if (res.ok) {
        const data = await res.json();
        // SD-SEC-2026-004: Validate verified user ID against token claims to prevent session bleed
        const claims = decodeJwtClaims(token);
        if (claims?.sub && data.id !== claims.sub) {
          purgeClientSession();
          router.push('/login');
          return;
        }

        setUser(data);
        setNameInput(data.name || '');
        localStorage.setItem('pooja_user', JSON.stringify(data));

        const caps = getAccountCapabilities(data);
        if (caps.isViewer) {
          loadBookings(data.id);
        } else {
          setBookings([]);
        }
        if (caps.isApprovedPandit) {
          loadPanditRequests();
        } else {
          setPanditRequests([]);
        }
      } else {
        if (res.status === 401) {
          purgeClientSession();
        }
        router.push('/login');
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('pooja_token') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    const claims = decodeJwtClaims(token);
    const cachedUser = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('pooja_user') || 'null')
      : null;

    // SD-SEC-2026-004: Only pre-hydrate role-scoped data if cached user ID matches active JWT claim!
    if (claims?.sub && cachedUser?.id === claims.sub) {
      setUser(cachedUser);
      setNameInput(cachedUser.name || '');
      const caps = getAccountCapabilities(cachedUser);
      if (caps.isViewer) {
        loadBookings(cachedUser.id);
      }
      if (caps.isApprovedPandit) {
        loadPanditRequests();
      }
    } else {
      // Stale or contaminated cache: do not render previous user data
      localStorage.removeItem('pooja_user');
      setUser(null);
      setBookings([]);
      setPanditRequests([]);
    }

    loadProfile();
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
      const mergedUser = { ...user, ...data };
      setUser(mergedUser);
      localStorage.setItem('pooja_user', JSON.stringify(mergedUser));
      setIsEditingName(false);
      setNameMsg('Profile name updated successfully!');
      setTimeout(() => setNameMsg(null), 3000);
    } catch (err: any) {
      setNameMsg(err.message || 'Failed to update');
    } finally {
      setNameSaving(false);
    }
  };

  const handleToggleEmailNotification = async () => {
    if (!user || prefSaving) return;
    setPrefSaving(true);
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    const nextVal = user.emailNotification === false;
    try {
      const res = await fetch(`${apiUrl}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emailNotification: nextVal }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update email preference');
      const mergedUser = { ...user, ...data };
      setUser(mergedUser);
      localStorage.setItem('pooja_user', JSON.stringify(mergedUser));
      toast.success(nextVal ? 'Email alerts enabled.' : 'Email alerts paused.');
    } catch (err: any) {
      toast.error(err.message || 'Could not update preference.');
    } finally {
      setPrefSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (user?.hasPassword !== false && !currentPassword) {
      setPwError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPwError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New password and confirmation do not match.');
      return;
    }

    setPwSaving(true);
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    try {
      const res = await fetch(`${apiUrl}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(
          user?.hasPassword === false
            ? { newPassword }
            : { currentPassword, newPassword },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to change password');

      if (data.accessToken && data.user) {
        const nextUser = { ...data.user, isLastAdmin: user?.isLastAdmin ?? false };
        setUser(nextUser);
        setClientSession(nextUser, data.accessToken);
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwSuccess(
        data.message || 'Password updated successfully. All other sessions have been signed out.',
      );
      toast.success('Password updated successfully.');
    } catch (err: any) {
      setPwError(err.message || 'Could not update password.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email || resetEmailSending) return;
    setResetEmailSending(true);
    setResetEmailMsg(null);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    try {
      const res = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Unable to send reset link');
      setResetEmailMsg(`Password reset instructions sent to ${user.email}.`);
    } catch (err: any) {
      setResetEmailMsg(err.message || 'Could not send reset email.');
    } finally {
      setResetEmailSending(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (logoutAllLoading) return;
    setLogoutAllLoading(true);
    setLogoutAllMsg(null);
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    try {
      const res = await fetch(`${apiUrl}/auth/logout-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to revoke other sessions');
      if (data.accessToken && data.user) {
        const nextUser = { ...data.user, isLastAdmin: user?.isLastAdmin ?? false };
        setUser(nextUser);
        setClientSession(nextUser, data.accessToken);
      }
      setLogoutAllMsg(data.message || 'Signed out from all other browsers and devices.');
      toast.success('All other devices have been signed out.');
    } catch (err: any) {
      toast.error(err.message || 'Unable to revoke other sessions.');
    } finally {
      setLogoutAllLoading(false);
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
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
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

  const handleRotate2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFaError(null);
    setTwoFaSuccess(null);
    setTwoFaLoading(true);
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    try {
      const res = await fetch(`${apiUrl}/auth/setup-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentToken: rotateCurrentToken.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed for current 2FA code');
      setTwoFaData(data);
      setRotateOpen(false);
      setRotateCurrentToken('');
      setTotpInput('');
    } catch (err: any) {
      setTwoFaError(err.message);
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFaError(null);
    setTwoFaSuccess(null);
    setTwoFaLoading(true);
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    try {
      const res = await fetch(`${apiUrl}/auth/disable-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(
          user?.hasPassword === false
            ? { token: disable2faToken.trim() }
            : { password: disable2faPassword, token: disable2faToken.trim() },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to disable 2FA');
      setDisable2faOpen(false);
      setDisable2faPassword('');
      setDisable2faToken('');
      setTwoFaData(null);
      setTwoFaSuccess(data.message || 'Two-factor authentication disabled.');
      loadProfile();
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
      setTotpInput('');
      loadProfile();
    } catch (err: any) {
      setTwoFaError(err.message);
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    // hasPassword comes from /auth/me; Google-only accounts have no password to confirm with
    if (user?.hasPassword !== false && !deletePassword) {
      toast.error('Please enter your password to confirm permanent account erasure.');
      return;
    }
    setDeleteLoading(true);
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    try {
      const res = await fetch(`${apiUrl}/auth/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(user?.hasPassword === false ? {} : { password: deletePassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        purgeClientSession();
        toast.success(
          data.message ||
            'Your account and personal data have been permanently erased under DPDP Act 2023.',
        );
        setTimeout(() => {
          window.location.href = '/';
        }, 1800);
      } else {
        toast.error(data.message || 'Failed to delete account. Please verify your password.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Network error while requesting deletion.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-white py-10 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-5 lg:px-8 w-full">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gold/15">
          <div className="p-3 rounded-2xl bg-gold/10 border border-gold/30 text-gold">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <img src="/logo.webp" alt="Param Darshan" className="w-8 h-8 object-contain inline-block drop-shadow" /> My Sacred Profile &amp; Settings
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
            {/* Unverified Email Alert Banner */}
            {user && !user.isEmailVerified && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200 block">
                      Email Address Not Verified
                    </span>
                    <span className="text-[11px] text-stone-600 dark:text-stone-300 block mt-0.5 leading-relaxed">
                      Please verify your email ({user.email}) to unlock your <strong>100 Free Welcome Coins</strong> and participate in live community chat.
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleResendVerify}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs transition shadow shrink-0"
                >
                  Resend Verification Email
                </button>
              </div>
            )}

            {/* User Info Card */}
            <div className="bg-obsidian-soft border border-gold/15 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-orange-700 dark:text-orange-400" /> Account Overview
              </h2>
              {/* Role Badge */}
              <div>
                {isAdmin && isApprovedPandit ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-500/30">
                    <Shield className="w-3.5 h-3.5" /> Admin · Verified Vedic Pandit Ji
                  </span>
                ) : isAdmin ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-500/30">
                    <Shield className="w-3.5 h-3.5" /> Platform Administrator
                  </span>
                ) : isApprovedPandit ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-800 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 px-3 py-1 rounded-full border border-orange-300 dark:border-orange-500/30">
                    <VerifiedPanditBadge size={16} /> Verified Vedic Pandit Ji
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-950 px-3 py-1 rounded-full border border-stone-200 dark:border-stone-800">
                    Devotee Account
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name with inline edit */}
              <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-stone-600 dark:text-stone-400">Full Name</span>
                  {!isEditingName && (
                    <button
                      onClick={() => {
                        setNameInput(user?.name || '');
                        setIsEditingName(true);
                      }}
                      className="text-[11px] text-orange-700 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 font-semibold flex items-center gap-1"
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
                      className="px-2.5 py-1 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-white focus:outline-none focus:border-orange-500 flex-1"
                    />
                    <button
                      type="submit"
                      disabled={nameSaving}
                      className="p-1.5 bg-orange-700 hover:bg-orange-600 text-white rounded-lg transition disabled:opacity-50"
                      title="Save Name"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="p-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-lg transition border border-stone-200 dark:border-transparent"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <span className="text-sm font-bold text-stone-900 dark:text-white block">{user?.name}</span>
                )}
                {nameMsg && <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">{nameMsg}</p>}
              </div>

              <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-200 dark:border-stone-800/80">
                <span className="text-xs text-stone-600 dark:text-stone-400 block mb-1">Email Address</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-stone-900 dark:text-white truncate">{user?.email}</span>
                  {user?.isEmailVerified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-500/30 shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <button
                      onClick={handleResendVerify}
                      className="text-[11px] font-bold text-amber-800 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-500/30 transition shrink-0"
                    >
                      Verify Email
                    </button>
                  )}
                </div>
                {verifyMsg && <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2">{verifyMsg}</p>}
              </div>
            </div>

            {/* Wallet Shortcut */}
            <div className="mt-4 p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-gold/15 dark:via-obsidian-soft dark:to-obsidian rounded-2xl border border-amber-500/30 dark:border-gold/30 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/15 dark:bg-gold/20 text-amber-700 dark:text-gold-pale border border-amber-500/30 dark:border-gold/30">
                  <CoinIcon size={20} />
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-900 dark:text-foreground block">Sacred Coin Wallet</span>
                  <span className="text-xs text-stone-600 dark:text-stone-400">View transaction history or recharge coins</span>
                </div>
              </div>
              <Link
                href="/wallet/history"
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 dark:text-gold-pale hover:text-amber-800 dark:hover:text-gold transition"
              >
                View Ledger <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Email Alerts Preference & Role Shortcuts */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-amber-500/10 dark:bg-gold/10 text-amber-700 dark:text-gold shrink-0">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-stone-900 dark:text-white block">
                      Email Notifications
                    </span>
                    <span className="text-[11px] text-stone-600 dark:text-stone-400 block">
                      Live darshan alerts and account security emails
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={user?.emailNotification !== false}
                  disabled={prefSaving}
                  onClick={handleToggleEmailNotification}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                    user?.emailNotification !== false
                      ? 'bg-emerald-600'
                      : 'bg-stone-300 dark:bg-stone-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      user?.emailNotification !== false ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800/80 flex flex-wrap items-center gap-2">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-xs font-bold text-amber-900 dark:text-amber-300 transition"
                  >
                    <Shield className="w-3.5 h-3.5" /> Admin Console
                  </Link>
                )}
                {isApprovedPandit && (
                  <>
                    <Link
                      href="/studio/create"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold/15 hover:bg-gold/25 border border-gold/30 text-xs font-bold text-stone-900 dark:text-gold-pale transition"
                    >
                      <Video className="w-3.5 h-3.5 text-gold" /> Go Live Studio
                    </Link>
                    <Link
                      href="/studio/streams"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:border-gold text-xs font-semibold text-stone-800 dark:text-stone-200 transition"
                    >
                      My Broadcasts
                    </Link>
                    <Link
                      href="/streamer/earnings"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:border-gold text-xs font-semibold text-stone-800 dark:text-stone-200 transition"
                    >
                      Earnings &amp; Dakshina
                    </Link>
                  </>
                )}
                {isViewer && (
                  <>
                    <Link
                      href="/streamer/apply"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold/15 hover:bg-gold/25 border border-gold/30 text-xs font-bold text-stone-900 dark:text-gold-pale transition"
                    >
                      <DiyaIcon size={14} /> Become a Pandit Ji
                    </Link>
                    <Link
                      href="/streamer/status"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:border-gold text-xs font-semibold text-stone-800 dark:text-stone-200 transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> KYC Status
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* MY BOOKED POOJAS & SANKALPS (VIEWERS / DEVOTEES ONLY) */}
          {isViewer && (
          <div id="bookings" className="bg-obsidian-soft border border-gold/25 rounded-3xl p-6 sm:p-8 shadow-xl scroll-mt-20">
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
                  className="px-4 py-2.5 rounded-full border border-stone-300 dark:border-gold/30 hover:border-amber-500 dark:hover:border-gold text-stone-700 dark:text-gold-pale text-xs font-semibold transition flex items-center gap-1 bg-white dark:bg-obsidian shadow-sm"
                >
                  <span>Catalog</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto w-full max-w-full min-w-0 py-4 no-scrollbar border-b border-stone-200 dark:border-stone-800">
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
                        : 'bg-stone-100 dark:bg-obsidian border border-stone-200 dark:border-gold/15 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
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
                        : 'Pandit Ji Unavailable'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                        isSelected
                          ? 'bg-[#5c050a] text-white dark:bg-stone-950/25 dark:text-stone-950'
                          : 'bg-stone-200 text-stone-800 dark:bg-gold/15 dark:text-gold-pale dark:border dark:border-gold/25'
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
                            ? 'bg-emerald-50/70 dark:bg-emerald-950/20 dark:bg-gradient-to-br dark:from-emerald-950/20 dark:via-obsidian dark:to-obsidian border-emerald-300 dark:border-emerald-500/40 shadow-[0_4px_24px_rgba(16,185,129,0.08)]'
                            : isDeclined
                            ? 'bg-red-50/70 dark:bg-red-950/20 dark:bg-gradient-to-br dark:from-red-950/20 dark:via-obsidian dark:to-obsidian border-red-300 dark:border-red-500/40'
                            : 'bg-amber-50/70 dark:bg-amber-950/20 dark:bg-gradient-to-br dark:from-amber-950/20 dark:via-obsidian dark:to-obsidian border-amber-300 dark:border-amber-500/35 shadow-[0_4px_24px_rgba(245,158,11,0.08)]'
                        }`}
                      >
                        {/* Top Meta Line: Status Badge & Ref Code */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200 dark:border-stone-800">
                          <div className="flex items-center gap-2">
                            {isPending && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
                                <Clock className="w-3.5 h-3.5 animate-spin" /> Awaiting Pandit Ji Confirmation
                              </span>
                            )}
                            {isApproved && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Consecrated &amp; Approved by Pandit Ji
                              </span>
                            )}
                            {isDeclined && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/80 text-red-900 dark:text-red-300 border border-red-300 dark:border-red-500/40">
                                <AlertTriangle className="w-3.5 h-3.5" /> Pandit Ji Unavailable for Slot
                              </span>
                            )}
                            <span className="font-mono text-xs text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-obsidian-soft px-2.5 py-0.5 rounded border border-stone-200 dark:border-stone-800">
                              {b.refCode}
                            </span>
                          </div>

                          <div className="text-[11px] text-stone-600 dark:text-stone-400">
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
                                src={b.panditAvatar || '/images/pandits/pandit-rohit-tiwari.webp'}
                                alt={b.panditName}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/images/pandits/pandit-rohit-tiwari.webp';
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
                        <div className="pt-3 border-t border-stone-200 dark:border-stone-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          {/* Left Status Message */}
                          <div className="text-xs">
                            {isPending && (
                              <p className="text-amber-800 dark:text-amber-300/90 flex items-center gap-1.5 font-medium">
                                <Clock className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
                                <span>Pandit Ji is verifying his sanctum altar schedule. You will be notified once confirmed.</span>
                              </p>
                            )}
                            {isApproved && (
                              <p className="text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                                <span>
                                  <strong>Slot Confirmed!</strong> Join the private sanctum room at your scheduled time.
                                </span>
                              </p>
                            )}
                            {isDeclined && (
                              <p className="text-red-800 dark:text-red-300/90 flex items-center gap-1.5 font-medium">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-700 dark:text-red-400 shrink-0" />
                                <span>
                                  {b.declineReason || 'Pandit Ji had a conflicting sanctum duty for this specific slot.'}
                                </span>
                              </p>
                            )}
                          </div>

                          {/* Right Interactive Buttons */}
                          <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto shrink-0">
                            {isPending && (
                              <>
                                {/* R-04: Removed "Simulate Pandit Approval" and "Simulate Decline"
                                    buttons — they were visible to every devotee and created a false
                                    impression that a real pandit had responded to their booking. */}
                                <button
                                  onClick={() => handleDeleteBooking(b.id)}
                                  className="p-1.5 text-stone-600 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 transition"
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
                                <button
                                  onClick={() => handleChooseAnotherPandit(b)}
                                  className="px-4 py-1.5 rounded-full bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Choose Another Pandit Ji</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteBooking(b.id)}
                                  className="p-1.5 text-stone-600 dark:text-stone-400 hover:text-red-600 dark:hover:text-red-400 transition"
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
          )}

          {/* PANDIT POOJA REQUESTS & APPROVALS (APPROVED PANDITS & PANDIT-ADMINS ONLY) */}
          {isApprovedPandit && (
            <div
              id="pooja-requests"
              className="bg-obsidian-soft border border-gold/25 rounded-3xl p-6 sm:p-8 shadow-xl scroll-mt-20"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gold/15">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-gold-soft mb-1">
                    <DiyaIcon size={12} /> Devotee Bookings &amp; Sankalp Queue
                  </span>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                    Pooja Requests &amp; Approvals
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Review incoming devotee pooja requests and confirm or decline slots in real time
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={loadPanditRequests}
                    className="px-3.5 py-2 rounded-full border border-stone-300 dark:border-gold/30 hover:border-amber-500 dark:hover:border-gold text-stone-700 dark:text-gold-pale text-xs font-semibold transition flex items-center gap-1.5 bg-white dark:bg-obsidian shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                  <Link
                    href="/studio/create"
                    className="px-4 py-2 rounded-full bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold transition flex items-center gap-1.5 shadow-md"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Go Live Studio</span>
                  </Link>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto w-full max-w-full min-w-0 py-4 no-scrollbar border-b border-stone-200 dark:border-stone-800">
                {(['ALL', 'PENDING', 'APPROVED', 'DECLINED'] as const).map((filter) => {
                  const count =
                    filter === 'ALL'
                      ? panditRequests.length
                      : panditRequests.filter((r) => r.status === filter).length;
                  const isSelected = panditFilter === filter;
                  return (
                    <button
                      key={filter}
                      onClick={() => setPanditFilter(filter)}
                      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
                        isSelected
                          ? 'bg-gold text-obsidian shadow'
                          : 'bg-stone-100 dark:bg-obsidian border border-stone-200 dark:border-gold/15 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                      }`}
                    >
                      <span>
                        {filter === 'ALL'
                          ? 'All Requests'
                          : filter === 'PENDING'
                          ? 'Pending Approval'
                          : filter === 'APPROVED'
                          ? 'Approved'
                          : 'Declined'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                          isSelected
                            ? 'bg-[#5c050a] text-white dark:bg-stone-950/25 dark:text-stone-950'
                            : 'bg-stone-200 text-stone-800 dark:bg-gold/15 dark:text-gold-pale dark:border dark:border-gold/25'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Incoming Requests List */}
              <div className="mt-6 space-y-4">
                {panditRequests.filter((r) => panditFilter === 'ALL' || r.status === panditFilter).length === 0 ? (
                  <div className="p-8 text-center bg-obsidian rounded-2xl border border-stone-800 space-y-2">
                    <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center text-gold mx-auto">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-serif font-bold text-white">
                      No {panditFilter === 'ALL' ? '' : panditFilter.toLowerCase()} devotee requests yet
                    </p>
                    <p className="text-xs text-stone-400 max-w-md mx-auto">
                      When devotees submit personalized 1-on-1 Vedic pooja requests for your sanctum schedule, they will appear here for your approval.
                    </p>
                  </div>
                ) : (
                  panditRequests
                    .filter((r) => panditFilter === 'ALL' || r.status === panditFilter)
                    .map((r) => {
                      const isPending = r.status === 'PENDING';
                      const isApproved = r.status === 'APPROVED';
                      const isDeclined = r.status === 'DECLINED';
                      const busy = panditBusyId === r.id;

                      return (
                        <div
                          key={r.id}
                          className={`rounded-2xl border p-5 sm:p-6 transition-all shadow-lg space-y-4 ${
                            isApproved
                              ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/40'
                              : isDeclined
                              ? 'bg-red-50/70 dark:bg-red-950/20 border-red-300 dark:border-red-500/40'
                              : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/35'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200 dark:border-stone-800">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                                  isApproved
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                                    : isDeclined
                                    ? 'bg-red-100 dark:bg-red-950/80 text-red-900 dark:text-red-300 border-red-300 dark:border-red-500/40'
                                    : 'bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-500/40'
                                }`}
                              >
                                {isPending
                                  ? 'Pending Your Approval'
                                  : isApproved
                                  ? 'Approved by You'
                                  : 'Declined'}
                              </span>
                              <span className="font-mono text-xs text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-obsidian-soft px-2.5 py-0.5 rounded border border-stone-200 dark:border-stone-800">
                                {r.refCode}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-gold-pale text-xs sm:text-sm flex items-center gap-1">
                              <CoinIcon size={13} /> {r.dakshinaCoins} Coins Dakshina
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <h3 className="font-serif text-lg font-bold text-white">{r.poojaName}</h3>
                              <span className="text-[11px] text-stone-400">
                                Requested {new Date(r.createdAt || Date.now()).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-300">
                              <div><strong>Devotee:</strong> {r.devoteeName} ({r.devoteeGotra || 'Kashyap'} Gotra)</div>
                              <div><strong>Preferred Slot:</strong> {r.scheduledDate} · {r.timeSlot}</div>
                              <div className="sm:col-span-2"><strong>Sankalp Intent:</strong> {r.sankalpIntent}</div>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-stone-200 dark:border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {isPending ? (
                              declineDraftId === r.id ? (
                                <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                  <input
                                    type="text"
                                    value={declineReasonInput}
                                    onChange={(e) => setDeclineReasonInput(e.target.value)}
                                    placeholder="Optional note for devotee (e.g. temple duty at this hour)"
                                    className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-obsidian border border-red-300 dark:border-red-700/60 text-xs text-stone-900 dark:text-white focus:outline-none"
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => handleRespondToRequest(r.id, 'DECLINED')}
                                      className="px-3.5 py-1.5 rounded-full bg-red-700 hover:bg-red-600 text-white text-xs font-bold transition disabled:opacity-50"
                                    >
                                      {busy ? 'Saving...' : 'Confirm Decline'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setDeclineDraftId(null);
                                        setDeclineReasonInput('');
                                      }}
                                      className="px-3 py-1.5 rounded-full bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-300 text-xs font-semibold"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <input
                                    type="text"
                                    value={approveTimeInput[r.id] || ''}
                                    onChange={(e) =>
                                      setApproveTimeInput((prev) => ({ ...prev, [r.id]: e.target.value }))
                                    }
                                    placeholder="Optional confirmed time/note"
                                    className="flex-1 max-w-xs px-3 py-1.5 rounded-xl bg-white dark:bg-obsidian border border-stone-300 dark:border-gold/25 text-xs text-stone-900 dark:text-white focus:outline-none focus:border-gold"
                                  />
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => handleRespondToRequest(r.id, 'APPROVED')}
                                      className="px-4 py-1.5 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition disabled:opacity-50"
                                    >
                                      {busy ? 'Updating...' : 'Approve Slot'}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => {
                                        setDeclineDraftId(r.id);
                                        setDeclineReasonInput('');
                                      }}
                                      className="px-3.5 py-1.5 rounded-full border border-red-400/60 text-red-700 dark:text-red-300 hover:bg-red-500/10 text-xs font-semibold transition disabled:opacity-50"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                </>
                              )
                            ) : isApproved ? (
                              <>
                                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                                  Confirmed for: {r.confirmedTime || `${r.scheduledDate} · ${r.timeSlot}`}
                                </span>
                                <Link
                                  href="/studio/create"
                                  className="px-4 py-1.5 rounded-full bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold transition inline-flex items-center gap-1.5"
                                >
                                  <Video className="w-3.5 h-3.5" /> Open Broadcast Studio
                                </Link>
                              </>
                            ) : (
                              <span className="text-xs text-red-800 dark:text-red-300">
                                {r.declineReason || 'Marked unavailable for this slot'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* Password & Sign-In Security */}
          <div id="security" className="bg-obsidian-soft border border-gold/25 rounded-3xl p-6 sm:p-8 shadow-xl scroll-mt-24">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-700 dark:text-gold" /> Password &amp; Sign-In Security
                </h2>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                  {user?.hasPassword === false
                    ? 'You signed in with Google. Optionally set a direct account password below.'
                    : 'Update your password regularly or sign out other active devices.'}
                </p>
              </div>
            </div>

            {pwSuccess && (
              <div className="p-3 mb-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-500/30 rounded-xl text-xs text-emerald-800 dark:text-emerald-400">
                {pwSuccess}
              </div>
            )}
            {pwError && (
              <div className="p-3 mb-4 bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-500/30 rounded-xl text-xs text-red-700 dark:text-red-400">
                {pwError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {user?.hasPassword !== false && (
                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 bg-white dark:bg-obsidian border border-stone-300 dark:border-gold/25 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-none focus:border-gold"
                  />
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  {user?.hasPassword === false ? 'New Password (min 8 chars)' : 'New Password'}
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3 py-2 bg-white dark:bg-obsidian border border-stone-300 dark:border-gold/25 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2 bg-white dark:bg-obsidian border border-stone-300 dark:border-gold/25 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-none focus:border-gold"
                />
              </div>
              <div className="sm:col-span-3 flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={pwSaving}
                  className="px-4 py-2 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-xl text-xs transition disabled:opacity-50 shadow-sm"
                >
                  {pwSaving
                    ? 'Updating...'
                    : user?.hasPassword === false
                    ? 'Set Account Password'
                    : 'Update Password'}
                </button>
                <button
                  type="button"
                  disabled={resetEmailSending}
                  onClick={handleSendPasswordReset}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-900 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-semibold rounded-xl text-xs transition disabled:opacity-50"
                >
                  {resetEmailSending ? 'Sending...' : 'Send Password Reset Link'}
                </button>
                <button
                  type="button"
                  disabled={logoutAllLoading}
                  onClick={handleLogoutAllDevices}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-900 dark:hover:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-800 dark:text-stone-200 font-semibold rounded-xl text-xs transition inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{logoutAllLoading ? 'Signing out...' : 'Log Out All Other Devices'}</span>
                </button>
              </div>
            </form>

            {resetEmailMsg && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-3">{resetEmailMsg}</p>
            )}
            {logoutAllMsg && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2">{logoutAllMsg}</p>
            )}
          </div>

            {/* Two-Factor Authentication (2FA) */}
            <div id="2fa" className="bg-obsidian-soft border border-gold/25 rounded-3xl p-6 sm:p-8 shadow-xl scroll-mt-24">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-700 dark:text-emerald-400" /> Two-Factor Authentication (2FA)
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Add a strong cryptographic layer to safeguard your sacred account
                  </p>
                </div>
                {user?.isTwoFactorEnabled && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                  </span>
                )}
              </div>

              {isAdmin && !user?.isTwoFactorEnabled && (
                <div className="p-3.5 mb-4 bg-amber-500/15 border border-amber-500/40 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong>Platform Administrator Requirement:</strong> Two-factor authentication (2FA) is mandatory to access the Admin Console. Click below to scan and activate your authenticator.
                  </span>
                </div>
              )}

              {twoFaSuccess && (
                <div className="p-3 mb-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-500/30 rounded-xl text-xs text-emerald-800 dark:text-emerald-400">
                  {twoFaSuccess}
                </div>
              )}

              {twoFaError && (
                <div className="p-3 mb-4 bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-500/30 rounded-xl text-xs text-red-700 dark:text-red-400">
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

              {user?.isTwoFactorEnabled && !twoFaData && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setRotateOpen((o) => !o);
                        setDisable2faOpen(false);
                        setTwoFaError(null);
                      }}
                      className="px-4 py-2 bg-gold/15 hover:bg-gold/25 text-stone-900 dark:text-gold-pale border border-gold/30 font-semibold rounded-xl text-xs transition"
                    >
                      Rotate / Re-enroll Authenticator
                    </button>
                    {!isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setDisable2faOpen((o) => !o);
                          setRotateOpen(false);
                          setTwoFaError(null);
                        }}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60 font-semibold rounded-xl text-xs transition"
                      >
                        Disable 2FA
                      </button>
                    )}
                  </div>

                  {isAdmin && (
                    <p className="text-[11px] text-stone-600 dark:text-stone-400">
                      Two-factor authentication is mandatory for Administrators and cannot be disabled; you may rotate it to a new authenticator device above.
                    </p>
                  )}

                  {rotateOpen && (
                    <form onSubmit={handleRotate2FA} className="p-4 bg-stone-50 dark:bg-obsidian rounded-2xl border border-stone-200 dark:border-gold/20 space-y-3 max-w-md">
                      <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                        Verify your current 6-digit authenticator code (or a backup code) to generate a new QR secret:
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={rotateCurrentToken}
                          onChange={(e) => setRotateCurrentToken(e.target.value)}
                          placeholder="Current 6-digit or backup code"
                          className="flex-1 px-3 py-2 bg-white dark:bg-obsidian-soft border border-stone-300 dark:border-gold/25 rounded-xl text-xs text-stone-900 dark:text-white font-mono focus:outline-none focus:border-gold"
                        />
                        <button
                          type="submit"
                          disabled={twoFaLoading || !rotateCurrentToken.trim()}
                          className="px-4 py-2 bg-gold hover:bg-gold-deep text-obsidian rounded-xl text-xs font-bold transition disabled:opacity-50"
                        >
                          {twoFaLoading ? 'Checking...' : 'Continue'}
                        </button>
                      </div>
                    </form>
                  )}

                  {disable2faOpen && !isAdmin && (
                    <form onSubmit={handleDisable2FA} className="p-4 bg-red-50/70 dark:bg-red-950/30 rounded-2xl border border-red-200 dark:border-red-800/50 space-y-3 max-w-md">
                      <p className="text-xs font-semibold text-red-800 dark:text-red-300">
                        Confirm your current 2FA code {user?.hasPassword === false ? '' : 'and password '}to disable two-factor authentication:
                      </p>
                      {user?.hasPassword !== false && (
                        <input
                          type="password"
                          required
                          value={disable2faPassword}
                          onChange={(e) => setDisable2faPassword(e.target.value)}
                          placeholder="Current account password"
                          className="w-full px-3 py-2 bg-white dark:bg-obsidian border border-red-200 dark:border-red-800/60 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-none"
                        />
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={disable2faToken}
                          onChange={(e) => setDisable2faToken(e.target.value)}
                          placeholder="Current 6-digit or backup code"
                          className="flex-1 px-3 py-2 bg-white dark:bg-obsidian border border-red-200 dark:border-red-800/60 rounded-xl text-xs text-stone-900 dark:text-white font-mono focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={twoFaLoading || !disable2faToken.trim()}
                          className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                        >
                          {twoFaLoading ? 'Disabling...' : 'Confirm Disable'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {twoFaData && (
                <div className="mt-4 p-5 bg-obsidian rounded-2xl border border-gold/25 space-y-4">
                  {user?.isTwoFactorEnabled && (
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                      Finish Step 2 right away by verifying a code from your newly scanned device so your authenticator stays synced.
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <img
                      src={twoFaData.qrCode}
                      alt="2FA QR Code"
                      className="w-40 h-40 rounded-xl border border-stone-700 bg-white p-2"
                    />
                    <div className="space-y-2 text-xs text-stone-300">
                      <p className="font-semibold text-stone-900 dark:text-white">Step 1: Scan with Authenticator</p>
                      <p>Scan this QR code using Google Authenticator, 1Password, or Microsoft Authenticator.</p>
                      <p className="font-semibold text-stone-900 dark:text-white pt-2">Emergency Backup Codes:</p>
                      <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-gold-pale bg-obsidian-soft p-2 rounded-lg border border-gold/20">
                        {twoFaData.backupCodes.map((c, i) => (
                          <span key={i}>{c}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleConfirm2FA} className="flex flex-wrap gap-2 max-w-md pt-2">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={totpInput}
                      onChange={(e) => setTotpInput(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="flex-1 min-w-[160px] px-3 py-2 bg-obsidian border border-gold/25 rounded-xl text-sm text-foreground font-mono tracking-widest focus:outline-none focus:border-gold"
                    />
                    <button
                      type="submit"
                      disabled={twoFaLoading || totpInput.length !== 6}
                      className="px-4 py-2 bg-gold hover:bg-gold-deep text-obsidian rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      {twoFaLoading ? 'Verifying...' : 'Activate 2FA'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTwoFaData(null);
                        setTotpInput('');
                      }}
                      className="px-3.5 py-2 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-300 rounded-xl text-xs font-semibold transition"
                    >
                      Cancel
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* DPDP Act 2023 Compliance & Data Deletion */}
            <div className="bg-obsidian-soft border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-lg font-bold text-red-700 dark:text-red-400 flex items-center gap-2 mb-1">
                <Trash2 className="w-5 h-5" /> Data Privacy & Account Erasure
              </h2>
              <p className="text-xs text-stone-600 dark:text-stone-400 mb-4">
                Under Section 12(3) of the Digital Personal Data Protection Act (DPDP Act, 2023), you have the absolute statutory right to request erasure of your personal data and account records.
              </p>

              {user?.isLastAdmin && (
                <div className="p-3.5 mb-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/30 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" />
                  <span>
                    <strong>Last Platform Administrator Notice:</strong> You are currently the sole active Platform Administrator. Assign another Administrator before deleting this account.
                  </span>
                </div>
              )}

              {deleteConfirm ? (
                <div className="p-4 sm:p-5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/30 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-red-700 dark:text-red-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Confirm Permanent Account &amp; Personal Data Erasure</span>
                  </div>
                  <p className="text-[11px] text-stone-700 dark:text-stone-300 leading-relaxed">
                    Under Section 12(3) of the DPDP Act 2023, this action will immediately revoke all access, permanently anonymize your profile records, and forfeit any remaining wallet or top-up coins (top-up coins are strictly non-refundable normally and after deletion). For verified Pandit accounts, your deletion request enters Administrator approval until any pending earned payouts are settled.
                  </p>
                  {user?.hasPassword === false ? (
                    <p className="text-[11px] text-stone-700 dark:text-stone-300">
                      You signed in with Google, so no password is needed. Press the button below to confirm.
                    </p>
                  ) : (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                      Enter Account Password to Confirm Deletion:
                    </label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter your current password"
                      className="w-full max-w-sm px-3.5 py-2 bg-white dark:bg-obsidian border border-red-300 dark:border-red-800/80 rounded-xl text-xs text-stone-900 dark:text-white focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading}
                      className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition shadow"
                    >
                      {deleteLoading ? 'Erasing...' : 'Confirm Permanent Deletion'}
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirm(false);
                        setDeletePassword('');
                      }}
                      className="px-4 py-2 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-300 rounded-xl text-xs font-semibold transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  disabled={Boolean(user?.isLastAdmin)}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/60 dark:hover:bg-red-900/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/60 rounded-xl text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
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
          if (isViewer) loadBookings(user?.id);
        }}
        initialSevaId={rebookPoojaId}
      />
    </div>
  );
}
