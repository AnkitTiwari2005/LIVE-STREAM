'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AboutCta() {
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
            Deepen your spiritual journey with daily Darshan
          </h2>
          <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed">
            Participate in authentic live sanctum aartis, offer sacred dakshina, and consecrate personalized family poojas.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/pooja"
              className="rounded-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white dark:bg-gold dark:text-obsidian px-8 py-3.5 text-xs sm:text-sm font-bold shadow-xl transition"
            >
              Explore Sanctum Poojas
            </Link>
            <Link
              href="/account"
              className="rounded-full border border-stone-300 dark:border-gold/40 bg-stone-100 dark:bg-obsidian-soft px-6 py-3.5 text-xs sm:text-sm font-bold text-stone-800 dark:text-gold-pale hover:bg-stone-200 dark:hover:bg-gold/10 transition"
            >
              My Sacred Account
            </Link>
          </div>
        </>
      ) : (
        <>
          <h2 className="font-serif text-3xl font-bold text-stone-900 dark:text-white mb-3">
            Begin with 100 free coins and your first live Darshan
          </h2>
          <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm max-w-md mx-auto mb-6 leading-relaxed">
            Create your account in under 30 seconds and receive divine blessings directly from Bharat’s holy sanctums.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="rounded-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white dark:bg-gold dark:text-obsidian px-8 py-3.5 text-xs sm:text-sm font-bold shadow-xl transition"
            >
              Join Free &amp; Claim 100 Coins
            </Link>
            <Link
              href="/"
              className="rounded-full border border-stone-300 dark:border-gold/40 bg-stone-100 dark:bg-obsidian-soft px-6 py-3.5 text-xs sm:text-sm font-bold text-stone-800 dark:text-gold-pale hover:bg-stone-200 dark:hover:bg-gold/10 transition"
            >
              Watch Live Mandir Darshan
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
