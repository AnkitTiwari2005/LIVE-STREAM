'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Video, Calendar, AlertCircle, LogIn, Sparkles, UserCheck, Lock } from 'lucide-react';
import { OmIcon, DiyaIcon, PranamIcon } from '@/components/icons/SpiritualIcons';
import { decodeJwtClaims, purgeClientSession } from '@/lib/auth-session';
import { useLang } from '@/lib/i18n/context';
import { translateCategoryLabel } from '@/lib/i18n/format';

export default function CreateStreamPage() {
  const router = useRouter();
  const { lang, t: L } = useLang();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [videoQuality, setVideoQuality] = useState<'480p' | '720p'>('480p');
  const [privatePassword, setPrivatePassword] = useState('');
  const [maxViewers, setMaxViewers] = useState<number>(25);
  const [requireLogin, setRequireLogin] = useState<boolean>(true);
  const [scheduledAt, setScheduledAt] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isViewerRole, setIsViewerRole] = useState(false);
  const [activeLiveStream, setActiveLiveStream] = useState<any>(null);
  const [endingActive, setEndingActive] = useState(false);

  useEffect(() => {
    // Check logged in user state
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('pooja_user');
      const storedToken = localStorage.getItem('pooja_token');

      if (!storedToken) {
        setNeedsSignIn(true);
        setError(
          L(
            'Please sign in to your verified Pandit Ji account to setup a live broadcast.',
            'लाइव प्रसारण शुरू करने के लिए कृपया अपने सत्यापित पंडित जी खाते से साइन इन करें।',
          ),
        );
        return;
      }

      const claims = decodeJwtClaims(storedToken);
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (!claims?.sub || parsed.id === claims.sub) {
            setCurrentUser(parsed);
            if (parsed.role === 'VIEWER') {
              setIsViewerRole(true);
            }
          } else {
            localStorage.removeItem('pooja_user');
          }
        } catch {}
      }
    }

    async function checkActiveLiveStream() {
      const storedToken = localStorage.getItem('pooja_token');
      if (!storedToken) return;
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      try {
        const res = await fetch(`${apiUrl}/streams/streamer/active-live`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            setActiveLiveStream(data);
          }
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
    checkActiveLiveStream();
  }, []);

  const handleEndActiveLive = async () => {
    setEndingActive(true);
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    try {
      const res = await fetch(`${apiUrl}/streams/streamer/end-all-active`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setActiveLiveStream(null);
      }
    } catch {}
    setEndingActive(false);
  };

  const handleSwitchAccount = () => {
    purgeClientSession();
    window.location.href = '/login?redirect=/studio/create';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNeedsSignIn(false);

    if (scheduledAt && new Date(scheduledAt).getTime() < Date.now()) {
      setError(L('Scheduled time must be in the future.', 'निर्धारित समय भविष्य का होना चाहिए।'));
      return;
    }

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
          setNeedsSignIn(true);
          setError(L('Your session has expired. Please sign in again.', 'आपका सत्र समाप्त हो गया है। कृपया पुनः साइन इन करें।'));
          return;
        }
        if (res.status === 403) {
          setError(
            L(
              'Access denied: Broadcaster privileges are reserved for verified Pandits and Acharyas.',
              'प्रवेश अस्वीकृत: प्रसारण अधिकार केवल सत्यापित पंडितों और आचार्यों के लिए आरक्षित हैं।',
            ),
          );
          setIsViewerRole(true);
          return;
        }
        throw new Error(data.message || L('Failed to create broadcast', 'प्रसारण बनाया नहीं जा सका'));
      }

      if (visibility === 'PRIVATE') {
        const linkRes = await fetch(`${apiUrl}/private-links`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            streamId: data.id,
            password: privatePassword.trim() || undefined,
            maxViewers: Number(maxViewers) || 25,
            requireLogin,
          }),
        });

        if (!linkRes.ok) {
          const linkErr = await linkRes.json().catch(() => ({}));
          throw new Error(
            linkErr.message ||
              L(
                'Broadcast created, but failed to configure private access link settings',
                'प्रसारण बन गया, किंतु निजी एक्सेस लिंक सेटिंग्स सहेजी नहीं जा सकीं',
              ),
          );
        }
      }

      router.push(`/studio/${data.id}`);
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
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {L('Setup Live Broadcast', 'लाइव प्रसारण सेटअप करें')}
              </h1>
              <p className="text-xs text-stone-400">
                {L('Configure ritual details before entering studio preview', 'स्टूडियो पूर्वावलोकन में प्रवेश से पहले अनुष्ठान विवरण भरें')}
              </p>
            </div>
          </div>

        {/* Active Live Stream Notification & Action Banner */}
        {activeLiveStream && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-950/70 border border-amber-500/60 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <DiyaIcon size={24} className="text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-amber-300 block text-sm">
                  {L('Active Live Stream Running:', 'सक्रिय लाइव प्रसारण जारी है:')} &ldquo;{activeLiveStream.title}&rdquo;
                </span>
                <span>
                  {L(
                    'You already have an ongoing broadcast. Resume it directly or conclude it to start a new pooja session.',
                    'आपका एक प्रसारण पहले से जारी है। इसे सीधे जारी रखें या नया पूजा सत्र शुरू करने के लिए इसे समाप्त करें।',
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/studio/${activeLiveStream.id}`}
                className="px-4 py-2 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-xl text-xs transition shadow-md"
              >
                {L('Resume Broadcast', 'प्रसारण जारी रखें')}
              </Link>
              <button
                type="button"
                onClick={handleEndActiveLive}
                disabled={endingActive}
                className="px-3.5 py-2 bg-stone-900 border border-amber-600/60 hover:bg-red-950/60 text-stone-200 hover:text-red-300 font-semibold rounded-xl text-xs transition"
              >
                {endingActive ? L('Ending...', 'समाप्त हो रहा है...') : L('End Previous Stream', 'पिछला प्रसारण समाप्त करें')}
              </button>
            </div>
          </div>
        )}

        {/* Devotee Role Warning Banner */}
        {isViewerRole && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-950/60 border border-amber-700/60 text-amber-200 text-xs flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 block mb-0.5">
                  {L('Devotee Account Detected', 'भक्त खाता पहचाना गया')}
                </span>
                <span>
                  {lang === 'hi' ? (
                    <>
                      आप वर्तमान में <strong>{currentUser?.name || 'भक्त'}</strong> (भक्त खाता) के रूप में साइन इन हैं। प्रसारण सुविधा केवल सत्यापित पंडित जी व आचार्यों के लिए उपलब्ध है।
                    </>
                  ) : (
                    <>
                      You are currently signed in as <strong>{currentUser?.name || 'Devotee'}</strong> (Devotee Account). Broadcasting is exclusively available for verified Pandit Jis and Acharyas.
                    </>
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-amber-800/40">
              <Link
                href="/streamer/apply"
                className="px-3 py-1.5 bg-orange-700 hover:bg-orange-600 text-white font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" /> {L('Apply as Pandit Ji', 'पंडित जी के रूप में आवेदन करें')}
              </Link>
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" /> {L('Sign in as Pandit Ji', 'पंडित जी खाते से साइन इन करें')}
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
            {needsSignIn && (
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="mt-1 self-start px-3 py-1.5 bg-orange-700 hover:bg-orange-600 text-white font-semibold rounded-lg text-xs transition-colors inline-flex items-center gap-1"
              >
                <LogIn className="w-3.5 h-3.5" /> {L('Sign In to Pandit Ji Account', 'पंडित जी खाते में साइन इन करें')}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              {L('Stream / Pooja Title *', 'प्रसारण / पूजा का शीर्षक *')}
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={L('e.g., Rudrabhishek Pooja & Vedic Chanting Live', 'जैसे: रुद्राभिषेक पूजा व वैदिक मंत्रोच्चार लाइव')}
              className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-300 mb-1.5">
              {L('Description & Sankalp', 'विवरण व संकल्प')}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={L(
                'Explain the significance of this pooja, mantras being recited, or how devotees should participate...',
                'इस पूजा का महत्व, पढ़े जाने वाले मंत्र या भक्त कैसे जुड़ें, यह लिखें...',
              )}
              className="w-full px-4 py-2 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                {L('Sacred Category *', 'पावन श्रेणी *')}
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {translateCategoryLabel(c.name, lang)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                {L('Video Quality (FR-L4)', 'वीडियो गुणवत्ता (FR-L4)')}
              </label>
              <select
                value={videoQuality}
                onChange={(e) => setVideoQuality(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
              >
                <option value="480p">{L('480p SD (Data Saver, Recommended)', '480p SD (डेटा बचत, अनुशंसित)')}</option>
                <option value="720p">{L('720p HD (High Definition)', '720p HD (उच्च गुणवत्ता)')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                {L('Visibility', 'दृश्यता')}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('PUBLIC')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                    visibility === 'PUBLIC'
                      ? 'bg-orange-700 text-white border-orange-600'
                      : 'bg-stone-100 dark:bg-stone-950 text-stone-700 dark:text-stone-400 border-stone-300 dark:border-stone-800'
                  }`}
                >
                  {L('Public Darshan', 'सार्वजनिक दर्शन')}
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('PRIVATE')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                    visibility === 'PRIVATE'
                      ? 'bg-orange-700 text-white border-orange-600'
                      : 'bg-stone-100 dark:bg-stone-950 text-stone-700 dark:text-stone-400 border-stone-300 dark:border-stone-800'
                  }`}
                >
                  {L('Private (Secret Link)', 'निजी (गुप्त लिंक)')}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                {L('Schedule for Later (Optional)', 'बाद के लिए निर्धारित करें (वैकल्पिक)')}
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Private Link Controls (B-16) */}
          {visibility === 'PRIVATE' && (
            <div className="p-4 bg-obsidian border border-gold/20 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-gold flex items-center gap-1.5 uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5" /> {L('Private Session Security Controls', 'निजी सत्र सुरक्षा नियंत्रण')}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    {L('Access Password (Optional)', 'प्रवेश पासवर्ड (वैकल्पिक)')}
                  </label>
                  <input
                    type="text"
                    value={privatePassword}
                    onChange={(e) => setPrivatePassword(e.target.value)}
                    placeholder={L('e.g. Sankalp2026', 'जैसे: Sankalp2026')}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="block text-stone-300 font-semibold mb-1">
                    {L('Max Devotees Cap', 'अधिकतम भक्त सीमा')}
                  </label>
                  <select
                    value={maxViewers}
                    onChange={(e) => setMaxViewers(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-gold"
                  >
                    <option value={10}>{L('10 Devotees', '10 भक्त')}</option>
                    <option value={25}>{L('25 Devotees', '25 भक्त')}</option>
                    <option value={50}>{L('50 Devotees', '50 भक्त')}</option>
                    <option value={100}>{L('100 Devotees', '100 भक्त')}</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300 pt-1">
                <input
                  type="checkbox"
                  checked={requireLogin}
                  onChange={(e) => setRequireLogin(e.target.checked)}
                  className="rounded border-stone-800 text-gold focus:ring-gold"
                />
                <span>{L('Enforce Devotee Account Sign-In (Prevents anonymous access)', 'भक्त खाता साइन-इन अनिवार्य करें (अज्ञात प्रवेश रोकता है)')}</span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isViewerRole}
            className="w-full mt-4 py-3.5 bg-gold hover:bg-gold-deep text-obsidian font-bold rounded-full text-xs sm:text-sm shadow-xl shadow-gold/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <DiyaIcon size={18} />
            <span>
              {loading
                ? L('Entering Studio...', 'स्टूडियो में प्रवेश हो रहा है...')
                : L('Proceed to Camera & Mic Studio Preview', 'कैमरा व माइक स्टूडियो पूर्वावलोकन पर जाएँ')}
            </span>
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}
