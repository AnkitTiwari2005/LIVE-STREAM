'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Video, Calendar, AlertCircle, LogIn, Sparkles, UserCheck } from 'lucide-react';
import { OmIcon, DiyaIcon, PranamIcon } from '@/components/icons/SpiritualIcons';

export default function CreateStreamPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [videoQuality, setVideoQuality] = useState<'480p' | '720p'>('480p');
  const [scheduledAt, setScheduledAt] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isViewerRole, setIsViewerRole] = useState(false);

  useEffect(() => {
    // Check logged in user state
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('pooja_user');
      const storedToken = localStorage.getItem('pooja_token');

      if (!storedToken || !storedUser) {
        setError('Please sign in to your verified Pandit account to setup a live broadcast.');
        return;
      }

      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
        if (parsed.role === 'VIEWER') {
          setIsViewerRole(true);
        }
      } catch {}
    }

    async function loadCategories() {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      try {
        const res = await fetch(`${apiUrl}/admin/categories`);
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
          if (data.length > 0) setCategoryId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    }
    loadCategories();
  }, []);

  const handleSwitchAccount = () => {
    localStorage.removeItem('pooja_token');
    localStorage.removeItem('pooja_user');
    router.push('/login?redirect=/studio/create');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const token = localStorage.getItem('pooja_token');
    if (!token) {
      router.push('/login?redirect=/studio/create');
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const res = await fetch(`${apiUrl}/streams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          title,
          description,
          categoryId,
          visibility,
          videoQuality,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setError('Your session has expired. Please sign in again.');
          return;
        }
        if (res.status === 403) {
          setError('Access denied: Broadcaster privileges are reserved for verified Pandits and Acharyas.');
          setIsViewerRole(true);
          return;
        }
        throw new Error(data.message || 'Failed to create broadcast');
      }

      router.push(`/studio/${data.id}`);
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
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Setup Live Broadcast</h1>
            <p className="text-xs text-stone-400">Configure ritual details before entering studio preview</p>
          </div>
        </div>

        {/* Devotee Role Warning Banner */}
        {isViewerRole && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-950/60 border border-amber-700/60 text-amber-200 text-xs flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 block mb-0.5">Devotee Account Detected</span>
                <span>
                  You are currently signed in as <strong>{currentUser?.name || 'Devotee'}</strong> (Devotee Account). Broadcasting is exclusively available for verified Pandits and Acharyas.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-amber-800/40">
              <Link
                href="/streamer/apply"
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" /> Apply as Pandit
              </Link>
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign in as Pandit
              </button>
            </div>
          </div>
        )}

        {error && !isViewerRole && (
          <div className="mb-6 p-4 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            {error.includes('sign in') && (
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="mt-1 self-start px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In to Pandit Account
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Stream / Pooja Title *
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Rudrabhishek Pooja & Vedic Chanting Live"
              className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              Description & Sankalp
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain the significance of this pooja, mantras being recited, or how devotees should participate..."
              className="w-full px-4 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Sacred Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Video Quality (FR-L4)
              </label>
              <select
                value={videoQuality}
                onChange={(e) => setVideoQuality(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
              >
                <option value="480p">480p SD (Data Saver, Recommended)</option>
                <option value="720p">720p HD (High Definition)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Visibility
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('PUBLIC')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                    visibility === 'PUBLIC'
                      ? 'bg-orange-600 text-white border-orange-500'
                      : 'bg-stone-950 text-stone-400 border-stone-800'
                  }`}
                >
                  Public Darshan
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('PRIVATE')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                    visibility === 'PRIVATE'
                      ? 'bg-orange-600 text-white border-orange-500'
                      : 'bg-stone-950 text-stone-400 border-stone-800'
                  }`}
                >
                  Private (Secret Link)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Schedule for Later (Optional)
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || isViewerRole}
            className="w-full mt-4 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl text-sm shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <DiyaIcon size={18} />
            <span>{loading ? 'Entering Studio...' : 'Proceed to Camera & Mic Studio Preview'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
