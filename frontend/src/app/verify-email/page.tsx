'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Verification token missing from link.');
      return;
    }

    async function verify() {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      try {
        const res = await fetch(`${apiUrl}/auth/verify-email?token=${token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Verification failed');
        setStatus('success');
        setMessage(data.message);
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message);
      }
    }

    verify();
  }, [token]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-3xl p-8 text-center shadow-2xl">
        <span className="text-4xl mb-4 inline-block">🕉️</span>

        {status === 'verifying' && (
          <div>
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-orange-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-white mb-2">Verifying Your Email...</h2>
            <p className="text-xs text-stone-400">Please wait while we validate your credentials.</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-white mb-2">Email Verified Successfully!</h2>
            <p className="text-xs text-stone-300 leading-relaxed mb-6">{message}</p>
            <Link
              href="/login"
              className="inline-block py-2.5 px-6 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-xs transition-colors"
            >
              Sign In to Your Account 🙏
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-white mb-2">Verification Link Expired</h2>
            <p className="text-xs text-red-300 leading-relaxed mb-6">{message}</p>
            <Link
              href="/login"
              className="inline-block py-2.5 px-6 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-xl text-xs transition-colors"
            >
              Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
