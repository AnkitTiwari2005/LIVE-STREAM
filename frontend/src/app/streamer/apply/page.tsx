'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function StreamerApplyPage() {
  const router = useRouter();
  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState('Hindi, Sanskrit, English');
  const [specialties, setSpecialties] = useState('Vedic Pooja, Kundli Matching, Vastu Consultation');
  const [documentKey, setDocumentKey] = useState('kyc_demo_certificate.pdf');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const token = localStorage.getItem('pooja_token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiUrl}/streamers/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bio,
          languages: languages.split(',').map((s) => s.trim()).filter(Boolean),
          specialties: specialties.split(',').map((s) => s.trim()).filter(Boolean),
          kycDocuments: [{ documentType: 'PAN_OR_CERTIFICATE', storageKey: documentKey }],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Application failed');

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-orange-600/20 text-orange-400 rounded-2xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Apply as Verified Streamer</h1>
            <p className="text-xs text-stone-400">Join our sacred circle of certified pandits and Vedic astrologers</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center p-8 bg-stone-950 border border-stone-800 rounded-2xl">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-white mb-2">Application Submitted for Review</h2>
            <p className="text-xs text-stone-300 leading-relaxed mb-6">
              Our administrative team will review your spiritual credentials and certificates. Once approved, you will receive the Verified Streamer badge and unlock the Pandit Studio.
            </p>
            <a
              href="/"
              className="inline-block py-2.5 px-6 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl text-xs transition-colors"
            >
              Return to Home
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Vedic Bio & Lineage *
              </label>
              <textarea
                required
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your spiritual education, years conducting poojas, temples associated with, or astrology experience..."
                className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Languages Spoken (comma separated) *
              </label>
              <input
                type="text"
                required
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder="Hindi, Sanskrit, English, Punjabi"
                className="w-full px-4 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Sacred Specialties (comma separated) *
              </label>
              <input
                type="text"
                required
                value={specialties}
                onChange={(e) => setSpecialties(e.target.value)}
                placeholder="Rudrabhishek, Navgrah Shanti, Kundli Match, Vastu"
                className="w-full px-4 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Compliance Note regarding Aadhaar */}
            <div className="p-4 bg-stone-950 border border-stone-800 rounded-2xl">
              <span className="text-xs font-semibold text-stone-300 flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-4 h-4 text-orange-400" /> Identity & Certificate Verification
              </span>
              <p className="text-[11px] text-stone-400 leading-relaxed mb-3">
                Accepted proofs: Government PAN card, Vedic academy degree, or certified astrology diploma.
                <br />
                <span className="text-amber-400 font-medium">Important: Do NOT upload unmasked Aadhaar cards. Documents are deleted within 30 days of verification.</span>
              </p>
              <input
                type="text"
                value={documentKey}
                onChange={(e) => setDocumentKey(e.target.value)}
                placeholder="Certificate reference or secure storage key"
                className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-300"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl text-sm shadow-xl transition-all disabled:opacity-50"
            >
              {loading ? 'Submitting Application...' : 'Submit Verification Profile'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
