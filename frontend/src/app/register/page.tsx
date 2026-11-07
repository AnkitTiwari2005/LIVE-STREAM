'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, User, ShieldAlert, CheckCircle2, Sparkles } from 'lucide-react';
import { OmIcon, CoinIcon, PranamIcon } from '@/components/icons/SpiritualIcons';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAgeConfirmed18Plus, setIsAgeConfirmed18Plus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isAgeConfirmed18Plus) {
      setError('You must confirm you are 18 years of age or older in accordance with the DPDP Act, 2023.');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          isAgeConfirmed18Plus,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      setSuccess('Account created! Please check your email for the verification link before participating in chat.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <OmIcon size={44} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create Devotee Account</h2>
          <p className="text-stone-400 text-xs mt-1">
            Join thousands watching authentic Vedic Darshan and Kundli analysis
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-800/60 text-amber-300 text-xs font-semibold">
            <CoinIcon size={14} />
            <span>100 Free Darshan Coins (20 mins free) upon registration!</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center p-6 bg-stone-950 border border-stone-800 rounded-2xl">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-2">Check Your Inbox</h3>
            <p className="text-xs text-stone-300 mb-6">{success}</p>
            <Link
              href="/login"
              className="inline-block py-2 px-6 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-xs transition-colors"
            >
              Proceed to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Pandit / Devotee Name"
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

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
                Password (min 8 chars)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* DPDP Act 2023 Mandatory 18+ Gate & Consent Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={isAgeConfirmed18Plus}
                  onChange={(e) => setIsAgeConfirmed18Plus(e.target.checked)}
                  className="mt-0.5 rounded border-stone-700 text-orange-600 focus:ring-orange-500 h-4 w-4 bg-stone-950"
                />
                <span className="text-[11px] text-stone-400 leading-tight select-none">
                  I confirm that <strong>I am 18 years of age or older</strong> and I agree to the{' '}
                  <Link href="/terms" target="_blank" className="text-orange-400 underline">Terms of Service</Link>{' '}
                  and{' '}
                  <Link href="/privacy" target="_blank" className="text-orange-400 underline">Privacy Policy</Link>{' '}
                  under India's DPDP Act, 2023.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold rounded-xl text-sm shadow-md transition-all disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Free Account'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-stone-400">
          Already have an account?{' '}
          <Link href="/login" className="text-orange-400 hover:underline font-semibold">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
