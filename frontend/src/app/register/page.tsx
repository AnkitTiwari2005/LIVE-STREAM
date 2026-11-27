'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, User, ShieldAlert, CheckCircle2, Sparkles } from 'lucide-react';
import { OmIcon, CoinIcon, PranamIcon } from '@/components/icons/SpiritualIcons';

import { getSafeRedirect } from '@/lib/api';
import { isJwtTokenExpired } from '@/lib/auth-session';
import { useLang } from '@/lib/i18n/context';

export default function RegisterPage() {
  const router = useRouter();
  const { lang } = useLang();
  const L = (en: string, hi: string) => (lang === 'hi' ? hi : en);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAgeConfirmed18Plus, setIsAgeConfirmed18Plus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // Skip the form only for a token that is still valid; an expired one must reach the form
      // (and its "session expired" notice) instead of bouncing through /account.
      const token = localStorage.getItem('pooja_token');
      if (token && !isJwtTokenExpired(token)) {
        const target = getSafeRedirect(new URLSearchParams(window.location.search).get('redirect'));
        router.replace(target || '/account');
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const safe = getSafeRedirect(params.get('redirect'));
      if (safe) {
        setRedirectUrl(safe);
      }
    }
  }, [router]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isAgeConfirmed18Plus) {
      setError(L('You must confirm you are 18 years of age or older in accordance with the DPDP Act, 2023.', 'DPDP अधिनियम, 2023 के अनुसार आपको यह पुष्टि करनी होगी कि आपकी आयु 18 वर्ष या उससे अधिक है।'));
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
        throw new Error(data.message || L('Registration failed.', 'पंजीकरण असफल रहा।'));
      }

      setSuccess(
        L(
          'Account created! We have sent a sacred activation link to your email. Please click the link in your inbox to verify your account and claim your 100 Free Welcome Coins.',
          'खाता बन गया! हमने आपके ईमेल पर एक सक्रियण लिंक भेजा है। कृपया अपने इनबॉक्स में जाकर लिंक पर क्लिक करें और अपने 100 मुफ़्त स्वागत कॉइन प्राप्त करें।',
        ),
      );
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
              <img src="/logo.webp" alt={L('Param Darshan', 'परम दर्शन')} className="w-10 h-10 object-contain drop-shadow" />
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">{L('Create Devotee Account', 'भक्त खाता बनाएँ')}</h2>
          <p className="text-stone-400 text-xs mt-1.5 leading-relaxed">
            {L('Join thousands receiving daily authentic temple Darshan, Aarti, and blessings', 'दैनिक प्रामाणिक मंदिर दर्शन, आरती और आशीर्वाद पाने वाले हज़ारों श्रद्धालुओं से जुड़ें')}
          </p>
          <div className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold-pale text-xs font-bold">
            <CoinIcon size={14} />
            <span>{L('100 Free Darshan Coins (20 mins free) upon registration!', 'पंजीकरण पर 100 मुफ़्त दर्शन कॉइन (20 मिनट निःशुल्क)!')}</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center p-6 bg-obsidian border border-gold/20 rounded-2xl">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="font-serif text-xl font-bold text-white mb-2">{L('Check Your Inbox', 'अपना इनबॉक्स देखें')}</h3>
            <p className="text-xs text-stone-300 mb-6 leading-relaxed">{success}</p>
            <Link
              href={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : "/login"}
              className="inline-block py-2.5 px-6 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs transition-colors shadow"
            >
              {L('Proceed to Sign In', 'साइन इन पर जाएँ')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                {L('Full Name', 'पूरा नाम')}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gold-soft absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={L('Pandit / Devotee Name', 'पंडित / भक्त का नाम')}
                  className="w-full pl-10 pr-3 py-2.5 bg-obsidian border border-gold/20 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-gold transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                {L('Email Address', 'ईमेल पता')}
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
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                {L('Password (min 8 chars)', 'पासवर्ड (न्यूनतम 8 अक्षर)')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gold-soft absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 bg-obsidian border border-gold/20 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-gold transition"
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
                  className="mt-0.5 rounded border-stone-700 text-gold focus:ring-gold h-4 w-4 bg-obsidian"
                />
                <span className="text-[11px] text-stone-400 leading-tight select-none">
                  {lang === 'hi' ? (
                    <>
                      मैं पुष्टि करता/करती हूँ कि <strong>मेरी आयु 18 वर्ष या उससे अधिक है</strong> और मैं भारत के DPDP अधिनियम, 2023 के अंतर्गत{' '}
                      <Link href="/terms" target="_blank" className="text-gold underline">सेवा की शर्तों</Link>{' '}
                      एवं{' '}
                      <Link href="/privacy" target="_blank" className="text-gold underline">गोपनीयता नीति</Link>{' '}
                      से सहमत हूँ।
                    </>
                  ) : (
                    <>
                      I confirm that <strong>I am 18 years of age or older</strong> and I agree to the{' '}
                      <Link href="/terms" target="_blank" className="text-gold underline">Terms of Service</Link>{' '}
                      and{' '}
                      <Link href="/privacy" target="_blank" className="text-gold underline">Privacy Policy</Link>{' '}
                      under India&apos;s DPDP Act, 2023.
                    </>
                  )}
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs sm:text-sm shadow-lg shadow-gold/20 transition-all disabled:opacity-50"
            >
              {loading ? L('Creating Account...', 'खाता बनाया जा रहा है...') : L('Create Free Account (+100 Coins)', 'निःशुल्क खाता बनाएँ (+100 कॉइन)')}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-stone-400">
          {L('Already have an account?', 'क्या आपका पहले से खाता है?')}{' '}
          <Link
            href={redirectUrl ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : "/login"}
            className="text-gold hover:underline font-bold"
          >
            {L('Sign In', 'साइन इन करें')}
          </Link>
        </div>
      </div>
    </div>
  );
}
