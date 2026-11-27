'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLang } from '@/lib/i18n/context';

export default function AboutCta() {
  const { t: L } = useLang();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('pooja_token');
    setIsLoggedIn(!!token);
  }, []);

  return (
    <div className="rounded-3xl border border-stone-200 dark:border-gold/30 bg-white dark:bg-obsidian-soft p-8 sm:p-12 text-center shadow-xl dark:shadow-2xl relative overflow-hidden">
      {isLoggedIn ? (
        <>
          <h2 className="font-serif text-3xl font-bold text-stone-900 dark:text-white mb-3">
            {L('Deepen your spiritual journey with daily Darshan', 'दैनिक दर्शन के साथ अपनी आध्यात्मिक यात्रा को प्रगाढ़ बनाएँ')}
          </h2>
          <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed">
            {L(
              'Participate in authentic live sanctum aartis, offer sacred dakshina, and consecrate personalized family poojas.',
              'पावन मंदिर आरती में लाइव सहभागी बनें, श्रद्धानुसार दक्षिणा अर्पित करें और परिवार के लिए संकल्पित पूजा कराएँ।',
            )}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/pooja"
              className="rounded-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white dark:bg-gold dark:text-obsidian px-8 py-3.5 text-xs sm:text-sm font-bold shadow-xl transition"
            >
              {L('Explore Sanctum Poojas', 'पावन पूजाएँ देखें')}
            </Link>
            <Link
              href="/account"
              className="rounded-full border border-stone-300 dark:border-gold/40 bg-stone-100 dark:bg-obsidian-soft px-6 py-3.5 text-xs sm:text-sm font-bold text-stone-800 dark:text-gold-pale hover:bg-stone-200 dark:hover:bg-gold/10 transition"
            >
              {L('My Sacred Account', 'मेरा पावन खाता')}
            </Link>
          </div>
        </>
      ) : (
        <>
          <h2 className="font-serif text-3xl font-bold text-stone-900 dark:text-white mb-3">
            {L('Begin with 100 free coins and your first live Darshan', '100 निःशुल्क कॉइन और अपने पहले लाइव दर्शन के साथ आरंभ करें')}
          </h2>
          <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed">
            {L(
              'Create your account in under 30 seconds and receive divine blessings directly from Bharat’s holy sanctums.',
              '30 सेकंड से भी कम समय में अपना खाता बनाएँ और भारत के पावन तीर्थों से सीधे दिव्य आशीर्वाद प्राप्त करें।',
            )}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="rounded-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white dark:bg-gold dark:text-obsidian px-8 py-3.5 text-xs sm:text-sm font-bold shadow-xl transition"
            >
              {L('Join Free & Claim 100 Coins', 'निःशुल्क जुड़ें व 100 कॉइन पाएँ')}
            </Link>
            <Link
              href="/"
              className="rounded-full border border-stone-300 dark:border-gold/40 bg-stone-100 dark:bg-obsidian-soft px-6 py-3.5 text-xs sm:text-sm font-bold text-stone-800 dark:text-gold-pale hover:bg-stone-200 dark:hover:bg-gold/10 transition"
            >
              {L('Watch Live Mandir Darshan', 'लाइव मंदिर दर्शन देखें')}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
