'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  UploadCloud,
  FileText,
  LogIn,
  Video,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { VerifiedPanditBadge } from '@/components/icons/SpiritualIcons';
import { apiFetch } from '@/lib/api';

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

  // Role & Existing Status Guards
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [existingRole, setExistingRole] = useState<'STREAMER' | 'ADMIN' | null>(null);
  const [existingKycStatus, setExistingKycStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('pooja_token');
      const storedUser = localStorage.getItem('pooja_user');

      if (!token) {
        setIsSignedIn(false);
        setError('Please sign in to submit your Pandit verification application.');
        setCheckingExisting(false);
        return;
      }

      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          if (u.role === 'STREAMER' || u.role === 'ADMIN') {
            setExistingRole(u.role);
            setCheckingExisting(false);
            router.replace('/studio/create');
            return;
          }
        } catch {}
      }

      // Query current profile status from backend to verify if already applied
      apiFetch('/streamers/me')
        .then((profile) => {
          if (profile?.user?.role === 'STREAMER' || profile?.kycStatus === 'APPROVED') {
            setExistingRole('STREAMER');
            router.replace('/studio/create');
            return;
          }
          if (profile?.kycStatus) {
            setExistingKycStatus(profile.kycStatus);
          }
        })
        .catch(() => {})
        .finally(() => {
          setCheckingExisting(false);
        });
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
          // N-01: documentType must match one of the allowed values in KycDocDto @IsIn list.
          // publicUrl is NOT sent — it is a forbidden extra property (forbidNonWhitelisted).
          // The storageKey is the value returned by the presigned-upload endpoint (kyc/<userId>_<random>.<ext>).
          kycDocuments: documentKey ? [{ documentType: 'PAN_CARD', storageKey: documentKey }] : [],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Application failed');

      setSuccess(true);
      setTimeout(() => {
        router.push('/streamer/status');
      }, 2500);
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
          {checkingExisting ? (
            <div className="py-16 text-center space-y-3">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-gold mb-2" />
              <p className="text-xs text-stone-400">Verifying spiritual credentials...</p>
            </div>
          ) : existingRole === 'STREAMER' ? (
            /* Already Verified Pandit State */
            <div className="text-center p-6 sm:p-8 space-y-4">
              <div className="p-3.5 bg-gold/15 text-gold border border-gold/30 rounded-3xl w-fit mx-auto shadow-lg shadow-gold/10">
                <VerifiedPanditBadge size={44} />
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
                You are Already a Verified Vedic Pandit
              </h1>
              <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto leading-relaxed">
                Your account is already KYC verified and holds full live broadcasting privileges on Shubhdarshan. You do not need to re-apply.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Link
                  href="/studio/create"
                  className="w-full sm:w-auto py-2.5 px-6 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs transition shadow-md flex items-center justify-center gap-2"
                >
                  <Video className="w-4 h-4" /> Go Live in Studio
                </Link>
                <Link
                  href="/studio/streams"
                  className="w-full sm:w-auto py-2.5 px-6 bg-stone-900 hover:bg-stone-800 text-stone-200 font-bold rounded-full text-xs transition border border-stone-700 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-gold" /> My Sacred Broadcasts
                </Link>
              </div>
            </div>
          ) : existingRole === 'ADMIN' ? (
            /* Administrator Account State */
            <div className="text-center p-6 sm:p-8 space-y-4">
              <div className="p-3 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-2xl w-fit mx-auto">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Platform Administrator Account
              </h1>
              <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto leading-relaxed">
                You are signed in as an administrator. Admin accounts manage incoming Pandit verification applications from the Admin Console.
              </p>
              <div className="pt-3">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 py-2.5 px-6 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs transition shadow"
                >
                  <span>Open Admin Console</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : existingKycStatus === 'PENDING' ? (
            /* Existing Application Under Review */
            <div className="text-center p-6 sm:p-8 space-y-4">
              <div className="p-3 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-2xl w-fit mx-auto">
                <Clock className="w-8 h-8" />
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Application Under Active Review
              </h1>
              <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto leading-relaxed">
                Your Pandit verification application has already been submitted and is currently being reviewed by our platform verification team.
              </p>
              <div className="pt-3">
                <Link
                  href="/streamer/status"
                  className="inline-flex items-center gap-2 py-2.5 px-6 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs transition shadow"
                >
                  <span>View Application Status &amp; Updates</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : existingKycStatus === 'MORE_INFO_NEEDED' ? (
            /* Additional Info Requested */
            <div className="text-center p-6 sm:p-8 space-y-4">
              <div className="p-3 bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-2xl w-fit mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Additional Information Requested
              </h1>
              <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto leading-relaxed">
                Our moderator team has requested clarification or supplementary documents for your Pandit application.
              </p>
              <div className="pt-3">
                <Link
                  href="/streamer/status"
                  className="inline-flex items-center gap-2 py-2.5 px-6 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs transition shadow"
                >
                  <span>View Moderator Feedback</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            /* Standard Application Form for New Devotee Applicants */
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gold/10 text-gold border border-gold/30 rounded-2xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    Apply as Verified Pandit
                  </h1>
                  <p className="text-xs text-stone-400">
                    Join our sacred circle of certified pandits and Vedic scholars
                  </p>
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
                  <h2 className="font-serif text-xl font-bold text-white mb-2">
                    Application Submitted for Review
                  </h2>
                  <p className="text-xs text-stone-300 leading-relaxed mb-6">
                    Our platform verification team will review your spiritual credentials and certificates. Once approved, you will receive the Verified Streamer badge and unlock the Pandit Studio. Redirecting to application tracking...
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                      href="/streamer/status"
                      className="w-full sm:w-auto py-2.5 px-6 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs transition-colors shadow flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      View Application Status &amp; Updates
                    </Link>
                    <Link
                      href="/"
                      className="w-full sm:w-auto py-2.5 px-6 bg-stone-900 hover:bg-stone-800 text-stone-300 font-bold rounded-full text-xs transition-colors border border-stone-700"
                    >
                      Return to Home
                    </Link>
                  </div>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
