'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Video,
  FileCheck,
  Radio,
  StopCircle,
  Check,
  X,
  Search,
  FileText,
  Sparkles,
  Lock,
  Trash2,
  Plus,
  Bell,
  Eye,
  Megaphone,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { DiyaIcon } from '@/components/icons/SpiritualIcons';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function AdminConsolePage() {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'kpi' | 'kyc' | 'streams' | 'reports' | 'wordFilters' | 'users' | 'audit' | 'banner'>('kpi');
  const [stats, setStats] = useState<any>(null);
  const [kycList, setKycList] = useState<any[]>([]);
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [wordFilters, setWordFilters] = useState<any[]>([]);
  const [newWord, setNewWord] = useState('');
  const [newSeverity, setNewSeverity] = useState('BLOCKED');
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // M-01: Inline rejection modal — replaces window.prompt() which is blocked in some
  // browsers and leaks the admin URL in some CSP configurations.
  const [rejectModal, setRejectModal] = useState<{ profileId: string; reason: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'endStream' | 'deleteWord'; id: string } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Occasion Announcement Banner State
  const [bannerConfig, setBannerConfig] = useState<{
    enabled: boolean;
    occasion: string;
    message: string;
    mobileMessage: string;
    ctaText: string;
    ctaLink: string;
    gradient: string;
  }>({
    enabled: false,
    occasion: 'Deepotsav',
    message: 'Join the Grand Deepotsav Mahotsav & Live Ganga Aarti from Bharat\'s sacred ghats',
    mobileMessage: 'Live Aarti from sacred ghats',
    ctaText: 'Watch Live Aarti',
    ctaLink: '/#live-section',
    gradient: 'amber-orange',
  });
  const [savingBanner, setSavingBanner] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifyAdminSession() {
      const token = localStorage.getItem('pooja_token');
      if (!token) {
        router.push('/login?redirect=/admin');
        return;
      }

      try {
        // N-07: Always validate role & 2FA status against /auth/me rather than trusting stale localStorage
        const me = await apiFetch<any>('/auth/me');
        if (cancelled) return;

        localStorage.setItem('pooja_user', JSON.stringify(me));
        window.dispatchEvent(new Event('sd-auth-change'));

        if (me.role !== 'ADMIN') {
          toast.error('Access restricted to platform operators only.');
          router.push('/');
          return;
        }

        if (!me.isTwoFactorEnabled) {
          toast.error('Two-factor authentication is required for Platform Administrators. Please set up 2FA.');
          router.push('/account#2fa');
          return;
        }

        setAuthToken(token);
        loadAdminData();
      } catch (err: any) {
        if (cancelled) return;
        if (err?.status === 401 || err?.status === 403) {
          localStorage.removeItem('pooja_token');
          localStorage.removeItem('pooja_user');
          router.push('/login?redirect=/admin');
          return;
        }
        toast.error(err?.message || 'Unable to verify administrator session. Please retry.');
        setLoading(false);
      }
    }

    verifyAdminSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  /**
   * N-02: Open a KYC document via an authenticated fetch rather than a plain <a href>.
   * Previously the token was appended as ?token=<jwt> in the URL, which ended up in
   * nginx access logs and browser history. jwt.strategy.ts no longer reads tokens from
   * URL parameters (R-02 fix), so those links returned 401.
   * Now we fetch the blob with the Authorization header and open it via createObjectURL —
   * the token never touches the browser's address bar or history.
   */
  const openKycDoc = async (storageKey: string) => {
    const token = localStorage.getItem('pooja_token');
    if (!token) {
      toast.error('Please sign in again.');
      return;
    }
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const res = await fetch(`${apiUrl}/storage/kyc-document?key=${encodeURIComponent(storageKey)}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!res.ok) {
        toast.error('Could not open the document. It may have been removed or access was denied.');
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      // Release the object URL after 60 seconds to free memory
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      toast.error('Network error while loading the document. Please try again.');
    }
  };

  const loadAdminData = async () => {
    setLoading(true);
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // 1. Dashboard KPI
      const dashRes = await fetch(`${apiUrl}/admin/dashboard`, { headers });
      if (dashRes.ok) setStats(await dashRes.json());

      // 2. Pending KYC
      const kycRes = await fetch(`${apiUrl}/streamers/admin/applications`, { headers });
      if (kycRes.ok) setKycList(await kycRes.json());

      // 3. Live Streams
      const streamsRes = await fetch(`${apiUrl}/admin/streams/live`, { headers });
      if (streamsRes.ok) setLiveStreams(await streamsRes.json());

      // 4. Reports
      const reportsRes = await fetch(`${apiUrl}/reports/queue`, { headers });
      if (reportsRes.ok) setReports(await reportsRes.json());

      // 5. Word Filters
      const wordsRes = await fetch(`${apiUrl}/admin/word-filters`, { headers });
      if (wordsRes.ok) setWordFilters(await wordsRes.json());

      // 6. Audit Logs
      const auditRes = await fetch(`${apiUrl}/admin/audit-logs`, { headers });
      if (auditRes.ok) setAuditLogs(await auditRes.json());

      // 7. Occasion Announcement Banner
      const bannerRes = await fetch(`${apiUrl}/admin/banner`);
      if (bannerRes.ok) {
        const b = await bannerRes.json();
        setBannerConfig({
          enabled: Boolean(b.enabled),
          occasion: b.occasion || 'Deepotsav',
          message: b.message || 'Join the Grand Deepotsav Mahotsav & Live Ganga Aarti from Bharat\'s sacred ghats',
          mobileMessage: b.mobileMessage || 'Live Aarti from sacred ghats',
          ctaText: b.ctaText || 'Watch Live Aarti',
          ctaLink: b.ctaLink || '/#live-section',
          gradient: b.gradient || 'amber-orange',
        });
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBanner = async (newEnabled?: boolean) => {
    setSavingBanner(true);
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    const payload = {
      ...bannerConfig,
      enabled: newEnabled !== undefined ? newEnabled : bannerConfig.enabled,
    };

    try {
      const res = await fetch(`${apiUrl}/admin/banner`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to update banner configuration');
      }

      const updated = await res.json();
      setBannerConfig((prev) => ({
        ...prev,
        ...updated,
        enabled: Boolean(updated.enabled),
      }));

      if (payload.enabled) {
        toast.success(`Occasion Banner for "${payload.occasion}" is now live sitewide!`);
      } else {
        toast.success('Occasion Banner is disabled and removed from the site.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating banner');
    } finally {
      setSavingBanner(false);
    }
  };

  const handleKycDecision = async (profileId: string, decision: 'APPROVED' | 'REJECTED') => {
    if (decision === 'REJECTED') {
      // M-01: Open inline modal instead of window.prompt()
      setRejectModal({ profileId, reason: 'Qualifications could not be verified.' });
      return;
    }
    await submitKycDecision(profileId, 'APPROVED', undefined);
  };

  const submitKycDecision = async (profileId: string, decision: 'APPROVED' | 'REJECTED', rejectionReason?: string) => {
    try {
      await apiFetch(`/streamers/admin/applications/${profileId}`, {
        method: 'PATCH',
        body: JSON.stringify({ decision, rejectionReason }),
      });
      loadAdminData();
      toast.success('KYC status updated successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update KYC status.');
    }
  };

  const handleForceEndStream = (streamId: string) => {
    setConfirmAction({ type: 'endStream', id: streamId });
  };

  const handleSearchUsers = async () => {
    try {
      const data = await apiFetch(`/admin/users?query=${encodeURIComponent(searchUser)}`);
      setUsers(data);
    } catch (err: any) {
      toast.error(err.message || 'User search failed.');
    }
  };

  const handleUserStatus = async (userId: string, status: 'ACTIVE' | 'SUSPENDED' | 'BANNED') => {
    try {
      await apiFetch(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason: 'Administrative intervention' }),
      });
      handleSearchUsers();
      toast.success(`User status updated to ${status}.`);
    } catch (err: any) {
      toast.error(err.message || 'Status change failed.');
    }
  };

  const handleResolveReport = async (reportId: string, status: 'ACTION_TAKEN' | 'DISMISSED') => {
    try {
      await apiFetch(`/reports/${reportId}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          adminNotes: `Resolved via admin console as ${status}`,
          notes: `Resolved via admin console as ${status}`,
        }),
      });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast.success('Report resolved successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve report.');
    }
  };

  const handleAddWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    try {
      await apiFetch('/admin/word-filters', {
        method: 'POST',
        body: JSON.stringify({ word: newWord.trim(), severity: newSeverity }),
      });
      setNewWord('');
      loadAdminData();
      toast.success('Word added to chat filter.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add word to chat filter');
    }
  };

  const handleDeleteWord = (id: string) => {
    setConfirmAction({ type: 'deleteWord', id });
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    setConfirmBusy(true);
    try {
      if (confirmAction.type === 'endStream') {
        await apiFetch(`/admin/streams/${confirmAction.id}/force-end`, { method: 'POST' });
        setConfirmAction(null);
        loadAdminData();
        toast.success('Stream ended successfully.');
      } else {
        const wordId = confirmAction.id;
        await apiFetch(`/admin/word-filters/${wordId}`, { method: 'DELETE' });
        setWordFilters((prev) => prev.filter((w) => w.id !== wordId));
        setConfirmAction(null);
        toast.success('Word removed from chat filter.');
      }
    } catch (err: any) {
      toast.error(
        err?.message ||
          (confirmAction.type === 'endStream' ? 'Failed to force end stream.' : 'Failed to remove word'),
      );
    } finally {
      setConfirmBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-obsidian text-foreground py-8 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      {/* M-01: Inline KYC Rejection Reason Modal — replaces window.prompt() */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-stone-900 border border-gold/25 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <X className="w-5 h-5 text-red-400" /> Rejection Reason
            </h3>
            <p className="text-sm text-stone-400">Provide a clear reason. This will be sent to the applicant.</p>
            <textarea
              className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-gold/50 resize-none"
              rows={3}
              autoFocus
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder="e.g. Qualifications could not be verified."
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const { profileId, reason } = rejectModal;
                  setRejectModal(null);
                  await submitKycDecision(profileId, 'REJECTED', reason || 'Qualifications could not be verified.');
                }}
                className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold transition"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative max-w-7xl mx-auto px-5 lg:px-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gold/15">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-gold" /> Platform Operator Console
            </h1>
            <p className="text-xs text-stone-400 mt-1">
              Global monitoring, KYC approvals, emergency kill switches, and audit trail
            </p>
          </div>
          <button
            onClick={loadAdminData}
            className="text-xs font-semibold px-4 py-2 bg-obsidian-soft hover:bg-stone-800 text-gold-pale border border-gold/20 rounded-full transition-colors"
          >
            Refresh Data
          </button>
        </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-3 mb-8 overflow-x-auto w-full max-w-full min-w-0 no-scrollbar">
        {[
          { key: 'kpi', label: 'Overview Metrics' },
          { key: 'kyc', label: `Pending KYC (${kycList.length})` },
          { key: 'streams', label: `Live Monitor (${liveStreams.length})` },
          { key: 'reports', label: `Safety Reports (${reports.length})` },
          { key: 'wordFilters', label: `Prohibited Words (${wordFilters.length})` },
          { key: 'users', label: 'User Directory' },
          { key: 'audit', label: 'Audit Log' },
          { key: 'banner', label: `Occasion Banner ${bannerConfig.enabled ? '● Active' : ''}` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-orange-700 text-white shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: KPI Overview */}
      {activeTab === 'kpi' && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm dark:shadow-none">
            <span className="text-[11px] text-stone-600 dark:text-stone-400 uppercase font-semibold block">Total Users</span>
            <span className="text-2xl font-extrabold text-stone-900 dark:text-white mt-1 block">{stats.totalUsers}</span>
          </div>
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm dark:shadow-none">
            <span className="text-[11px] text-orange-700 dark:text-orange-400 uppercase font-semibold block">Approved Pandits</span>
            <span className="text-2xl font-extrabold text-stone-900 dark:text-white mt-1 block">{stats.totalStreamers}</span>
          </div>
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm dark:shadow-none">
            <span className="text-[11px] text-red-700 dark:text-red-400 uppercase font-semibold block">Live Right Now</span>
            <span className="text-2xl font-extrabold text-stone-900 dark:text-white mt-1 block">{stats.activeLiveStreams}</span>
          </div>
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm dark:shadow-none">
            <span className="text-[11px] text-stone-600 dark:text-stone-400 uppercase font-semibold block">Total Broadcasts</span>
            <span className="text-2xl font-extrabold text-stone-900 dark:text-white mt-1 block">{stats.totalStreams}</span>
          </div>
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm dark:shadow-none">
            <span className="text-[11px] text-amber-800 dark:text-amber-400 uppercase font-semibold block">Pending KYC</span>
            <span className="text-2xl font-extrabold text-stone-900 dark:text-white mt-1 block">{stats.pendingKyc}</span>
          </div>
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm dark:shadow-none">
            <span className="text-[11px] text-rose-700 dark:text-rose-400 uppercase font-semibold block">Open Reports</span>
            <span className="text-2xl font-extrabold text-stone-900 dark:text-white mt-1 block">{stats.openReports}</span>
          </div>
        </div>
      )}

      {/* Tab 2: KYC Applications Queue */}
      {activeTab === 'kyc' && (
        <div className="space-y-4">
          {kycList.length === 0 ? (
            <p className="text-stone-400 text-sm">No pending streamer verification requests.</p>
          ) : (
            kycList.map((app) => (
              <div key={app.id} className="bg-stone-900 border border-stone-800 p-5 rounded-2xl flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-white text-base">{app.user.name} ({app.user.email})</h3>
                  <p className="text-xs text-stone-400 mt-1"><strong>Languages:</strong> {app.languages.join(', ')}</p>
                  <p className="text-xs text-stone-400"><strong>Specialties:</strong> {app.specialties.join(', ')}</p>
                  <p className="text-xs text-stone-300 mt-2 bg-stone-950 p-2.5 rounded-xl border border-stone-800">{app.bio}</p>
                  {app.kycDocuments && Array.isArray(app.kycDocuments) && app.kycDocuments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {app.kycDocuments.map((doc: any, i: number) => (
                        // N-02: Use authenticated fetch (openKycDoc) instead of a plain <a href>.
                        // Previously ?token=<jwt> was appended to the URL, leaking the admin token
                        // into nginx logs and browser history. jwt.strategy.ts no longer reads
                        // tokens from URL params (R-02 fix), so those links returned 401.
                        <button
                          key={i}
                          type="button"
                          onClick={() => openKycDoc(doc.storageKey)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 hover:bg-orange-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-orange-800 dark:text-orange-400 rounded-lg text-xs font-semibold border border-orange-200 dark:border-stone-700 transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View Credentials Document ({doc.documentType || 'KYC'})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex sm:flex-col gap-2 shrink-0 justify-center">
                  <button
                    onClick={() => handleKycDecision(app.id, 'APPROVED')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-xl text-xs font-semibold"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve & Verify
                  </button>
                  <button
                    onClick={() => handleKycDecision(app.id, 'REJECTED')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-semibold"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 3: Live Streams Monitor & Emergency Kill Switch */}
      {activeTab === 'streams' && (
        <div className="space-y-4">
          {liveStreams.length === 0 ? (
            <p className="text-stone-400 text-sm">No streams currently live on the server.</p>
          ) : (
            liveStreams.map((s) => (
              <div key={s.id} className="bg-stone-900 border border-stone-800 p-5 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider block">● LIVE ON AIR</span>
                  <h3 className="text-base font-bold text-white mt-0.5">{s.title}</h3>
                  <p className="text-xs text-stone-400">Streamer: {s.streamer.name} ({s.streamer.email}) • Category: {s.category.name}</p>
                </div>
                <button
                  onClick={() => handleForceEndStream(s.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  <StopCircle className="w-4 h-4" /> Force End Stream (Kill)
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Safety Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <p className="text-stone-400 text-sm">No safety reports pending.</p>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="bg-stone-900 border border-stone-800 p-5 rounded-2xl flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">{r.targetType} REPORT: {r.status}</span>
                    <span className="text-xs text-stone-600 dark:text-stone-400">By {r.reporter?.name || 'Anonymous Devotee'}</span>
                  </div>
                  <h4 className="font-semibold text-white text-sm">{r.reason}</h4>
                  {r.details && <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">{r.details}</p>}
                  {r.chatMessage && (
                    <p className="text-xs text-red-800 dark:text-red-300 mt-2 bg-red-50 dark:bg-stone-950 p-2.5 rounded-xl border border-red-200 dark:border-stone-800 font-mono">
                      Flagged message: "{r.chatMessage.message}"
                    </p>
                  )}
                </div>
                {r.status === 'OPEN' && (
                  <div className="flex sm:flex-col gap-2 shrink-0 justify-center">
                    <button
                      onClick={() => handleResolveReport(r.id, 'ACTION_TAKEN')}
                      className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-semibold shadow transition"
                    >
                      Resolve & Action
                    </button>
                    <button
                      onClick={() => handleResolveReport(r.id, 'DISMISSED')}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-300 rounded-xl text-xs font-semibold border border-stone-300 dark:border-stone-700 transition"
                    >
                      Dismiss Report
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 5: Word Filters */}
      {activeTab === 'wordFilters' && (
        <div className="space-y-6">
          <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl shadow-lg">
            <h3 className="text-sm font-bold text-white mb-2">Add Prohibited Chat Word / Regex</h3>
            <p className="text-xs text-stone-400 mb-4">
              Words added here are automatically masked or blocked across all live pooja chat streams.
            </p>
            <form onSubmit={handleAddWord} className="flex flex-col sm:flex-row gap-3 max-w-xl">
              <input
                type="text"
                required
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder="e.g. offensive word or phrase"
                className="flex-1 px-3.5 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
              />
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value)}
                className="px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white"
              >
                <option value="BLOCKED">Severity: Block (Auto-drop)</option>
                <option value="WARNING">Severity: Warn</option>
                <option value="FLAG">Severity: Flag for Review</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-700 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold shadow transition inline-flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Add Word
              </button>
            </form>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-stone-950/60 border-b border-stone-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Active Chat Filters ({wordFilters.length})</h3>
              <span className="text-xs text-stone-400 font-mono">Real-time socket matcher</span>
            </div>

            {wordFilters.length === 0 ? (
              <div className="p-10 text-center text-stone-400 text-xs">
                No active custom word filters configured.
              </div>
            ) : (
              <div className="divide-y divide-stone-800">
                {wordFilters.map((wf) => (
                  <div key={wf.id} className="p-3 px-4 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-white bg-stone-950 border border-stone-800 px-2 py-1 rounded">
                        {wf.word}
                      </span>
                      <span className="text-[10px] text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800/60 font-semibold">
                        {wf.severity || 'BLOCKED'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteWord(wf.id)}
                      className="p-1.5 text-stone-600 dark:text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded-lg transition"
                      title="Remove filter"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 6: User Management */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex gap-2 max-w-md">
            <input
              type="text"
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              placeholder="Search user by name or email..."
              className="flex-1 px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white"
            />
            <button
              onClick={handleSearchUsers}
              className="px-4 py-2 bg-orange-700 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold"
            >
              Search
            </button>
          </div>

          <div className="space-y-2 mt-4">
            {users.map((u) => (
              <div key={u.id} className="bg-stone-900 border border-stone-800 p-4 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white text-sm block">{u.name} ({u.email})</span>
                  <span className="text-stone-400">Role: {u.role} • Status: {u.status}</span>
                </div>
                <div className="flex gap-2">
                  {u.status === 'ACTIVE' ? (
                    <button
                      onClick={() => handleUserStatus(u.id, 'BANNED')}
                      className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-semibold"
                    >
                      Ban User
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUserStatus(u.id, 'ACTIVE')}
                      className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs font-semibold"
                    >
                      Restore User
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Audit Log (Immutable) */}
      {activeTab === 'audit' && (
        <div className="space-y-2">
          {auditLogs.map((log) => (
            <div key={log.id} className="bg-stone-900 border border-stone-800 p-3 rounded-xl text-xs flex items-center justify-between">
              <div>
                <span className="font-semibold text-orange-700 dark:text-orange-400 mr-2">[{log.action}]</span>
                <span className="text-white">{log.targetResource}</span>
                <span className="text-stone-600 dark:text-stone-400 block text-[11px] mt-0.5">By: {log.actorEmail || 'System'}</span>
              </div>
              <span className="text-stone-400 font-mono text-[11px]">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tab 8: Occasion Announcement Banner CMS */}
      {activeTab === 'banner' && (
        <div className="space-y-6 max-w-4xl">
          {/* Card 1: Master Status & Toggle */}
          <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-800">
              <div>
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-gold" />
                  <h2 className="font-serif text-lg font-bold text-white">Occasion Announcement Banner</h2>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  Control the time-limited festival banner displayed at the very top of the website for all devotees.
                </p>
              </div>

              {/* Status Pill & Master Switch */}
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    bannerConfig.enabled
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-stone-100 text-stone-700 border border-stone-300 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${bannerConfig.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-stone-500'}`} />
                  {bannerConfig.enabled ? 'Active on Website' : 'Disabled / Hidden'}
                </span>

                <button
                  type="button"
                  onClick={() => handleSaveBanner(!bannerConfig.enabled)}
                  disabled={savingBanner}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shadow-sm ${
                    bannerConfig.enabled
                      ? 'bg-red-700 hover:bg-red-600 text-white'
                      : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                  }`}
                >
                  {bannerConfig.enabled ? 'Disable Banner Now' : 'Enable & Publish'}
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                  Occasion Name / Festival Tag
                </label>
                <input
                  type="text"
                  value={bannerConfig.occasion}
                  onChange={(e) => setBannerConfig({ ...bannerConfig, occasion: e.target.value })}
                  placeholder="e.g. Deepotsav, Maha Shivratri, Navratri"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold transition"
                />
                <span className="text-[10px] text-stone-600 dark:text-stone-400 mt-1 block">
                  Highlighted with golden drop-shadow at the start of the banner.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                  Gradient Color Scheme
                </label>
                <select
                  value={bannerConfig.gradient}
                  onChange={(e) => setBannerConfig({ ...bannerConfig, gradient: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-gold transition"
                >
                  <option value="amber-orange">Deepotsav Flame (Amber-Orange-Crimson)</option>
                  <option value="kashi-gold">Kashi Sanctum (Rich Gold to Dark Amber)</option>
                  <option value="vedic-saffron">Vedic Saffron (Vermillion Saffron to Crimson)</option>
                </select>
                <span className="text-[10px] text-stone-600 dark:text-stone-400 mt-1 block">
                  Color gradient applied across both mobile and desktop viewports.
                </span>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                  Desktop Announcement Headline
                </label>
                <input
                  type="text"
                  value={bannerConfig.message}
                  onChange={(e) => setBannerConfig({ ...bannerConfig, message: e.target.value })}
                  placeholder="e.g. Join the Grand Deepotsav Mahotsav & Live Ganga Aarti from Bharat's sacred ghats"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                  Mobile Short Headline
                </label>
                <input
                  type="text"
                  value={bannerConfig.mobileMessage}
                  onChange={(e) => setBannerConfig({ ...bannerConfig, mobileMessage: e.target.value })}
                  placeholder="e.g. Live Aarti from sacred ghats"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold transition"
                />
                <span className="text-[10px] text-stone-600 dark:text-stone-400 mt-1 block">
                  Concise version that fits neatly on 360px–400px mobile screens.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                    CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={bannerConfig.ctaText}
                    onChange={(e) => setBannerConfig({ ...bannerConfig, ctaText: e.target.value })}
                    placeholder="e.g. Watch Live Aarti"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                    CTA Target Link
                  </label>
                  <input
                    type="text"
                    value={bannerConfig.ctaLink}
                    onChange={(e) => setBannerConfig({ ...bannerConfig, ctaLink: e.target.value })}
                    placeholder="e.g. /#live-section or /pooja"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold transition"
                  />
                </div>
              </div>
            </div>

            {/* Live Visual Preview */}
            <div className="mt-8 pt-6 border-t border-stone-800">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-gold" /> Live Sitewide Banner Preview
              </span>

              {/* Preview Container */}
              <div className="rounded-2xl border border-stone-800 p-4 bg-stone-950 space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Desktop View:
                  </span>
                  <div
                    className={`flex items-center justify-between gap-3 px-4 py-2 text-xs rounded-xl text-white shadow-md border border-amber-600/30 ${
                      bannerConfig.gradient === 'kashi-gold'
                        ? 'bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-800'
                        : bannerConfig.gradient === 'vedic-saffron'
                        ? 'bg-gradient-to-r from-red-700 via-rose-600 to-amber-700'
                        : 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <DiyaIcon size={16} className="text-amber-200 shrink-0" />
                      <span className="font-extrabold text-amber-100">{bannerConfig.occasion}:</span>
                      <span className="font-medium truncate">{bannerConfig.message || 'Announcement message...'}</span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-stone-950 font-extrabold text-[10px] whitespace-nowrap shrink-0">
                      {bannerConfig.ctaText || 'Watch Now'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    Mobile View (Simulated Narrow):
                  </span>
                  <div
                    className={`max-w-[340px] flex items-center justify-between gap-2 px-3 py-1.5 text-[11px] rounded-xl text-white shadow-md border border-amber-600/30 ${
                      bannerConfig.gradient === 'kashi-gold'
                        ? 'bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-800'
                        : bannerConfig.gradient === 'vedic-saffron'
                        ? 'bg-gradient-to-r from-red-700 via-rose-600 to-amber-700'
                        : 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <DiyaIcon size={14} className="text-amber-200 shrink-0" />
                      <span className="font-extrabold text-amber-100">{bannerConfig.occasion}:</span>
                      <span className="font-medium truncate">{bannerConfig.mobileMessage || bannerConfig.message || 'Live broadcast...'}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-stone-950 font-extrabold text-[9px] whitespace-nowrap shrink-0">
                      {bannerConfig.ctaText || 'Watch'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-6 pt-5 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveBanner(true)}
                  disabled={savingBanner}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-obsidian text-xs font-black rounded-xl transition shadow-lg disabled:opacity-60"
                >
                  {savingBanner ? 'Saving...' : 'Save & Publish Live'}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveBanner(false)}
                  disabled={savingBanner}
                  className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl transition border border-stone-700 disabled:opacity-60"
                >
                  {savingBanner ? 'Saving...' : 'Save as Disabled (Hidden)'}
                </button>
              </div>

              {bannerConfig.enabled && (
                <button
                  type="button"
                  onClick={() => handleSaveBanner(false)}
                  disabled={savingBanner}
                  className="px-4 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition"
                >
                  Remove from Site Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={Boolean(confirmAction)}
        title={confirmAction?.type === 'endStream' ? 'Emergency Force-End Stream' : 'Remove Chat Filter Word'}
        description={
          confirmAction?.type === 'endStream'
            ? 'Emergency Action: Force end this stream immediately on LiveKit SFU? Connected participants will be disconnected right away.'
            : 'Remove this word from the prohibited chat filter list?'
        }
        confirmLabel={confirmAction?.type === 'endStream' ? 'Force End Stream' : 'Remove Word'}
        cancelLabel="Cancel"
        variant="danger"
        loading={confirmBusy}
        onConfirm={executeConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />
      </div>
    </div>
  );
}
