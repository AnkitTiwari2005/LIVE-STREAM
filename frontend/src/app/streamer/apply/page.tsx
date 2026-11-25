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
  SlidersHorizontal,
  X as XIcon,
} from 'lucide-react';
import { VerifiedPanditBadge } from '@/components/icons/SpiritualIcons';
import { apiFetch } from '@/lib/api';

// ─── Predefined Lists ───────────────────────────────────────────────────────

const LANGUAGE_OPTIONS = [
  'Hindi', 'Sanskrit', 'English', 'Tamil', 'Telugu', 'Kannada',
  'Malayalam', 'Bengali', 'Marathi', 'Punjabi', 'Gujarati', 'Odia',
  'Assamese', 'Urdu', 'Maithili', 'Konkani', 'Dogri', 'Kashmiri',
  'Manipuri', 'Sindhi', 'Nepali', 'Bodo', 'Santhali',
];

const SPECIALTY_OPTIONS = [
  'Vedic Pooja', 'Kundli Matching / Astrology', 'Vastu Consultation',
  'Havan & Yagya', 'Marriage Rituals', 'Satyanarayan Katha',
  'Rudrabhishek', 'Navagraha Puja', 'Griha Pravesh',
  'Naming Ceremony (Naamkaran)', 'Pitru Paksha Rituals', 'Ganesh Puja',
  'Lakshmi Puja', 'Durga Puja', 'Shiv Puja', 'Surya Puja',
  'Planetary Remedies', 'Numerology', 'Palmistry',
  'Tarot & Prashna Jyotish',
];

// ─── Upload slot definition ──────────────────────────────────────────────────

interface UploadSlot {
  id: string;
  label: string;
  hint: string;
  required: boolean;
  documentType: string;
  accept: string;
}

const UPLOAD_SLOTS: UploadSlot[] = [
  {
    id: 'photograph',
    label: 'Upload Your Photograph',
    hint: 'Clear recent passport-size photo (JPG/PNG)',
    required: true,
    documentType: 'PAN_OR_CERTIFICATE',
    accept: 'image/*',
  },
  {
    id: 'pan',
    label: 'Upload Your PAN Card',
    hint: 'Government-issued PAN Card (optional - for TDS/tax records)',
    required: false,
    documentType: 'PAN_CARD',
    accept: 'image/*,application/pdf',
  },
  {
    id: 'id',
    label: 'Upload Aadhaar / Any Other Legal ID Proof',
    hint: 'Mask your Aadhaar number. Passport or Voter ID also accepted.',
    required: true,
    documentType: 'AADHAAR',
    accept: 'image/*,application/pdf',
  },
  {
    id: 'degree',
    label: 'Upload Degree / Qualification Certificate',
    hint: 'Vedic academy degree or certified astrology diploma (optional)',
    required: false,
    documentType: 'DEGREE_CERTIFICATE',
    accept: 'image/*,application/pdf',
  },
];

// ─── Multi-select pill component ─────────────────────────────────────────────

function PillSelect({
  options,
  selected,
  onChange,
  label,
  required,
}: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  label: string;
  required?: boolean;
}) {
  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-stone-300 mb-2">
        {label} {required && <span className="text-gold">*</span>}
      </label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((s) => (
            <span
              key={s}
              className="flex items-center gap-1 px-2.5 py-1 bg-gold/20 border border-gold/40 rounded-full text-[11px] font-semibold text-gold-pale"
            >
              {s}
              <button
                type="button"
                onClick={() => toggle(s)}
                className="ml-0.5 text-gold/60 hover:text-gold transition"
              >
                <XIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 p-3 bg-obsidian border border-gold/20 rounded-xl max-h-44 overflow-y-auto">
        {options
          .filter((o) => !selected.includes(o))
          .map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className="px-2.5 py-1 rounded-full border border-stone-700 bg-obsidian-soft text-stone-300 hover:border-gold/50 hover:text-gold-pale text-[11px] transition"
            >
              {opt}
            </button>
          ))}
        {options.filter((o) => !selected.includes(o)).length === 0 && (
          <span className="text-[11px] text-stone-500 italic">All options selected</span>
        )}
      </div>
      {selected.length === 0 && required && (
        <p className="mt-1 text-[10px] text-stone-500">Select at least one option</p>
      )}
    </div>
  );
}

// ─── Single upload zone ──────────────────────────────────────────────────────

function UploadZone({
  slot,
  storageKey,
  uploading,
  onUpload,
}: {
  slot: UploadSlot;
  storageKey: string | null;
  uploading: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-stone-300">
          {slot.label}
          {slot.required ? (
            <span className="text-gold ml-1">*</span>
          ) : (
            <span className="text-stone-500 ml-1 font-normal">(optional)</span>
          )}
        </span>
        {storageKey && (
          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Attached
          </span>
        )}
      </div>
      <label
        className={`flex items-center justify-center gap-2 p-3 border border-dashed rounded-xl cursor-pointer transition ${
          storageKey
            ? 'border-emerald-500/50 bg-emerald-950/20'
            : 'border-gold/30 hover:border-gold bg-obsidian-soft'
        } ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {storageKey ? (
          <FileText className="w-4 h-4 text-emerald-400" />
        ) : (
          <UploadCloud className="w-4 h-4 text-gold" />
        )}
        <span className="text-xs text-stone-300">
          {uploading
            ? 'Uploading securely...'
            : storageKey
            ? 'Uploaded — click to replace'
            : slot.hint}
        </span>
        <input
          type="file"
          onChange={onUpload}
          accept={slot.accept}
          className="hidden"
          disabled={uploading}
        />
      </label>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function StreamerApplyPage() {
  const router = useRouter();
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['Hindi', 'Sanskrit', 'English']);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(['Vedic Pooja', 'Kundli Matching / Astrology', 'Vastu Consultation']);
  const [experienceYears, setExperienceYears] = useState(5);
  const [experienceInput, setExperienceInput] = useState('5');

  // 4 upload slots
  const [uploadKeys, setUploadKeys] = useState<Record<string, string | null>>({
    photograph: null,
    pan: null,
    id: null,
    degree: null,
  });
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

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

  const handleFileUpload = async (
    slotId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadingSlot(slotId);

    const token = localStorage.getItem('pooja_token');
    if (!token) {
      setError('Please sign in before uploading verification documents');
      setUploadingSlot(null);
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

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

      const upRes = await fetch(preData.uploadUrl, {
        method: 'PUT',
        body: file,
      });

      if (!upRes.ok) throw new Error('Failed to upload document');

      setUploadKeys((prev) => ({ ...prev, [slotId]: preData.storageKey }));
    } catch (err: any) {
      setError(err.message || 'File upload failed');
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedLanguages.length === 0) {
      setError('Please select at least one language');
      return;
    }
    if (selectedSpecialties.length === 0) {
      setError('Please select at least one sacred specialty');
      return;
    }

    const requiredSlots = UPLOAD_SLOTS.filter((s) => s.required);
    for (const slot of requiredSlots) {
      if (!uploadKeys[slot.id]) {
        setError(`Please upload: ${slot.label}`);
        return;
      }
    }

    setLoading(true);

    const token = localStorage.getItem('pooja_token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

      // Build kycDocuments array from all uploaded slots
      const kycDocuments = UPLOAD_SLOTS.filter((slot) => uploadKeys[slot.id]).map((slot) => ({
        documentType: slot.documentType,
        storageKey: uploadKeys[slot.id],
      }));

      // Prepend experience and phone to bio
      const bioWithExp = `[${experienceYears} year${experienceYears !== 1 ? 's' : ''} of experience | Contact: +91-${phone}] ${bio}`.trim();

      const res = await fetch(`${apiUrl}/streamers/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bio: bioWithExp,
          languages: selectedLanguages,
          specialties: selectedSpecialties,
          kycDocuments,
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
            <div className="text-center p-6 sm:p-8 space-y-4">
              <div className="p-3.5 bg-gold/15 text-gold border border-gold/30 rounded-3xl w-fit mx-auto shadow-lg shadow-gold/10">
                <VerifiedPanditBadge size={44} />
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
                You are Already a Verified Vedic Pandit
              </h1>
              <p className="text-xs sm:text-sm text-stone-300 max-w-md mx-auto leading-relaxed">
                Your account is already KYC verified and holds full live broadcasting privileges on Param Darshan.
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
                  <span>View Application Status & Updates</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : existingKycStatus === 'MORE_INFO_NEEDED' ? (
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
                      View Application Status & Updates
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
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Vedic Bio */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      Vedic Bio & Lineage <span className="text-gold">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Share your spiritual education, temples associated with, or astrology experience..."
                      className="w-full px-4 py-2.5 bg-obsidian border border-gold/20 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-gold transition"
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                      WhatsApp / Contact Number <span className="text-gold">*</span>
                    </label>
                    <div className="flex items-center bg-obsidian border border-gold/20 rounded-xl overflow-hidden focus-within:border-gold transition">
                      <span className="px-3 py-2 text-xs text-stone-400 border-r border-gold/20 shrink-0 bg-obsidian-soft">+91</span>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="10-digit mobile number"
                        pattern="[6-9][0-9]{9}"
                        title="Enter a valid 10-digit Indian mobile number"
                        className="flex-1 px-3 py-2 bg-transparent text-xs sm:text-sm text-white focus:outline-none"
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-stone-500">We will contact you on WhatsApp for verification</p>
                  </div>

                  {/* Experience Slider + Number Input */}
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-3 flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-gold-soft" />
                      Years of Experience
                    </label>
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center h-8">
                          <input
                            type="range"
                            min={1}
                            max={30}
                            value={experienceYears}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setExperienceYears(v);
                              setExperienceInput(String(v));
                            }}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-amber-500"
                            style={{
                              background: `linear-gradient(to right, #d97706 0%, #d97706 ${((experienceYears - 1) / 29) * 100}%, #374151 ${((experienceYears - 1) / 29) * 100}%, #374151 100%)`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-stone-500 -mt-0.5">
                          <span>1 yr</span>
                          <span>15 yrs</span>
                          <span>30 yrs</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 h-8">
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={experienceInput}
                          onChange={(e) => {
                            setExperienceInput(e.target.value);
                            const v = Math.min(30, Math.max(1, Number(e.target.value)));
                            if (!isNaN(v)) setExperienceYears(v);
                          }}
                          onBlur={() => {
                            const v = Math.min(30, Math.max(1, Number(experienceInput) || 1));
                            setExperienceYears(v);
                            setExperienceInput(String(v));
                          }}
                          className="w-14 text-center px-2 py-1 bg-obsidian border border-gold/30 rounded-lg text-sm font-bold text-gold focus:outline-none focus:border-gold"
                        />
                        <span className="text-xs text-stone-400">yr{experienceYears !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>

                  {/* Languages Multi-select */}
                  <PillSelect
                    label="Languages Spoken"
                    options={LANGUAGE_OPTIONS}
                    selected={selectedLanguages}
                    onChange={setSelectedLanguages}
                    required
                  />

                  {/* Specialties Multi-select */}
                  <PillSelect
                    label="Sacred Specialties"
                    options={SPECIALTY_OPTIONS}
                    selected={selectedSpecialties}
                    onChange={setSelectedSpecialties}
                    required
                  />

                  {/* Document Uploads */}
                  <div className="p-4 bg-obsidian border border-gold/15 rounded-2xl space-y-4">
                    <span className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-gold" /> Identity & Document Verification
                    </span>
                    <p className="text-[11px] text-stone-400 leading-relaxed -mt-2">
                      Upload clear copies of the documents below.{' '}
                      <span className="text-gold-soft font-medium">
                        Important: Do NOT upload unmasked Aadhaar cards. All documents are deleted within 30 days of verification.
                      </span>
                    </p>

                    {UPLOAD_SLOTS.map((slot) => (
                      <UploadZone
                        key={slot.id}
                        slot={slot}
                        storageKey={uploadKeys[slot.id]}
                        uploading={uploadingSlot === slot.id}
                        onUpload={(e) => handleFileUpload(slot.id, e)}
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || uploadingSlot !== null}
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
