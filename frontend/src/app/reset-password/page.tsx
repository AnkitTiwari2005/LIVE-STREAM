'use client';

import React, { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { OmIcon, DiyaIcon } from '@/components/icons/SpiritualIcons';
import { useLang } from '@/lib/i18n/context';

function ResetPasswordContent() {
  const { lang } = useLang();
  const L = (en: string, hi: string) => (lang === 'hi' ? hi : en);
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const qToken = searchParams.get('token');
    if (qToken) {
      setToken(qToken);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError(L('Password must be at least 8 characters in length', 'पासवर्ड कम से कम 8 अक्षरों का होना चाहिए'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(L('Passwords do not match', 'दोनों पासवर्ड मेल नहीं खाते'));
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const res = await fetch(`${apiUrl}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || L('Failed to update password', 'पासवर्ड अपडेट नहीं हो सका'));
      }

      setSuccess(true);
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
            <span className="p-3 bg-gradient-to-b from-amber-500/10 to-transparent border border-gold/30 rounded-2xl">
              <img src="/logo.webp" alt={L('Param Darshan', 'परम दर्शन')} className="w-10 h-10 object-contain drop-shadow" />
            </span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-100 flex items-center justify-center gap-2">
            {L('Set New Password', 'नया पासवर्ड सेट करें')}
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            {L('Choose a strong, secure password for your Param Darshan account.', 'अपने परम दर्शन खाते के लिए एक मज़बूत और सुरक्षित पासवर्ड चुनें।')}
          </p>
        </div>

        {success ? (
          <div className="text-center py-4 space-y-4">
            <div className="flex justify-center">
              <span className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-full text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </span>
            </div>
            <h3 className="text-lg font-semibold text-stone-100">{L('Password Updated', 'पासवर्ड अपडेट हो गया')}</h3>
            <p className="text-stone-400 text-sm leading-relaxed">
              {L('Your password has been successfully reset. You may now sign in with your new credentials.', 'आपका पासवर्ड सफलतापूर्वक रीसेट हो गया है। अब आप अपने नए पासवर्ड से साइन इन कर सकते हैं।')}
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-700 to-amber-700 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-sm font-semibold transition shadow-lg"
              >
                {L('Sign In Now', 'अभी साइन इन करें')}
                <ArrowRight className="w-4 h-4" />
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

            {!searchParams.get('token') && (
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  {L('Reset Token', 'रीसेट टोकन')}
                </label>
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={L('Paste your reset token here', 'अपना रीसेट टोकन यहाँ पेस्ट करें')}
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                {L('New Password', 'नया पासवर्ड')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-600 dark:text-stone-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={L('At least 8 characters', 'कम से कम 8 अक्षर')}
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                {L('Confirm New Password', 'नए पासवर्ड की पुष्टि करें')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-600 dark:text-stone-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={L('Confirm password', 'पासवर्ड दोबारा दर्ज करें')}
                  className="w-full pl-9 pr-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full py-2.5 bg-gradient-to-r from-orange-700 to-amber-700 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl text-sm shadow-md transition-all disabled:opacity-50"
            >
              {loading ? L('Updating Password...', 'पासवर्ड अपडेट हो रहा है...') : L('Save New Password', 'नया पासवर्ड सहेजें')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ResetPasswordFallback() {
  const { lang } = useLang();
  return <div className="min-h-[80vh] flex items-center justify-center text-stone-400">{lang === 'hi' ? 'लोड हो रहा है...' : 'Loading...'}</div>;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
