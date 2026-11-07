'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ShieldAlert, KeyRound, Sparkles } from 'lucide-react';
import { OmIcon, DiyaIcon, PranamIcon } from '@/components/icons/SpiritualIcons';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
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
        // Show 2FA challenge screen
        setTempUserId(data.user?.id || 'admin_user');
        setLoading(false);
        return;
      }

      localStorage.setItem('pooja_user', JSON.stringify(data.user));
      localStorage.setItem('pooja_token', data.accessToken);

      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const redirectUrl = params?.get('redirect');
      if (redirectUrl && redirectUrl.startsWith('/')) {
        router.push(redirectUrl);
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
        body: JSON.stringify({ userId: tempUserId, token: totpToken }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Invalid 2FA code');

      localStorage.setItem('pooja_user', JSON.stringify(data.user));
      localStorage.setItem('pooja_token', data.accessToken);
      router.push('/admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <OmIcon size={44} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {tempUserId ? 'Two-Factor Authentication' : 'Welcome to Shubhdarshan'}
          </h2>
          <p className="text-stone-400 text-xs mt-1">
            {tempUserId
              ? 'Enter the 6-digit code from your Authenticator app'
              : 'Sign in to participate in sacred poojas, darshan, and live chat'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!tempUserId ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="devotee@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold rounded-xl text-sm shadow-md transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>

            {/* Quick Demo Credentials Fill */}
            <div className="pt-4 border-t border-stone-800">
              <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block mb-2 text-center">
                Quick Test Accounts
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('pandit@shubhdarshan.com');
                    setPassword('Pandit@2026Live!');
                  }}
                  className="py-1.5 px-2 bg-stone-800 hover:bg-stone-700 text-orange-400 font-semibold rounded-lg text-[11px] transition-colors border border-stone-700 text-center"
                >
                  Pandit Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('devotee_wallet_test_1793998980362@shubhdarshan.com');
                    setPassword('SecurePooja2026!');
                  }}
                  className="py-1.5 px-2 bg-stone-800 hover:bg-stone-700 text-amber-400 font-semibold rounded-lg text-[11px] transition-colors border border-stone-700 text-center"
                >
                  Devotee (100 Coins)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@platform-domain.com');
                    setPassword('AdminPooja@2026Secure!');
                  }}
                  className="py-1.5 px-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-lg text-[11px] transition-colors border border-stone-700 text-center"
                >
                  Admin Console
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleTotpVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                6-Digit Security Code
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={totpToken}
                  onChange={(e) => setTotpToken(e.target.value)}
                  placeholder="123456"
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white font-mono tracking-widest focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-sm transition-all"
            >
              {loading ? 'Verifying...' : 'Verify 2FA'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-stone-400">
          Do not have an account?{' '}
          <Link href="/register" className="text-orange-400 hover:underline font-semibold">
            Register Free
          </Link>
        </div>
      </div>
    </div>
  );
}
