'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, CheckCircle2, ShieldCheck, AlertCircle, UploadCloud, FileText, LogIn } from 'lucide-react';

export default function StreamerApplyPage() {
  const router = useRouter();
  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState('Hindi, Sanskrit, English');
  const [specialties, setSpecialties] = useState('Vedic Pooja, Kundli Matching, Vastu Consultation');
  const [documentKey, setDocumentKey] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('pooja_token');
      if (!token) {
        setIsSignedIn(false);
        setError('Please sign in to submit your Pandit verification application.');
      }
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadingDoc(true);

    const token = localStorage.getItem('pooja_token');
    if (!token) {
      setError('Please sign in before uploading verification documents');
      setUploadingDoc(false);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

      // 1. Get presigned upload URL with Bearer token (B-12)
      const preRes = await fetch(`${apiUrl}/storage/presigned-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          folder: 'kyc',
        }),
      });

      const preData = await preRes.json();
      if (!preRes.ok) throw new Error(preData.message || 'Failed to obtain upload token');

      // 2. Upload file binary
      const upRes = await fetch(preData.uploadUrl, {
        method: 'PUT',
        body: file,
      });

      if (!upRes.ok) throw new Error('Failed to upload credential document');

      setDocumentKey(preData.storageKey);
      setDocumentUrl(preData.publicUrl);
    } catch (err: any) {
      setError(err.message || 'File upload failed');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!documentKey) {
      setError('Please upload your Vedic certification or government ID document for KYC verification');
      return;
    }

    setLoading(true);

    const token = localStorage.getItem('pooja_token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
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
          kycDocuments: [{ documentType: 'PAN_OR_CERTIFICATE', storageKey: documentKey, publicUrl: documentUrl }],
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
    <div className="min-h-screen bg-obsidian text-foreground py-12 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-2xl mx-auto px-5 lg:px-8">
        <div className="bg-obsidian-soft border border-gold/25 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gold/10 text-gold border border-gold/30 rounded-2xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">Apply as Verified Pandit</h1>
              <p className="text-xs text-stone-400">Join our sacred circle of certified pandits and Vedic scholars</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
              {!isSignedIn && (
                <Link
                  href="/login?redirect=/streamer/apply"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold hover:bg-gold-deep text-obsidian rounded-full font-bold shrink-0 text-xs shadow"
                >
                  <LogIn className="w-3.5 h-3.5" /> Sign In Now
                </Link>
              )}
            </div>
          )}

          {success ? (
            <div className="text-center p-8 bg-obsidian border border-gold/20 rounded-2xl">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h2 className="font-serif text-xl font-bold text-white mb-2">Application Submitted for Review</h2>
              <p className="text-xs text-stone-300 leading-relaxed mb-6">
                Our Acharya council will review your spiritual credentials and certificates. Once approved, you will receive the Verified Streamer badge and unlock the Pandit Studio.
              </p>
              <Link
                href="/"
                className="inline-block py-2.5 px-6 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs transition-colors shadow"
              >
                Return to Home
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                  Vedic Bio &amp; Lineage *
                </label>
                <textarea
                  required
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share your spiritual education, years conducting poojas, temples associated with, or astrology experience..."
                  className="w-full px-4 py-2.5 bg-obsidian border border-gold/20 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-gold transition"
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
                  className="w-full px-4 py-2 bg-obsidian border border-gold/20 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-gold transition"
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
                  className="w-full px-4 py-2 bg-obsidian border border-gold/20 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-gold transition"
                />
              </div>

              {/* Compliance Note regarding Aadhaar */}
              <div className="p-4 bg-obsidian border border-gold/15 rounded-2xl">
                <span className="text-xs font-semibold text-stone-300 flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-gold" /> Identity &amp; Certificate Verification
                </span>
                <p className="text-[11px] text-stone-400 leading-relaxed mb-3">
                  Accepted proofs: Government PAN card, Vedic academy degree, or certified astrology diploma.
                  <br />
                  <span className="text-gold-soft font-medium">Important: Do NOT upload unmasked Aadhaar cards. Documents are deleted within 30 days of verification.</span>
                </p>

                <div className="flex flex-col gap-2">
                  <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-gold/30 hover:border-gold rounded-xl cursor-pointer bg-obsidian-soft transition">
                    <UploadCloud className="w-4 h-4 text-gold" />
                    <span className="text-xs text-stone-300">
                      {uploadingDoc ? 'Uploading credential securely...' : 'Choose Certificate / ID Document'}
                    </span>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept="image/*,application/pdf"
                      className="hidden"
                      disabled={uploadingDoc}
                    />
                  </label>

                  {documentKey && (
                    <div className="flex items-center gap-2 p-2 bg-obsidian-soft rounded-lg text-xs text-stone-300">
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="truncate flex-1 font-mono">{documentKey}</span>
                      <span className="text-emerald-400 font-semibold text-[10px]">Attached ✓</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || uploadingDoc}
                className="w-full py-3 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs sm:text-sm shadow-xl shadow-gold/20 transition-all disabled:opacity-50"
              >
                {loading ? 'Submitting Application...' : 'Submit Verification Profile'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
