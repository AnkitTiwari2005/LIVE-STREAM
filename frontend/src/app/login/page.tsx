'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ShieldAlert, KeyRound, Sparkles } from 'lucide-react';
import { OmIcon, DiyaIcon, PranamIcon } from '@/components/icons/SpiritualIcons';

import { getSafeRedirect } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const red = params.get('redirect');
      if (red && red.startsWith('/')) {
        setRedirectUrl(red);
      }
      if (params.get('expired') === '1' || params.get('expired') === 'true') {
        setError('Your previous session has expired. Please sign in again.');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed. Please check credentials.');
      }

      if (data.requires2FA) {
        // Show 2FA challenge screen with signed tempToken
        setTempToken(data.tempToken);
        setLoading(false);
        return;
      }

      localStorage.setItem('pooja_user', JSON.stringify(data.user));
      localStorage.setItem('pooja_token', data.accessToken);
      window.dispatchEvent(new Event('sd-auth-change'));

      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const safeTarget = getSafeRedirect(params?.get('redirect'));
      if (safeTarget) {
        router.push(safeTarget);
      } else if (data.user?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const res = await fetch(`${apiUrl}/auth/verify-totp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, token: totpToken }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid 2FA code');

      localStorage.setItem('pooja_user', JSON.stringify(data.user));
      localStorage.setItem('pooja_token', data.accessToken);
      window.dispatchEvent(new Event('sd-auth-change'));

      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const safeTarget = getSafeRedirect(params?.get('redirect'));
      if (safeTarget) {
        router.push(safeTarget);
      } else if (data.user?.role === 'ADMIN') {
        router.push('/admin');
      } else if (data.user?.role === 'STREAMER') {
        router.push('/studio/create');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] bg-obsidian flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-md w-full bg-obsidian-soft border border-gold/25 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/40 bg-gradient-to-b from-[#2a1e12] to-obsidian shadow-[0_0_20px_rgba(245,158,11,0.25)]">
              <img src="/logo.png" alt="Shubhdarshan" className="w-10 h-10 object-contain drop-shadow" />
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {tempToken ? 'Two-Factor Authentication' : 'Welcome to Shubhdarshan'}
          </h2>
          <p className="text-stone-400 text-xs mt-1.5 leading-relaxed">
            {tempToken
              ? 'Enter the 6-digit code from your Authenticator app'
              : 'Sign in to participate in sacred poojas, live darshan, and chat'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!tempToken ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gold-soft absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="devotee@example.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-obsidian border border-gold/20 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-gold transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-stone-300">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-gold hover:text-gold-pale transition"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gold-soft absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 bg-obsidian border border-gold/20 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-gold transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs sm:text-sm shadow-lg shadow-gold/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleTotpVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                6-Digit Security Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-gold-soft absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value)}
                  placeholder="123456"
                  className="w-full pl-10 pr-3 py-2.5 bg-obsidian border border-gold/20 rounded-xl text-xs sm:text-sm text-white font-mono tracking-widest focus:outline-none focus:border-gold transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs sm:text-sm shadow-lg shadow-gold/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify 2FA'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-stone-400">
          Do not have an account?{' '}
          <Link
            href={redirectUrl ? `/register?redirect=${encodeURIComponent(redirectUrl)}` : "/register"}
            className="text-gold hover:underline font-bold"
          >
            Register Free (+100 Coins)
          </Link>
        </div>
      </div>
    </div>
  );
}
