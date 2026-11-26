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
  Award,
  Crown,
  ExternalLink,
  FolderPlus,
  Layers,
  Calendar,
  Coins,
  IndianRupee,
  Download,
  AlertCircle,
  RefreshCw,
  Edit2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { purgeClientSession } from '@/lib/auth-session';
import { useToast } from '@/components/Toast';
import { DiyaIcon, VerifiedPanditBadge } from '@/components/icons/SpiritualIcons';
import { SpecialPanditBadge } from '@/components/SpecialPanditBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export default function AdminConsolePage() {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<
    'kpi' | 'pandits' | 'categories' | 'bookings' | 'dakshina' | 'kyc' | 'streams' | 'reports' | 'wordFilters' | 'users' | 'audit' | 'banner'
  >('kpi');
  const [stats, setStats] = useState<any>(null);
  const [panditsList, setPanditsList] = useState<any[]>([]);
  const [searchPandit, setSearchPandit] = useState('');
  const [panditFilter, setPanditFilter] = useState<'all' | 'special' | 'verified'>('all');
  const [editingSpecialBadge, setEditingSpecialBadge] = useState<{
    profileId: string;
    panditName: string;
    title: string;
    hasSpecialBadge: boolean;
  } | null>(null);
  const [updatingPanditId, setUpdatingPanditId] = useState<string | null>(null);
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

  // Categories State
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategorySlug, setNewCategorySlug] = useState('');
  const [newCategoryOrder, setNewCategoryOrder] = useState(0);
  const [savingCategory, setSavingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryForm, setEditCategoryForm] = useState<{ name: string; displayOrder: number; isActive: boolean }>({
    name: '',
    displayOrder: 0,
    isActive: true,
  });

  // Dakshina Offerings Oversight State
  const [bookingsList, setBookingsList] = useState<any[]>([]);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED'>('ALL');
  const [searchBooking, setSearchBooking] = useState('');
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Dakshina Ledger State
  const [dakshinaData, setDakshinaData] = useState<{
    ledger: any[];
    platformTotalCoins: number;
    platformPaidCoins: number;
    platformDueCoins: number;
    platformTotalInr: number;
    platformDueNetInr: number;
    platformTotalTransactions: number;
  }>({
    ledger: [],
    platformTotalCoins: 0,
    platformPaidCoins: 0,
    platformDueCoins: 0,
    platformTotalInr: 0,
    platformDueNetInr: 0,
    platformTotalTransactions: 0,
  });
  const [searchLedger, setSearchLedger] = useState('');

  // Payout Modal State
  const [payoutModal, setPayoutModal] = useState<{ panditId: string; panditName: string; dueCoins: number; dueNetInr: number } | null>(null);
  const [payoutForm, setPayoutForm] = useState({ coins: '', periodTo: new Date().toISOString().split('T')[0], method: 'UPI', reference: '', note: '' });
  const [savingPayout, setSavingPayout] = useState(false);

  // M-01: Inline rejection modal — replaces window.prompt() which is blocked in some
  // browsers and leaks the admin URL in some CSP configurations.
  const [rejectModal, setRejectModal] = useState<{ profileId: string; reason: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'endStream' | 'deleteWord' | 'deleteCategory'; id: string } | null>(null);
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
          purgeClientSession();
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

      // 1.5. Pandits Roster & Badges
      const panditsRes = await fetch(`${apiUrl}/admin/pandits`, { headers });
      if (panditsRes.ok) setPanditsList(await panditsRes.json());

      // 1.6. Stream Categories
      const categoriesRes = await fetch(`${apiUrl}/admin/categories`);
      if (categoriesRes.ok) setCategoriesList(await categoriesRes.json());

      // 1.7. Dakshina Offerings (Initial 50)
      const bookingsRes = await fetch(`${apiUrl}/admin/bookings`, { headers });
      if (bookingsRes.ok) {
        const bData = await bookingsRes.json();
        setBookingsList(bData.data || []);
        setBookingsTotal(bData.total || 0);
      }

      // 1.8. Dakshina Ledger
      const dakshinaRes = await fetch(`${apiUrl}/admin/dakshina-ledger`, { headers });
      if (dakshinaRes.ok) setDakshinaData(await dakshinaRes.json());

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

      // 6.5. Pre-load Users Directory so tab is never blank
      const usersRes = await fetch(`${apiUrl}/admin/users`, { headers });
      if (usersRes.ok) setUsers(await usersRes.json());

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

  // Sync specific tabs on tab activation
  useEffect(() => {
    if (activeTab === 'users' && users.length === 0) {
      handleSearchUsers();
    } else if (activeTab === 'bookings') {
      fetchBookings(bookingStatusFilter);
    } else if (activeTab === 'dakshina') {
      fetchDakshinaLedger();
    } else if (activeTab === 'categories') {
      fetchCategories();
    }
  }, [activeTab]);

  const fetchCategories = async () => {
    try {
      const data = await apiFetch<any[]>('/admin/categories');
      setCategoriesList(data || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setSavingCategory(true);
    try {
      const slug =
        newCategorySlug.trim() ||
        newCategoryName
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

      await apiFetch('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: newCategoryName.trim(),
          slug,
          displayOrder: Number(newCategoryOrder) || 0,
        }),
      });
      setNewCategoryName('');
      setNewCategorySlug('');
      setNewCategoryOrder(0);
      toast.success('Category created successfully!');
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    try {
      await apiFetch(`/admin/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(editCategoryForm),
      });
      toast.success('Category updated successfully!');
      setEditingCategoryId(null);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update category');
    }
  };

  const handleToggleCategoryActive = async (id: string, currentActive: boolean) => {
    try {
      await apiFetch(`/admin/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentActive }),
      });
      toast.success(`Category ${!currentActive ? 'activated' : 'deactivated'}!`);
      setCategoriesList((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: !currentActive } : c))
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to toggle category');
    }
  };

  const handleDeleteCategory = (id: string) => {
    setConfirmAction({ type: 'deleteCategory', id });
  };

  const fetchBookings = async (status = bookingStatusFilter) => {
    setLoadingBookings(true);
    try {
      const q = status && status !== 'ALL' ? `?status=${status}` : '';
      const res = await apiFetch<any>(`/admin/bookings${q}`);
      setBookingsList(res.data || []);
      setBookingsTotal(res.total || 0);
    } catch (err: any) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchDakshinaLedger = async () => {
    try {
      const res = await apiFetch<any>('/admin/dakshina-ledger');
      setDakshinaData(res);
    } catch (err: any) {
      console.error('Failed to load dakshina ledger:', err);
    }
  };

  const handleRecordPayout = async () => {
    if (!payoutModal) return;
    setSavingPayout(true);
    try {
      await apiFetch('/admin/payouts', {
        method: 'POST',
        body: JSON.stringify({
          streamerId: payoutModal.panditId,
          coins: Number(payoutForm.coins),
          periodTo: new Date(payoutForm.periodTo).toISOString(),
          method: payoutForm.method,
          reference: payoutForm.reference.trim(),
          note: payoutForm.note.trim() || undefined,
        }),
      });
      toast.success('Payout recorded successfully!');
      setPayoutModal(null);
      setPayoutForm({ coins: '', periodTo: new Date().toISOString().split('T')[0], method: 'UPI', reference: '', note: '' });
      fetchDakshinaLedger();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payout');
    } finally {
      setSavingPayout(false);
    }
  };

  // Neutralise spreadsheet formula injection (=, +, -, @) and quotes in exported text.
  const csvSafe = (v: any) => {
    const t = String(v ?? '').replace(/"/g, '""');
    return /^[=+\-@\t\r]/.test(t) ? `'${t}` : t;
  };

  const exportDakshinaCsv = () => {
    if (!dakshinaData.ledger.length) {
      toast.error('No dakshina records to export.');
      return;
    }
    const headers = [
      'Pandit Name',
      'Email',
      'Earned Coins',
      'Paid Coins',
      'Due Coins',
      'Net Earned (INR)',
      'Due Net INR (₹)',
      'Paid Net INR (₹)',
      'Offerings Count',
      'Last Offering At',
      'Last Paid At',
    ];
    const rows = dakshinaData.ledger.map((p) => [
      `"${csvSafe(p.panditName)}"`,
      `"${csvSafe(p.panditEmail)}"`,
      p.earnedCoins ?? p.totalCoins ?? 0,
      p.paidCoins ?? 0,
      p.dueCoins ?? 0,
      (p.totalInr ?? 0).toFixed(2),
      (p.dueNetInr ?? 0).toFixed(2),
      (p.paidNetInr ?? 0).toFixed(2),
      p.transactionCount || 0,
      p.lastDakshinaAt ? `"${new Date(p.lastDakshinaAt).toISOString()}"` : 'N/A',
      p.lastPaidAt ? `"${new Date(p.lastPaidAt).toISOString()}"` : 'N/A',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `paramdarshan_dakshina_ledger_${new Date().toISOString().split('T')[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Dakshina Ledger CSV exported successfully!');
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

  const handleToggleSpecialBadge = async (profileId: string, hasSpecialBadge: boolean, title?: string) => {
    setUpdatingPanditId(profileId);
    try {
      await apiFetch(`/admin/pandits/${profileId}/special-badge`, {
        method: 'PATCH',
        body: JSON.stringify({
          hasSpecialBadge,
          specialBadgeTitle: title,
        }),
      });
      setPanditsList((prev) =>
        prev.map((p) =>
          p.id === profileId
            ? { ...p, hasSpecialBadge, specialBadgeTitle: title || p.specialBadgeTitle }
            : p
        )
      );
      toast.success(
        hasSpecialBadge
          ? `Awarded Special Honors Badge "${title || 'आचार्य रत्न'}" to pandit!`
          : 'Special Honors Badge revoked.'
      );
      setEditingSpecialBadge(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update special badge');
    } finally {
      setUpdatingPanditId(null);
    }
  };

  const handleToggleVerifiedBadge = async (profileId: string, isVerifiedBadge: boolean) => {
    setUpdatingPanditId(profileId);
    try {
      await apiFetch(`/admin/pandits/${profileId}/verified-badge`, {
        method: 'PATCH',
        body: JSON.stringify({ isVerifiedBadge }),
      });
      setPanditsList((prev) =>
        prev.map((p) =>
          p.id === profileId ? { ...p, isVerifiedBadge } : p
        )
      );
      toast.success(
        isVerifiedBadge
          ? 'KYC Verified Badge enabled for pandit.'
          : 'Verified Badge disabled.'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to update verified badge');
    } finally {
      setUpdatingPanditId(null);
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
      } else if (confirmAction.type === 'deleteCategory') {
        await apiFetch(`/admin/categories/${confirmAction.id}`, { method: 'DELETE' });
        setCategoriesList((prev) => prev.filter((c) => c.id !== confirmAction.id));
        setConfirmAction(null);
        toast.success('Category deleted successfully.');
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

      {/* Special Badge Customization & Award Modal */}
      {editingSpecialBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-obsidian-soft border border-gold/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-gold/15 pb-4">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif text-lg font-bold text-white">
                  Special Vedic Honors Badge
                </h3>
              </div>
              <button
                onClick={() => setEditingSpecialBadge(null)}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              Award or update the prestigious Special Acharya Badge for{' '}
              <strong className="text-amber-300 font-serif">{editingSpecialBadge.panditName}</strong>. This badge shines prominently on their public profile, search catalog, and live broadcasts.
            </p>

            {/* Live Badge Preview */}
            <div className="bg-obsidian border border-gold/20 rounded-2xl p-4 text-center space-y-2">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">Live Badge Preview</span>
              <div className="flex justify-center items-center py-2">
                <SpecialPanditBadge title={editingSpecialBadge.title || 'आचार्य रत्न'} size="lg" />
              </div>
            </div>

            {/* Title Input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-200">
                Honorific Title (हिंदी / Sanskrit)
              </label>
              <input
                type="text"
                value={editingSpecialBadge.title}
                onChange={(e) =>
                  setEditingSpecialBadge((prev) => prev ? { ...prev, title: e.target.value } : null)
                }
                placeholder="e.g. आचार्य रत्न, कर्मकाण्ड रत्न"
                className="w-full px-3.5 py-2.5 bg-obsidian border border-gold/30 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  'आचार्य रत्न',
                  'कर्मकाण्ड रत्न',
                  'वास्तु रत्न',
                  'सुंदरकांड रत्न',
                  'रुद्राभिषेक शिरोमणि',
                  'ज्योतिष कर्मकाण्ड भूषण',
                  'वैदिक विद्वान रत्न',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      setEditingSpecialBadge((prev) => prev ? { ...prev, title: preset } : null)
                    }
                    className="text-[10px] px-2 py-0.5 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 hover:border-gold/40 transition"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-gold/15">
              {editingSpecialBadge.hasSpecialBadge ? (
                <button
                  type="button"
                  disabled={updatingPanditId === editingSpecialBadge.profileId}
                  onClick={() =>
                    handleToggleSpecialBadge(editingSpecialBadge.profileId, false)
                  }
                  className="px-4 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded-xl text-xs font-semibold transition"
                >
                  Revoke Badge
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSpecialBadge(null)}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updatingPanditId === editingSpecialBadge.profileId}
                  onClick={() =>
                    handleToggleSpecialBadge(
                      editingSpecialBadge.profileId,
                      true,
                      editingSpecialBadge.title.trim() || 'आचार्य रत्न'
                    )
                  }
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-obsidian rounded-xl text-xs font-bold transition shadow-md"
                >
                  {updatingPanditId === editingSpecialBadge.profileId
                    ? 'Saving...'
                    : editingSpecialBadge.hasSpecialBadge
                    ? 'Update Badge'
                    : 'Award Special Badge'}
                </button>
              </div>
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
          { key: 'pandits', label: `Vedic Pandits (${panditsList.length})` },
          { key: 'categories', label: `Stream Categories (${categoriesList.length})` },
          { key: 'bookings', label: `Dakshina Offerings (${bookingsTotal || bookingsList.length})` },
          { key: 'dakshina', label: 'Dakshina Ledger' },
          { key: 'kyc', label: `Pending KYC (${kycList.length})` },
          { key: 'streams', label: `Live Monitor (${liveStreams.length})` },
          { key: 'reports', label: `Safety Reports (${reports.length})` },
          { key: 'wordFilters', label: `Prohibited Words (${wordFilters.length})` },
          { key: 'users', label: `User Directory (${users.length})` },
          { key: 'audit', label: `Audit Log (${auditLogs.length})` },
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

      {/* Tab: Vedic Pandits Directory & Special Badges */}
      {activeTab === 'pandits' && (
        <div className="space-y-6">
          {/* Summary metrics for Pandits */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 uppercase font-semibold block">Total Pandits</span>
              <span className="text-2xl font-extrabold text-stone-900 dark:text-white mt-1 block">{panditsList.length}</span>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-amber-500 uppercase font-semibold block">Special Honors (आचार्य रत्न)</span>
              <span className="text-2xl font-extrabold text-amber-400 mt-1 block">
                {panditsList.filter((p) => p.hasSpecialBadge).length}
              </span>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-emerald-500 uppercase font-semibold block">KYC Verified Badges</span>
              <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                {panditsList.filter((p) => p.isVerifiedBadge).length}
              </span>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-orange-500 uppercase font-semibold block">Broadcasts Conducted</span>
              <span className="text-2xl font-extrabold text-orange-400 mt-1 block">
                {panditsList.reduce((acc, p) => acc + (p.totalStreams || 0), 0)}
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-900/60 p-4 rounded-2xl border border-stone-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                placeholder="Search pandits by name, email, or specialty..."
                value={searchPandit}
                onChange={(e) => setSearchPandit(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold/40"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(['all', 'special', 'verified'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setPanditFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                    panditFilter === filter
                      ? 'bg-gold text-obsidian font-bold shadow'
                      : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                  }`}
                >
                  {filter === 'all'
                    ? `All (${panditsList.length})`
                    : filter === 'special'
                    ? `Special Honors (${panditsList.filter((p) => p.hasSpecialBadge).length})`
                    : `Verified (${panditsList.filter((p) => p.isVerifiedBadge).length})`}
                </button>
              ))}
            </div>
          </div>

          {/* Pandit Cards Grid */}
          <div className="space-y-4">
            {panditsList
              .filter((p) => {
                if (panditFilter === 'special' && !p.hasSpecialBadge) return false;
                if (panditFilter === 'verified' && !p.isVerifiedBadge) return false;
                if (!searchPandit) return true;
                const query = searchPandit.toLowerCase();
                return (
                  p.name.toLowerCase().includes(query) ||
                  p.email.toLowerCase().includes(query) ||
                  (p.specialties || []).some((s: string) => s.toLowerCase().includes(query)) ||
                  (p.specialBadgeTitle || '').toLowerCase().includes(query)
                );
              })
              .map((pandit) => (
                <div
                  key={pandit.id}
                  className="bg-stone-900 border border-stone-800 hover:border-gold/30 p-5 rounded-2xl transition shadow-lg flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-stone-950 border border-gold/30 shrink-0 shadow-md">
                      <img
                        src={pandit.avatarUrl || '/images/pandits/pandit-rohit-tiwari.webp'}
                        alt={pandit.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/pandits/pandit-rohit-tiwari.webp';
                        }}
                      />
                    </div>
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-serif font-bold text-white text-base">
                          {pandit.name}
                        </h4>
                        {pandit.isVerifiedBadge && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
                            <VerifiedPanditBadge size={12} /> KYC Verified
                          </span>
                        )}
                        {pandit.hasSpecialBadge && (
                          <SpecialPanditBadge title={pandit.specialBadgeTitle} size="sm" />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-400">
                        <span>{pandit.email}</span>
                        <span>•</span>
                        <span>{pandit.followerCount || 0} Followers</span>
                        <span>•</span>
                        <span>{pandit.totalStreams || 0} Broadcasts</span>
                        <span>•</span>
                        <span className="uppercase text-[10px] font-bold text-amber-500/90">
                          KYC: {pandit.kycStatus}
                        </span>
                      </div>

                      {pandit.bio && (
                        <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed pt-0.5">
                          {pandit.bio}
                        </p>
                      )}

                      {pandit.specialties && pandit.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {pandit.specialties.map((spec: string) => (
                            <span
                              key={spec}
                              className="text-[9px] font-medium px-2 py-0.5 rounded-md bg-stone-950 text-stone-400 border border-stone-800"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0 justify-end border-t lg:border-t-0 border-stone-800 pt-3 lg:pt-0">
                    {/* Grant / Edit Special Honors Badge Button */}
                    <button
                      onClick={() =>
                        setEditingSpecialBadge({
                          profileId: pandit.id,
                          panditName: pandit.name,
                          title: pandit.specialBadgeTitle || 'आचार्य रत्न',
                          hasSpecialBadge: pandit.hasSpecialBadge,
                        })
                      }
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                        pandit.hasSpecialBadge
                          ? 'bg-amber-950/50 hover:bg-amber-900/60 text-amber-200 border border-amber-500/50'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-obsidian'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{pandit.hasSpecialBadge ? 'Edit Special Badge' : 'Award Special Badge'}</span>
                    </button>

                    {/* Toggle Verified KYC Badge Button */}
                    <button
                      disabled={updatingPanditId === pandit.id}
                      onClick={() =>
                        handleToggleVerifiedBadge(pandit.id, !pandit.isVerifiedBadge)
                      }
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border ${
                        pandit.isVerifiedBadge
                          ? 'bg-stone-950 text-emerald-400 border-emerald-500/40 hover:bg-stone-800'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{pandit.isVerifiedBadge ? 'Revoke Verified' : 'Mark Verified'}</span>
                    </button>

                    {/* View Public Profile Link */}
                    {(() => {
                      const SLUG_MAP: Record<string, string> = {
                        'tripathiayush068@gmail.com': 'rohit-tiwari',
                        'rohit.tiwari@shubhdarshan.com': 'rohit-tiwari',
                        's.k.jyotish@gmail.com': 'santosh-shastri',
                        'skjyotish@gmail.com': 'santosh-shastri',
                        'ravipathak8877@gmail.com': 'ravi-pathak',
                        'ravi.pathak@shubhdarshan.com': 'ravi-pathak',
                        'nitinsharma3797@gmail.com': 'nitin-sharma',
                        'nitin.sharma@shubhdarshan.com': 'nitin-sharma',
                        'umeshdubey867@gmail.com': 'umesh-shastri',
                        'umesh.shastri@shubhdarshan.com': 'umesh-shastri',
                        'Kdtripathi481@gmail.com': 'kuber-tripathi',
                        'kdtripathi481@gmail.com': 'kuber-tripathi',
                        'kuber.tripathi@shubhdarshan.com': 'kuber-tripathi',
                        'subhash.shastri@shubhdarshan.com': 'subhash-shastri',
                        'sumitpachori8@gmail.com': 'sumit-shastri',
                        'nandkishortripathi893@gmail.com': 'nandkishor-tripathi',
                      };
                      const slug = SLUG_MAP[pandit.email] || pandit.id;
                      return (
                        <a
                          href={`/pandit/${slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-800 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Profile</span>
                        </a>
                      );
                    })()}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tab: Stream Categories UI */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">Total Categories</span>
              <span className="text-2xl font-extrabold text-white mt-1 block">{categoriesList.length}</span>
            </div>
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-emerald-400 uppercase font-semibold block">Active on Platform</span>
              <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                {categoriesList.filter((c) => c.isActive !== false).length}
              </span>
            </div>
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-amber-400 uppercase font-semibold block">Inactive / Hidden</span>
              <span className="text-2xl font-extrabold text-amber-400 mt-1 block">
                {categoriesList.filter((c) => c.isActive === false).length}
              </span>
            </div>
          </div>

          {/* Create Category Form */}
          <div className="bg-stone-900 border border-stone-800 p-5 sm:p-6 rounded-2xl shadow-lg">
            <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-gold" /> Add New Stream Category
            </h3>
            <p className="text-xs text-stone-400 mb-4">
              Create sacred stream categories (e.g. Maha Shivratri, Vedic Havan, Bhagavad Gita, Rudrabhishek) for devotees to discover live broadcasts.
            </p>
            <form onSubmit={handleCreateCategory} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => {
                    setNewCategoryName(e.target.value);
                    if (!newCategorySlug || newCategorySlug === newCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-')) {
                      setNewCategorySlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                    }
                  }}
                  placeholder="Category Name (e.g. Maha Shivratri)"
                  className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={newCategorySlug}
                  onChange={(e) => setNewCategorySlug(e.target.value)}
                  placeholder="Slug (e.g. maha-shivratri)"
                  className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newCategoryOrder}
                  onChange={(e) => setNewCategoryOrder(Number(e.target.value))}
                  placeholder="Order (0)"
                  className="w-20 px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold"
                />
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-obsidian rounded-xl text-xs font-bold transition shadow inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> {savingCategory ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>

          {/* Edit Category Modal */}
          {editingCategoryId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-stone-900 border border-gold/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <h3 className="font-serif text-base font-bold text-white flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-gold" /> Edit Category
                  </h3>
                  <button onClick={() => setEditingCategoryId(null)} className="text-stone-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">Category Name</label>
                    <input
                      type="text"
                      value={editCategoryForm.name}
                      onChange={(e) => setEditCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">Display Order</label>
                    <input
                      type="number"
                      value={editCategoryForm.displayOrder}
                      onChange={(e) => setEditCategoryForm((prev) => ({ ...prev, displayOrder: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="catIsActive"
                      checked={editCategoryForm.isActive}
                      onChange={(e) => setEditCategoryForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                      className="rounded border-stone-700 text-gold focus:ring-0"
                    />
                    <label htmlFor="catIsActive" className="text-xs text-stone-300 cursor-pointer">
                      Category is Active and visible on the website
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => setEditingCategoryId(null)}
                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCategory(editingCategoryId)}
                    className="px-4 py-2 bg-gold hover:bg-gold-deep text-obsidian rounded-xl text-xs font-bold transition shadow"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Categories Table */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-stone-950/60 border-b border-stone-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-gold" /> Existing Categories ({categoriesList.length})
              </h3>
              <button
                onClick={fetchCategories}
                className="text-xs text-stone-400 hover:text-white flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            {categoriesList.length === 0 ? (
              <div className="p-10 text-center text-stone-400 text-xs">
                No stream categories configured yet. Add your first category above!
              </div>
            ) : (
              <div className="divide-y divide-stone-800">
                {categoriesList.map((cat) => (
                  <div key={cat.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center font-mono text-gold font-bold text-xs shrink-0">
                        {cat.displayOrder || 0}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm truncate">{cat.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              cat.isActive !== false
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                                : 'bg-stone-800 text-stone-400 border border-stone-700'
                            }`}
                          >
                            {cat.isActive !== false ? 'Active' : 'Hidden'}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-stone-500 block">slug: {cat.slug}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleToggleCategoryActive(cat.id, cat.isActive !== false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition border ${
                          cat.isActive !== false
                            ? 'bg-stone-950 text-stone-300 border-stone-800 hover:bg-stone-800'
                            : 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40 hover:bg-emerald-900/40'
                        }`}
                      >
                        {cat.isActive !== false ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingCategoryId(cat.id);
                          setEditCategoryForm({
                            name: cat.name,
                            displayOrder: cat.displayOrder || 0,
                            isActive: cat.isActive !== false,
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-800 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 text-stone-500 hover:text-red-400 hover:bg-stone-800 rounded-lg transition"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Dakshina Offerings Oversight */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">Total Offerings</span>
              <span className="text-2xl font-extrabold text-white mt-1 block">{bookingsTotal}</span>
            </div>
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-emerald-400 uppercase font-semibold block">Confirmed</span>
              <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                {bookingsList.filter((b) => b.status === 'SUCCESS').length}
              </span>
            </div>
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-amber-400 uppercase font-semibold block">Pending / Unpaid</span>
              <span className="text-2xl font-extrabold text-amber-400 mt-1 block">
                {bookingsList.filter((b) => b.status === 'PENDING').length}
              </span>
            </div>
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-gold uppercase font-semibold block">Total Dakshina Volume</span>
              <span className="text-2xl font-extrabold text-gold mt-1 block">
                {bookingsList.reduce((acc, b) => acc + (b.coins || 0), 0)} coins
              </span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-900/60 p-4 rounded-2xl border border-stone-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                placeholder="Search by devotee, gotra, or pandit ji..."
                value={searchBooking}
                onChange={(e) => setSearchBooking(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(['ALL', 'SUCCESS', 'PENDING', 'FAILED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setBookingStatusFilter(st);
                    fetchBookings(st);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                    bookingStatusFilter === st
                      ? 'bg-gold text-obsidian font-bold shadow'
                      : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                  }`}
                >
                  {st === 'ALL' ? 'All Offerings' : st}
                </button>
              ))}
              <button
                onClick={() => fetchBookings(bookingStatusFilter)}
                className="p-2 bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-white rounded-lg border border-stone-800 transition"
                title="Refresh"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingBookings ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Bookings List */}
          <div className="space-y-3">
            {bookingsList
              .filter((b) => {
                if (!searchBooking) return true;
                const q = searchBooking.toLowerCase();
                return (
                  (b.devoteeName || '').toLowerCase().includes(q) ||
                  (b.devoteeEmail || '').toLowerCase().includes(q) ||
                  (b.gotra || '').toLowerCase().includes(q) ||
                  (b.panditName || '').toLowerCase().includes(q) ||
                  (b.streamTitle || '').toLowerCase().includes(q) ||
                  (b.prayerMessage || '').toLowerCase().includes(q)
                );
              })
              .map((b) => (
                <div
                  key={b.id}
                  className="bg-stone-900 border border-stone-800 p-4 sm:p-5 rounded-2xl shadow-md hover:border-gold/30 transition flex flex-col lg:flex-row justify-between gap-4"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white text-sm">{b.devoteeName}</span>
                      {b.devoteeEmail && (
                        <span className="text-xs text-stone-400 font-mono" title="Email masked for privacy">({b.devoteeEmail} 🔒)</span>
                      )}
                      {b.gotra && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-950/60 text-amber-300 border border-amber-600/40">
                          गोत्र: {b.gotra}
                        </span>
                      )}
                      <span
                        className={`ml-auto sm:ml-0 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'SUCCESS'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                            : b.status === 'PENDING'
                            ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                            : 'bg-red-950/60 text-red-400 border border-red-500/40'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-stone-300">
                      <div>
                        <span className="text-stone-500">Assigned Pandit:</span>{' '}
                        <strong className="text-gold font-serif">{b.panditName || 'Temple Priest'}</strong>
                      </div>
                      {b.streamTitle && (
                        <div>
                          <span className="text-stone-500">Pooja Broadcast:</span>{' '}
                          <span className="text-stone-200">{b.streamTitle}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-stone-500">Dakshina:</span>{' '}
                        <strong className="text-amber-400">{b.coins || 0} Coins</strong>
                        {b.amount ? ` (₹${Number(b.amount).toFixed(2)})` : ''}
                      </div>
                    </div>

                    {b.prayerMessage && (
                      <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800 text-xs text-stone-300 italic">
                        "{b.prayerMessage}"
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0 text-[11px] text-stone-500 font-mono flex lg:flex-col justify-between items-end">
                    <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                    <span>{new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}

            {bookingsList.length === 0 && (
              <div className="bg-stone-900 border border-stone-800 p-12 text-center rounded-2xl text-stone-400 text-xs">
                No dakshina offering records found matching current criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Pandit Dakshina Payout Ledger */}
      {activeTab === 'dakshina' && (
        <div className="space-y-6">
          {/* Summary Financial KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">Total Pandit Earnings (Dakshina + watch time)</span>
              <span className="text-2xl font-extrabold text-gold mt-1 block">
                {(dakshinaData.platformTotalCoins ?? 0).toLocaleString()} Coins
              </span>
              <span className="text-[11px] text-stone-500 block mt-0.5">
                ₹{(dakshinaData.platformTotalInr ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} net earned (85%)
              </span>
            </div>
            <div className="bg-stone-900 border border-amber-500/20 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-amber-400 uppercase font-semibold block">Total Due to Pandits</span>
              <span className="text-2xl font-extrabold text-amber-400 mt-1 block">
                {(dakshinaData.platformDueCoins ?? 0).toLocaleString()} Coins
              </span>
              <span className="text-[11px] text-stone-500 block mt-0.5">
                ₹{(dakshinaData.platformDueNetInr ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pending settlement
              </span>
            </div>
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">Active Earning Pandits</span>
              <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                {dakshinaData.ledger.length}
              </span>
            </div>
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">Settlement Export</span>
              <button
                onClick={exportDakshinaCsv}
                className="mt-2 w-full py-2 bg-stone-950 hover:bg-stone-800 text-gold border border-gold/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" /> Export Ledger CSV
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center justify-between gap-3 bg-stone-900/60 p-4 rounded-2xl border border-stone-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                placeholder="Search pandit by name or email..."
                value={searchLedger}
                onChange={(e) => setSearchLedger(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold"
              />
            </div>
            <button
              onClick={fetchDakshinaLedger}
              className="px-3.5 py-2 bg-stone-950 hover:bg-stone-800 text-stone-300 rounded-xl border border-stone-800 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Ledger
            </button>
          </div>

          {/* Ledger Table */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-stone-950/60 border-b border-stone-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-gold" /> Pandit Dakshina Breakdown & Settlement Roster
              </h3>
              <span className="text-xs text-stone-400 font-mono">Rate: 10 Coins = ₹1 INR</span>
            </div>

            {dakshinaData.ledger.length === 0 ? (
              <div className="p-10 text-center text-stone-400 text-xs">
                No dakshina offerings recorded yet on the platform.
              </div>
            ) : (
              <div className="divide-y divide-stone-800">
                {dakshinaData.ledger
                  .filter((p) => {
                    if (!searchLedger) return true;
                    const q = searchLedger.toLowerCase();
                    return (
                      (p.panditName || '').toLowerCase().includes(q) ||
                      (p.panditEmail || '').toLowerCase().includes(q)
                    );
                  })
                  .map((p) => {
                    return (
                      <div
                        key={p.panditId}
                        className="p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 text-xs"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-stone-950 border border-gold/30 shrink-0">
                            <img
                              src={p.panditAvatarUrl || '/images/pandits/pandit-rohit-tiwari.webp'}
                              alt={p.panditName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/images/pandits/pandit-rohit-tiwari.webp';
                              }}
                            />
                          </div>
                          <div>
                            <span className="font-bold text-white text-sm block font-serif">{p.panditName}</span>
                            <span className="text-stone-400 text-[11px]">{p.panditEmail}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-6">
                          {/* Earned */}
                          <div>
                            <span className="text-[10px] text-stone-400 uppercase font-semibold block">Earned</span>
                            <span className="font-extrabold text-gold text-base flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5" /> {(p.earnedCoins ?? p.totalCoins ?? 0).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-stone-500 block">₹{(p.totalInr ?? 0).toFixed(2)} net</span>
                          </div>

                          {/* Paid */}
                          <div>
                            <span className="text-[10px] text-stone-400 uppercase font-semibold block">Paid</span>
                            <span className="font-extrabold text-emerald-400 text-base flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5" /> {(p.paidCoins ?? 0).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-stone-500 block">₹{(p.paidNetInr ?? 0).toFixed(2)}</span>
                          </div>

                          {/* Due */}
                          <div>
                            <span className="text-[10px] text-stone-400 uppercase font-semibold block">Due</span>
                            <span className={`font-extrabold text-base flex items-center gap-1 ${(p.dueCoins ?? 0) > 0 ? 'text-amber-400' : 'text-stone-500'}`}>
                              <Coins className="w-3.5 h-3.5" /> {(p.dueCoins ?? 0).toLocaleString()}
                            </span>
                            <span className={`text-[10px] block ${(p.dueCoins ?? 0) > 0 ? 'text-amber-500' : 'text-stone-500'}`}>₹{(p.dueNetInr ?? 0).toFixed(2)}</span>
                          </div>

                          <div>
                            <span className="text-[10px] text-stone-400 uppercase font-semibold block">Offerings</span>
                            <span className="font-bold text-white text-sm">
                              {p.transactionCount} txns
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-stone-400 uppercase font-semibold block">Last Offering</span>
                            <span className="text-stone-300 font-mono text-[11px]">
                              {p.lastDakshinaAt ? new Date(p.lastDakshinaAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>

                          {/* Record Payout button */}
                          <button
                            onClick={() => {
                              setPayoutModal({ panditId: p.panditId, panditName: p.panditName, dueCoins: p.dueCoins ?? 0, dueNetInr: p.dueNetInr ?? 0 });
                              setPayoutForm({ coins: String(p.dueCoins ?? ''), periodTo: new Date().toISOString().split('T')[0], method: 'UPI', reference: '', note: '' });
                            }}
                            disabled={(p.dueCoins ?? 0) === 0}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-yellow-500 text-obsidian rounded-xl text-xs font-bold flex items-center gap-1.5 shadow hover:opacity-90 transition disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <IndianRupee className="w-3.5 h-3.5" /> Record Payout
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Payout Modal ===== */}
      {payoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-950 border border-amber-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-amber-500/15 pb-4">
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-amber-400" /> Record Payout
              </h3>
              <button onClick={() => setPayoutModal(null)} className="text-stone-400 hover:text-white p-1 transition"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-stone-300">
              Recording settlement for{' '}
              <strong className="text-amber-300 font-serif">{payoutModal.panditName}</strong>.{' '}
              Due:{' '}
              <strong className="text-amber-400">{payoutModal.dueCoins.toLocaleString()} coins (₹{payoutModal.dueNetInr.toFixed(2)} net)</strong>.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-stone-400 uppercase font-semibold block mb-1">Coins to Settle (≤ {payoutModal.dueCoins.toLocaleString()} due)</label>
                <input
                  type="number"
                  placeholder={`Max: ${payoutModal.dueCoins}`}
                  value={payoutForm.coins}
                  onChange={(e) => setPayoutForm((p) => ({ ...p, coins: e.target.value }))}
                  max={payoutModal.dueCoins}
                  min={1}
                  className="w-full px-3.5 py-2.5 bg-stone-900 border border-amber-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400 placeholder-stone-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-400 uppercase font-semibold block mb-1">Period To (earnings up to this date)</label>
                <input
                  type="date"
                  value={payoutForm.periodTo}
                  onChange={(e) => setPayoutForm((p) => ({ ...p, periodTo: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-stone-900 border border-amber-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-400 uppercase font-semibold block mb-1">Payment Method</label>
                <select
                  value={payoutForm.method}
                  onChange={(e) => setPayoutForm((p) => ({ ...p, method: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-stone-900 border border-amber-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="UPI">UPI</option>
                  <option value="NEFT">NEFT</option>
                  <option value="IMPS">IMPS</option>
                  <option value="RTGS">RTGS</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-stone-400 uppercase font-semibold block mb-1">UTR / Transaction ID *</label>
                <input
                  type="text"
                  placeholder="e.g. 423987654321 (required, must be unique)"
                  value={payoutForm.reference}
                  onChange={(e) => setPayoutForm((p) => ({ ...p, reference: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-stone-900 border border-amber-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400 placeholder-stone-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-400 uppercase font-semibold block mb-1">Note (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. November settlement"
                  value={payoutForm.note}
                  onChange={(e) => setPayoutForm((p) => ({ ...p, note: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-stone-900 border border-amber-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400 placeholder-stone-600"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-amber-500/15">
              <button
                onClick={() => setPayoutModal(null)}
                className="px-4 py-2 bg-stone-900 text-stone-300 hover:text-white rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                disabled={
                  savingPayout ||
                  !payoutForm.coins ||
                  Number(payoutForm.coins) <= 0 ||
                  Number(payoutForm.coins) > payoutModal.dueCoins ||
                  !payoutForm.reference.trim()
                }
                onClick={handleRecordPayout}
                className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 rounded-xl text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition"
              >
                {savingPayout ? 'Saving...' : 'Record Payout'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Tab: User Directory & Access Control */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-900/60 p-4 rounded-2xl border border-stone-800">
            <div className="flex gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                <input
                  type="text"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearchUsers();
                  }}
                  placeholder="Search user by name or email (Press Enter)..."
                  className="w-full pl-9 pr-4 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold"
                />
              </div>
              <button
                onClick={handleSearchUsers}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-obsidian rounded-xl text-xs font-bold transition shadow"
              >
                Search
              </button>
              {searchUser && (
                <button
                  onClick={() => {
                    setSearchUser('');
                    apiFetch('/admin/users').then((data) => setUsers(data || []));
                  }}
                  className="px-3 py-2 bg-stone-950 hover:bg-stone-800 text-stone-400 rounded-xl text-xs transition border border-stone-800"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="text-xs text-stone-400 flex items-center gap-3">
              <span>Total in directory: <strong className="text-white">{users.length}</strong></span>
              <button
                onClick={() => {
                  setSearchUser('');
                  apiFetch('/admin/users').then((data) => setUsers(data || []));
                }}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg transition"
                title="Refresh user list"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="bg-stone-900 border border-stone-800 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs shadow-md hover:border-gold/30 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white text-sm">{u.name}</span>
                    <span className="text-stone-400 text-xs">({u.email})</span>

                    {/* Role badge */}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        u.role === 'ADMIN'
                          ? 'bg-rose-950/70 text-rose-300 border border-rose-500/40'
                          : u.role === 'STREAMER'
                          ? 'bg-amber-950/70 text-amber-300 border border-amber-500/40'
                          : 'bg-stone-800 text-stone-300 border border-stone-700'
                      }`}
                    >
                      {u.role}
                    </span>

                    {/* Status badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                          : u.status === 'SUSPENDED'
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-500/40'
                          : 'bg-red-950/60 text-red-400 border border-red-500/40'
                      }`}
                    >
                      {u.status}
                    </span>

                    {/* 2FA badge */}
                    {u.isTwoFactorEnabled ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold" title="2FA Active">
                        <ShieldCheck className="w-3 h-3" /> 2FA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-stone-500 font-semibold" title="2FA Disabled">
                        <Lock className="w-3 h-3" /> No 2FA
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-stone-500 font-mono">
                    ID: {u.id} • Joined: {new Date(u.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {u.role !== 'ADMIN' && (
                    <>
                      {u.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleUserStatus(u.id, 'BANNED')}
                          className="px-3.5 py-1.5 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded-xl text-xs font-semibold transition"
                        >
                          Ban User
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUserStatus(u.id, 'ACTIVE')}
                          className="px-3.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 rounded-xl text-xs font-semibold transition"
                        >
                          Restore User
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {users.length === 0 && (
              <div className="bg-stone-900 border border-stone-800 p-12 text-center rounded-2xl text-stone-400 text-xs">
                No users found matching current query.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Audit Log (Immutable) */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-stone-900/60 p-4 rounded-2xl border border-stone-800 text-xs">
            <span className="text-stone-300">
              Showing immutable platform audit trail (<strong className="text-white">{auditLogs.length}</strong> events logged)
            </span>
            <button
              onClick={() => {
                const token = localStorage.getItem('pooja_token');
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
                fetch(`${apiUrl}/admin/audit-logs`, { headers: { Authorization: `Bearer ${token}` } })
                  .then((r) => r.json())
                  .then((data) => setAuditLogs(data || []));
              }}
              className="px-3 py-1.5 bg-stone-950 hover:bg-stone-800 text-stone-300 rounded-xl border border-stone-800 flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
            </button>
          </div>

          <div className="space-y-2.5">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="bg-stone-900 border border-stone-800 p-4 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                      [{log.action}]
                    </span>
                    <span className="text-white font-semibold">{log.targetResource}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-400">
                    <span>Actor: <strong className="text-stone-300">{log.actorEmail || 'System'}</strong></span>
                    {log.ipAddress && <span>• IP: {log.ipAddress}</span>}
                  </div>

                  {log.details && typeof log.details === 'object' && Object.keys(log.details).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5 pt-1">
                      {Object.entries(log.details).map(([k, v]) => (
                        <span
                          key={k}
                          className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-950 text-stone-400 border border-stone-800"
                        >
                          {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-stone-400 font-mono text-[11px] shrink-0 self-end sm:self-center">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}

            {auditLogs.length === 0 && (
              <div className="bg-stone-900 border border-stone-800 p-12 text-center rounded-2xl text-stone-400 text-xs space-y-1">
                <AlertCircle className="w-6 h-6 text-stone-500 mx-auto mb-2" />
                <p className="font-bold text-white text-sm">No audit logs recorded yet</p>
                <p>Immutable moderation, verification, and kill switch events will automatically appear here.</p>
              </div>
            )}
          </div>
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
        title={
          confirmAction?.type === 'endStream'
            ? 'Emergency Force-End Stream'
            : confirmAction?.type === 'deleteCategory'
            ? 'Delete Stream Category'
            : 'Remove Chat Filter Word'
        }
        description={
          confirmAction?.type === 'endStream'
            ? 'Emergency Action: Force end this stream immediately on LiveKit SFU? Connected participants will be disconnected right away.'
            : confirmAction?.type === 'deleteCategory'
            ? 'Delete this category? If any streams are assigned to it, the action will be blocked to protect platform integrity.'
            : 'Remove this word from the prohibited chat filter list?'
        }
        confirmLabel={
          confirmAction?.type === 'endStream'
            ? 'Force End Stream'
            : confirmAction?.type === 'deleteCategory'
            ? 'Delete Category'
            : 'Remove Word'
        }
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
