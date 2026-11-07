'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
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
} from 'lucide-react';
import { OmIcon, CoinIcon, DiyaIcon } from '@/components/icons/SpiritualIcons';

export default function AccountPage() {
  const router = useRouter();
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
        alert('Your account and personal data have been scheduled for deletion under DPDP Act 2023.');
        window.location.href = '/';
      } else {
        alert('Failed to delete account. Please contact support.');
      }
    } catch {
      alert('Network error while requesting deletion.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white flex flex-col justify-between">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full flex-1">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-stone-800">
          <div className="p-3 rounded-2xl bg-orange-950/60 border border-orange-500/30 text-orange-400">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <OmIcon size={26} /> My Sacred Profile & Settings
            </h1>
            <p className="text-xs text-stone-400 mt-0.5">
              Manage your personal information, security, and devotional preferences
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-stone-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
            Loading account details...
          </div>
        ) : (
          <div className="space-y-8">
            {/* User Info Card */}
            <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-orange-400" /> Account Overview
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800/80">
                  <span className="text-xs text-stone-400 block mb-1">Full Name</span>
                  <span className="text-sm font-bold text-white">{user?.name}</span>
                </div>

                <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800/80">
                  <span className="text-xs text-stone-400 block mb-1">Email Address</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{user?.email}</span>
                    {user?.isEmailVerified ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <button
                        onClick={handleResendVerify}
                        className="text-[11px] font-bold text-amber-400 bg-amber-950/60 hover:bg-amber-900/60 px-2 py-0.5 rounded-full border border-amber-500/30 transition"
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
      </main>

      <Footer />
    </div>
  );
}
