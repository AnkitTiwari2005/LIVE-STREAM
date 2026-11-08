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
} from 'lucide-react';
import { OmIcon, CoinIcon, DiyaIcon, VerifiedPanditBadge } from '@/components/icons/SpiritualIcons';
import { useToast } from '@/components/Toast';

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
            <div className="mt-4 p-4 bg-gradient-to-r from-amber-950/40 to-stone-950 rounded-2xl border border-amber-800/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <CoinIcon size={20} />
                </div>
                <div>
                  <span className="text-xs font-semibold text-amber-200 block">Sacred Coin Wallet</span>
                  <span className="text-xs text-stone-400">View transaction history or recharge coins</span>
                </div>
              </div>
              <Link
                href="/wallet/history"
                className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition"
              >
                View Ledger <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

            {/* Two-Factor Authentication (2FA) */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
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
                  className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl text-xs transition border border-stone-700"
                >
                  {twoFaLoading ? 'Generating QR...' : 'Enable Two-Factor Authentication'}
                </button>
              )}

              {twoFaData && (
                <div className="mt-4 p-5 bg-stone-950 rounded-2xl border border-stone-800 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <img
                      src={twoFaData.qrCode}
                      alt="2FA QR Code"
                      className="w-40 h-40 rounded-xl border border-stone-700 bg-white p-2"
                    />
                    <div className="space-y-2 text-xs text-stone-300">
                      <p className="font-semibold text-white">Step 1: Scan with Authenticator</p>
                      <p>Scan this QR code using Google Authenticator, 1Password, or Microsoft Authenticator.</p>
                      <p className="font-semibold text-white pt-2">Emergency Backup Codes:</p>
                      <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-amber-400 bg-stone-900 p-2 rounded-lg border border-stone-800">
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
                      className="flex-1 px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-sm text-white font-mono tracking-widest focus:outline-none focus:border-orange-500"
                    />
                    <button
                      type="submit"
                      disabled={twoFaLoading || totpInput.length !== 6}
                      className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      {twoFaLoading ? 'Verifying...' : 'Activate 2FA'}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* DPDP Act 2023 Compliance & Data Deletion */}
            <div className="bg-stone-900 border border-red-950/60 rounded-3xl p-6 sm:p-8 shadow-xl">
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
    </div>
  );
}
