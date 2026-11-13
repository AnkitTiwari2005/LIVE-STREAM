'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldOff, Home } from 'lucide-react';

interface KickedScreenProps {
  reason?: string;
  blocked: boolean;
}

export function KickedScreen({ reason, blocked }: KickedScreenProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          router.push('/');
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-red-800/50 shadow-2xl p-7 text-center space-y-5">
        <div className="flex justify-center">
          <div className="p-3.5 rounded-full bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 shadow-sm">
            <ShieldOff className="w-8 h-8" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-stone-900 dark:text-white font-serif">
            Removed from Session
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            You have been respectfully removed from this sacred session.
          </p>
          {reason && (
            <p className="text-xs text-stone-500 italic mt-1">
              Reason: {reason}
            </p>
          )}
        </div>

        <div className="rounded-xl px-4 py-3 border transition-colors bg-red-50 dark:bg-stone-800/80 border-red-200 dark:border-stone-700/50">
          {blocked ? (
            <p className="text-xs text-red-700 dark:text-red-400 font-semibold">
              You are not permitted to rejoin this session.
            </p>
          ) : (
            <p className="text-xs text-amber-800 dark:text-amber-400 font-semibold">
              You may rejoin by refreshing the page.
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold transition shadow-md"
          >
            <Home className="w-4 h-4" />
            Return to Home
          </button>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Redirecting in {countdown}s…
          </p>
        </div>
      </div>
    </div>
  );
}
