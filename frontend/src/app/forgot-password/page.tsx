'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { OmIcon, DiyaIcon } from '@/components/icons/SpiritualIcons';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const res = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to dispatch reset link');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-obsidian-soft border border-gold/25 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <span className="p-3 bg-gradient-to-b from-amber-500/10 to-transparent border border-gold/30 rounded-2xl">
              <img src="/logo.png" alt="Shubhdarshan" className="w-10 h-10 object-contain drop-shadow" />
            </span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-100 flex items-center justify-center gap-2">
            Reset Password
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            Enter your registered email address to receive sacred password reset instructions.
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-4 space-y-4">
            <div className="flex justify-center">
              <span className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-full text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </span>
            </div>
            <h3 className="text-lg font-semibold text-stone-100">Instructions Dispatched</h3>
            <p className="text-stone-400 text-sm leading-relaxed">
              If an account with <strong className="text-stone-200">{email}</strong> exists, a password reset link has been dispatched. Please check your inbox and spam folder.
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-sm font-semibold transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-xs text-red-400">
                {error}
              </div>
            )}

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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-semibold rounded-xl text-sm shadow-md transition-all disabled:opacity-50"
            >
              {loading ? 'Dispatching Link...' : 'Send Reset Link'}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-orange-400 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
