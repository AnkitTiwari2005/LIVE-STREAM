'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Video,
  Calendar,
  Clock,
  Radio,
  Edit,
  Trash2,
  Plus,
  Play,
  AlertCircle,
  CheckCircle2,
  X,
  Lock,
} from 'lucide-react';
import { OmIcon, DiyaIcon, PranamIcon } from '@/components/icons/SpiritualIcons';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useLang } from '@/lib/i18n/context';
import { formatLocaleDate, formatLocaleDateTime, formatMins, translateCategoryLabel } from '@/lib/i18n/format';

const STREAM_STATUS_HI: Record<string, string> = {
  LIVE: 'लाइव',
  SCHEDULED: 'निर्धारित',
  ENDED: 'समाप्त',
  CANCELLED: 'रद्द',
};

const toLocalDatetimeInputValue = (dateInput: string | Date): string => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function MyStreamsPage() {
  const router = useRouter();
  const toast = useToast();
  const { lang, t: L } = useLang();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [myStreams, setMyStreams] = useState<any[]>([]);
  const [pastStreams, setPastStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Stream Modal state
  const [editStream, setEditStream] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [originalScheduledAt, setOriginalScheduledAt] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadStreams = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mine, past] = await Promise.all([
        apiFetch('/streams/streamer/mine').catch(() => []),
        apiFetch('/streams/streamer/past').catch(() => []),
      ]);
      setMyStreams(mine);
      setPastStreams(past);
    } catch (err: any) {
      setError(err.message || L('Failed to load broadcasts', 'प्रसारण लोड नहीं हो सके'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStreams();
  }, []);

  const handleCancelStream = (streamId: string) => {
    setCancelTargetId(streamId);
  };

  const confirmCancelStream = async () => {
    if (!cancelTargetId) return;
    setCancelling(true);
    try {
      await apiFetch(`/streams/${cancelTargetId}`, { method: 'DELETE' });
      toast.success(L('Scheduled broadcast cancelled successfully.', 'निर्धारित प्रसारण सफलतापूर्वक रद्द किया गया।'));
      setCancelTargetId(null);
      loadStreams();
    } catch (err: any) {
      toast.error(err.message || L('Failed to cancel broadcast', 'प्रसारण रद्द नहीं किया जा सका'));
    } finally {
      setCancelling(false);
    }
  };

  const openEditModal = (stream: any) => {
    setEditStream(stream);
    setEditTitle(stream.title || '');
    setEditDescription(stream.description || '');
    const localVal = stream.scheduledAt ? toLocalDatetimeInputValue(stream.scheduledAt) : '';
    setEditScheduledAt(localVal);
    setOriginalScheduledAt(localVal);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStream) return;
    setSavingEdit(true);
    try {
      const payload: any = {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      };
      if (editScheduledAt && editScheduledAt !== originalScheduledAt) {
        payload.scheduledAt = new Date(editScheduledAt).toISOString();
      }

      await apiFetch(`/streams/${editStream.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setEditStream(null);
      toast.success(L('Broadcast details updated successfully.', 'प्रसारण विवरण सफलतापूर्वक अपडेट किया गया।'));
      loadStreams();
    } catch (err: any) {
      toast.error(err.message || L('Failed to update broadcast', 'प्रसारण अपडेट नहीं हो सका'));
    } finally {
      setSavingEdit(false);
    }
  };

  const statusLabel = (s: string) => (lang === 'hi' ? STREAM_STATUS_HI[s] || s : s);

  return (
    <div className="min-h-screen bg-obsidian text-foreground py-8 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-obsidian-soft border border-gold/20 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gold/15 text-gold border border-gold/30 rounded-2xl">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-white tracking-tight">
                {L('My Sacred Broadcasts', 'मेरे पावन प्रसारण')}
              </h1>
              <p className="text-xs text-stone-400">
                {L(
                  'Manage your live pujas, scheduled ceremonies, and darshan history.',
                  'अपनी लाइव पूजाओं, निर्धारित अनुष्ठानों और दर्शन इतिहास का प्रबंधन करें।',
                )}
              </p>
            </div>
          </div>

          <Link
            href="/studio/create"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold rounded-full transition shadow-lg shadow-gold/20 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{L('Create New Broadcast', 'नया प्रसारण बनाएँ')}</span>
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mb-6 border-b border-gold/15 pb-3">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'upcoming'
                ? 'bg-gold/20 text-gold border border-gold/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            {L('Scheduled & Active', 'निर्धारित व सक्रिय')} ({myStreams.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'past'
                ? 'bg-gold/20 text-gold border border-gold/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            {L('Concluded History', 'पूर्ण हुए प्रसारण')} ({pastStreams.length})
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-stone-600 dark:text-stone-400 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold" />
            <span className="text-xs uppercase tracking-wider font-semibold">
              {L('Loading broadcasts...', 'प्रसारण लोड हो रहे हैं...')}
            </span>
          </div>
        ) : activeTab === 'upcoming' ? (
          myStreams.length === 0 ? (
            <div className="bg-obsidian-soft border border-gold/15 rounded-3xl p-12 text-center text-stone-400 space-y-4">
              <DiyaIcon size={40} className="mx-auto" />
              <h3 className="text-base font-bold text-white">
                {L('No Active or Scheduled Broadcasts', 'कोई सक्रिय या निर्धारित प्रसारण नहीं है')}
              </h3>
              <p className="text-xs max-w-md mx-auto text-stone-400">
                {L(
                  'You have not scheduled any upcoming poojas. Create a new broadcast to share blessings with devotees worldwide.',
                  'आपने अभी तक कोई आगामी पूजा निर्धारित नहीं की है। विश्वभर के भक्तों के साथ आशीर्वाद साझा करने के लिए नया प्रसारण बनाएँ।',
                )}
              </p>
              <Link
                href="/studio/create"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-obsidian text-xs font-bold rounded-full shadow-lg hover:bg-gold-deep transition"
              >
                <Plus className="w-4 h-4" /> {L('Start Broadcast', 'प्रसारण शुरू करें')}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myStreams.map((st) => (
                <div
                  key={st.id}
                  className="bg-obsidian-soft border border-gold/20 rounded-2xl p-5 shadow-lg flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {st.status === 'LIVE' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-400 border border-red-800 animate-pulse flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {L('LIVE', 'लाइव')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gold/15 text-gold border border-gold/30">
                            {statusLabel(st.status)}
                          </span>
                        )}
                        <span className="text-[10px] uppercase font-bold text-gold-soft">
                          {translateCategoryLabel(st.category?.name || 'Vedic Pooja', lang)}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {st.videoQuality || '480p'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white mb-1.5 line-clamp-1">{st.title}</h3>
                    {st.description && (
                      <p className="text-xs text-stone-400 line-clamp-2 mb-3">{st.description}</p>
                    )}

                    {st.scheduledAt && (
                      <div className="flex items-center gap-1.5 text-xs text-gold-soft font-semibold">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{L('Scheduled:', 'निर्धारित:')} {formatLocaleDateTime(st.scheduledAt, lang)}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gold/10 flex items-center justify-between gap-2">
                    <Link
                      href={`/studio/${st.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/20 hover:bg-gold/30 text-gold-pale border border-gold/40 rounded-xl text-xs font-bold transition"
                    >
                      <Play className="w-3.5 h-3.5 text-gold" />
                      <span>{L('Enter Studio', 'स्टूडियो में प्रवेश करें')}</span>
                    </Link>

                    {st.status !== 'LIVE' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(st)}
                          className="p-1.5 hover:bg-stone-800 text-stone-300 hover:text-white rounded-lg transition"
                          title={L('Edit Details', 'विवरण संपादित करें')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCancelStream(st.id)}
                          className="p-1.5 hover:bg-red-950/60 text-red-400 hover:text-red-300 rounded-lg transition"
                          title={L('Cancel Broadcast', 'प्रसारण रद्द करें')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          pastStreams.length === 0 ? (
            <div className="bg-obsidian-soft border border-gold/15 rounded-3xl p-12 text-center text-stone-400">
              <p className="text-xs">{L('No concluded broadcasts recorded yet.', 'अभी तक कोई पूर्ण प्रसारण दर्ज नहीं है।')}</p>
            </div>
          ) : (
            <div className="bg-obsidian-soft border border-gold/15 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-950/80 border-b border-gold/15 text-stone-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="p-3.5 pl-4">{L('Broadcast Title', 'प्रसारण शीर्षक')}</th>
                      <th className="p-3.5">{L('Category', 'श्रेणी')}</th>
                      <th className="p-3.5">{L('Status', 'स्थिति')}</th>
                      <th className="p-3.5">{L('Ended At', 'समाप्ति तिथि')}</th>
                      <th className="p-3.5 pr-4">{L('Duration', 'अवधि')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gold/10 text-stone-300">
                    {pastStreams.map((st) => (
                      <tr key={st.id} className="hover:bg-gold/5 transition">
                        <td className="p-3.5 pl-4 font-semibold text-white">{st.title}</td>
                        <td className="p-3.5 text-stone-400">
                          {translateCategoryLabel(st.category?.name || 'Pooja', lang)}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-900 border border-stone-800">
                            {statusLabel(st.status)}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-stone-400">
                          {st.endedAt ? formatLocaleDate(st.endedAt, lang) : L('N/A', 'उपलब्ध नहीं')}
                        </td>
                        <td className="p-3.5 pr-4 font-mono text-stone-400">
                          {st.durationSeconds ? formatMins(Math.round(st.durationSeconds / 60), lang) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>

      {/* Edit Stream Modal */}
      {editStream && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c140d] border border-stone-200 dark:border-gold/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative text-xs">
            <button
              onClick={() => setEditStream(null)}
              aria-label={L('Close modal', 'मोडल बंद करें')}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 dark:hover:text-white p-1 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-stone-900 dark:text-white mb-4 flex items-center gap-2">
              <Edit className="w-4 h-4 text-amber-600 dark:text-gold" /> {L('Edit Broadcast Details', 'प्रसारण विवरण संपादित करें')}
            </h3>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-200 mb-1.5">
                  {L('Broadcast Title', 'प्रसारण शीर्षक')}
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-stone-50 dark:bg-obsidian border border-stone-200 dark:border-gold/20 text-stone-900 dark:text-stone-200 focus:outline-none focus:border-amber-500 dark:focus:border-gold"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-200 mb-1.5">
                  {L('Description (Optional)', 'विवरण (वैकल्पिक)')}
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-stone-50 dark:bg-obsidian border border-stone-200 dark:border-gold/20 text-stone-900 dark:text-stone-200 focus:outline-none focus:border-amber-500 dark:focus:border-gold resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 dark:text-stone-200 mb-1.5">
                  {L('Scheduled Time', 'निर्धारित समय')}
                </label>
                <input
                  type="datetime-local"
                  value={editScheduledAt}
                  onChange={(e) => setEditScheduledAt(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-stone-50 dark:bg-obsidian border border-stone-200 dark:border-gold/20 text-stone-900 dark:text-stone-200 focus:outline-none focus:border-amber-500 dark:focus:border-gold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditStream(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-semibold transition"
                >
                  {L('Cancel', 'रद्द करें')}
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 rounded-xl bg-gold hover:bg-gold-deep text-obsidian font-bold disabled:opacity-50 transition shadow-md"
                >
                  {savingEdit ? L('Saving...', 'सहेजा जा रहा है...') : L('Save Changes', 'परिवर्तन सहेजें')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(cancelTargetId)}
        title={L('Cancel Scheduled Broadcast', 'निर्धारित प्रसारण रद्द करें')}
        description={L(
          'Are you sure you want to cancel this scheduled darshan broadcast? Devotees will no longer be able to view or set reminders for this session.',
          'क्या आप वाकई इस निर्धारित दर्शन प्रसारण को रद्द करना चाहते हैं? इसके बाद भक्त इस सत्र को देख या रिमाइंडर सेट नहीं कर सकेंगे।',
        )}
        confirmLabel={L('Yes, Cancel Broadcast', 'हाँ, प्रसारण रद्द करें')}
        cancelLabel={L('Keep Scheduled', 'निर्धारित रखें')}
        variant="danger"
        loading={cancelling}
        onConfirm={confirmCancelStream}
        onCancel={() => setCancelTargetId(null)}
      />
    </div>
  );
}
