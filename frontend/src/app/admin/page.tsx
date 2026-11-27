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
import { useLang } from '@/lib/i18n/context';
import {
  formatCoins,
  formatLocaleDate,
  formatLocaleDateTime,
  translateCategoryLabel,
} from '@/lib/i18n/format';
import {
  AdminTabKey,
  CONFIRM_COPY,
  ConfirmActionType,
  translateAdminToken,
} from './admin-i18n';

export default function AdminConsolePage() {
  const router = useRouter();
  const toast = useToast();
  const { lang, t: L } = useLang();
  const [activeTab, setActiveTab] = useState<AdminTabKey>('kpi');
  const [stats, setStats] = useState<any>(null);
  const [panditsList, setPanditsList] = useState<any[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<any[]>([]);
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
  const [confirmAction, setConfirmAction] = useState<{
    type: 'endStream' | 'deleteWord' | 'deleteCategory' | 'approveDeletion' | 'rejectDeletion';
    id: string;
    label?: string;
  } | null>(null);
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
          toast.error(L('Access restricted to platform operators only.', 'प्रवेश केवल प्लेटफ़ॉर्म संचालकों तक सीमित है।'));
          router.push('/');
          return;
        }

        if (!me.isTwoFactorEnabled) {
          toast.error(
            L(
              'Two-factor authentication is required for Platform Administrators. Please set up 2FA.',
              'प्लेटफ़ॉर्म व्यवस्थापकों के लिए दो-चरणीय प्रमाणीकरण (2FA) अनिवार्य है। कृपया 2FA सेट करें।',
            ),
          );
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
        toast.error(
          err?.message ||
            L('Unable to verify administrator session. Please retry.', 'व्यवस्थापक सत्र सत्यापित नहीं हो सका। कृपया पुनः प्रयास करें।'),
        );
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
      toast.error(L('Please sign in again.', 'कृपया पुनः साइन इन करें।'));
      return;
    }
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const res = await fetch(`${apiUrl}/storage/kyc-document?key=${encodeURIComponent(storageKey)}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!res.ok) {
        toast.error(
          L(
            'Could not open the document. It may have been removed or access was denied.',
            'दस्तावेज़ खोला नहीं जा सका। संभवतः इसे हटा दिया गया है या पहुँच अस्वीकृत है।',
          ),
        );
        return;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      // Release the object URL after 60 seconds to free memory
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      toast.error(L('Network error while loading the document. Please try again.', 'दस्तावेज़ लोड करते समय नेटवर्क त्रुटि हुई। कृपया पुनः प्रयास करें।'));
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

      // 1.9. Pending Pandit Deletion Requests
      const delReqRes = await fetch(`${apiUrl}/admin/deletion-requests`, { headers });
      if (delReqRes.ok) setDeletionRequests(await delReqRes.json());

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
    } else if (activeTab === 'deletionRequests') {
      fetchDeletionRequests();
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
      toast.success(L('Category created successfully!', 'श्रेणी सफलतापूर्वक बन गई!'));
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || L('Failed to create category', 'श्रेणी नहीं बन सकी'));
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
      toast.success(L('Category updated successfully!', 'श्रेणी सफलतापूर्वक अपडेट हुई!'));
      setEditingCategoryId(null);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || L('Failed to update category', 'श्रेणी अपडेट नहीं हो सकी'));
    }
  };

  const handleToggleCategoryActive = async (id: string, currentActive: boolean) => {
    try {
      await apiFetch(`/admin/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentActive }),
      });
      toast.success(
        !currentActive
          ? L('Category activated!', 'श्रेणी सक्रिय की गई!')
          : L('Category deactivated!', 'श्रेणी निष्क्रिय की गई!'),
      );
      setCategoriesList((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: !currentActive } : c))
      );
    } catch (err: any) {
      toast.error(err.message || L('Failed to toggle category', 'श्रेणी स्थिति बदली नहीं जा सकी'));
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

  const fetchDeletionRequests = async () => {
    try {
      const res = await apiFetch<any[]>('/admin/deletion-requests');
      setDeletionRequests(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.error('Failed to load deletion requests:', err);
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
      toast.success(L('Payout recorded successfully!', 'भुगतान सफलतापूर्वक दर्ज हो गया!'));
      setPayoutModal(null);
      setPayoutForm({ coins: '', periodTo: new Date().toISOString().split('T')[0], method: 'UPI', reference: '', note: '' });
      fetchDakshinaLedger();
      fetchDeletionRequests();
    } catch (err: any) {
      toast.error(err.message || L('Failed to record payout', 'भुगतान दर्ज नहीं हो सका'));
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
      toast.error(L('No dakshina records to export.', 'निर्यात करने के लिए कोई दक्षिणा रिकॉर्ड नहीं है।'));
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
    toast.success(L('Dakshina Ledger CSV exported successfully!', 'दक्षिणा बही CSV सफलतापूर्वक निर्यात हुई!'));
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
        throw new Error(L('Failed to update banner configuration', 'बैनर सेटिंग अपडेट नहीं हो सकी'));
      }

      const updated = await res.json();
      setBannerConfig((prev) => ({
        ...prev,
        ...updated,
        enabled: Boolean(updated.enabled),
      }));

      if (payload.enabled) {
        toast.success(
          lang === 'hi'
            ? `"${payload.occasion}" उत्सव बैनर अब पूरी वेबसाइट पर लाइव है!`
            : `Occasion Banner for "${payload.occasion}" is now live sitewide!`,
        );
      } else {
        toast.success(L('Occasion Banner is disabled and removed from the site.', 'उत्सव बैनर निष्क्रिय कर साइट से हटा दिया गया है।'));
      }
    } catch (err: any) {
      toast.error(err.message || L('Error updating banner', 'बैनर अपडेट करने में त्रुटि'));
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
          ? lang === 'hi'
            ? `पंडित जी को "${title || 'आचार्य रत्न'}" विशेष सम्मान बैज प्रदान किया गया!`
            : `Awarded Special Honors Badge "${title || 'आचार्य रत्न'}" to pandit!`
          : L('Special Honors Badge revoked.', 'विशेष सम्मान बैज वापस लिया गया।'),
      );
      setEditingSpecialBadge(null);
    } catch (err: any) {
      toast.error(err.message || L('Failed to update special badge', 'विशेष बैज अपडेट नहीं हो सका'));
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
          ? L('KYC Verified Badge enabled for pandit.', 'पंडित जी के लिए KYC सत्यापित बैज सक्रिय किया गया।')
          : L('Verified Badge disabled.', 'सत्यापित बैज निष्क्रिय किया गया।'),
      );
    } catch (err: any) {
      toast.error(err.message || L('Failed to update verified badge', 'सत्यापित बैज अपडेट नहीं हो सका'));
    } finally {
      setUpdatingPanditId(null);
    }
  };

  const handleKycDecision = async (profileId: string, decision: 'APPROVED' | 'REJECTED') => {
    if (decision === 'REJECTED') {
      // M-01: Open inline modal instead of window.prompt()
      setRejectModal({
        profileId,
        reason: L('Qualifications could not be verified.', 'योग्यता/प्रमाणपत्र सत्यापित नहीं हो सके।'),
      });
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
      toast.success(L('KYC status updated successfully.', 'KYC स्थिति सफलतापूर्वक अपडेट हुई।'));
    } catch (err: any) {
      toast.error(err.message || L('Failed to update KYC status.', 'KYC स्थिति अपडेट नहीं हो सकी।'));
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
      toast.error(err.message || L('User search failed.', 'उपयोगकर्ता खोज विफल रही।'));
    }
  };

  const handleUserStatus = async (userId: string, status: 'ACTIVE' | 'SUSPENDED' | 'BANNED') => {
    try {
      await apiFetch(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason: 'Administrative intervention' }),
      });
      handleSearchUsers();
      toast.success(
        lang === 'hi'
          ? `उपयोगकर्ता स्थिति "${translateAdminToken(status, lang)}" में अपडेट की गई।`
          : `User status updated to ${status}.`,
      );
    } catch (err: any) {
      toast.error(err.message || L('Status change failed.', 'स्थिति बदली नहीं जा सकी।'));
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
      toast.success(L('Report resolved successfully.', 'रिपोर्ट सफलतापूर्वक निस्तारित हुई।'));
    } catch (err: any) {
      toast.error(err.message || L('Failed to resolve report.', 'रिपोर्ट निस्तारित नहीं हो सकी।'));
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
      toast.success(L('Word added to chat filter.', 'शब्द चैट फ़िल्टर में जोड़ा गया।'));
    } catch (err: any) {
      toast.error(err.message || L('Failed to add word to chat filter', 'शब्द चैट फ़िल्टर में नहीं जोड़ा जा सका'));
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
        toast.success(L('Stream ended successfully.', 'प्रसारण सफलतापूर्वक समाप्त किया गया।'));
      } else if (confirmAction.type === 'deleteCategory') {
        await apiFetch(`/admin/categories/${confirmAction.id}`, { method: 'DELETE' });
        setCategoriesList((prev) => prev.filter((c) => c.id !== confirmAction.id));
        setConfirmAction(null);
        toast.success(L('Category deleted successfully.', 'श्रेणी सफलतापूर्वक हटाई गई।'));
      } else if (confirmAction.type === 'approveDeletion') {
        const res = await apiFetch<any>(`/admin/deletion-requests/${confirmAction.id}/approve`, { method: 'POST' });
        setConfirmAction(null);
        toast.success(res?.message || L('Pandit account approved and permanently erased.', 'पंडित खाता स्वीकृत कर स्थायी रूप से मिटा दिया गया।'));
        loadAdminData();
      } else if (confirmAction.type === 'rejectDeletion') {
        const res = await apiFetch<any>(`/admin/deletion-requests/${confirmAction.id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason: 'Deletion request cancelled by administrator' }),
        });
        setConfirmAction(null);
        toast.success(res?.message || L('Account restored to active status.', 'खाता पुनः सक्रिय स्थिति में बहाल हो गया।'));
        loadAdminData();
      } else {
        const wordId = confirmAction.id;
        await apiFetch(`/admin/word-filters/${wordId}`, { method: 'DELETE' });
        setWordFilters((prev) => prev.filter((w) => w.id !== wordId));
        setConfirmAction(null);
        toast.success(L('Word removed from chat filter.', 'शब्द चैट फ़िल्टर से हटाया गया।'));
      }
    } catch (err: any) {
      toast.error(
        err?.message ||
          (confirmAction.type === 'endStream'
            ? L('Failed to force end stream.', 'प्रसारण तुरंत समाप्त नहीं हो सका।')
            : L('Failed to remove word', 'शब्द हटाया नहीं जा सका')),
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
              <X className="w-5 h-5 text-red-400" /> {L('Rejection Reason', 'अस्वीकृति का कारण')}
            </h3>
            <p className="text-sm text-stone-400">
              {L('Provide a clear reason. This will be sent to the applicant.', 'स्पष्ट कारण लिखें। यह आवेदक को भेजा जाएगा।')}
            </p>
            <textarea
              className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-500 focus:outline-none focus:border-gold/50 resize-none"
              rows={3}
              autoFocus
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              placeholder={L('e.g. Qualifications could not be verified.', 'जैसे: प्रमाणपत्र/योग्यता सत्यापित नहीं हो सकी।')}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-semibold transition"
              >
                {L('Cancel', 'रद्द करें')}
              </button>
              <button
                onClick={async () => {
                  const { profileId, reason } = rejectModal;
                  setRejectModal(null);
                  await submitKycDecision(
                    profileId,
                    'REJECTED',
                    reason || L('Qualifications could not be verified.', 'प्रमाणपत्र/योग्यता सत्यापित नहीं हो सकी।'),
                  );
                }}
                className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold transition"
              >
                {L('Confirm Rejection', 'अस्वीकृति की पुष्टि करें')}
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
                  {L('Special Vedic Honors Badge', 'विशेष वैदिक सम्मान बैज')}
                </h3>
              </div>
              <button
                onClick={() => setEditingSpecialBadge(null)}
                aria-label={L('Close modal', 'मोडल बंद करें')}
                className="text-stone-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              {lang === 'hi' ? (
                <>
                  <strong className="text-amber-300 font-serif">{editingSpecialBadge.panditName}</strong> के लिए प्रतिष्ठित विशेष आचार्य सम्मान बैज प्रदान करें या अपडेट करें। यह बैज उनकी सार्वजनिक प्रोफ़ाइल, खोज सूची और लाइव प्रसारणों पर प्रमुखता से चमकता है।
                </>
              ) : (
                <>
                  Award or update the prestigious Special Acharya Badge for{' '}
                  <strong className="text-amber-300 font-serif">{editingSpecialBadge.panditName}</strong>. This badge shines prominently on their public profile, search catalog, and live broadcasts.
                </>
              )}
            </p>

            {/* Live Badge Preview */}
            <div className="bg-obsidian border border-gold/20 rounded-2xl p-4 text-center space-y-2">
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                {L('Live Badge Preview', 'लाइव बैज पूर्वावलोकन')}
              </span>
              <div className="flex justify-center items-center py-2">
                <SpecialPanditBadge title={editingSpecialBadge.title || 'आचार्य रत्न'} size="lg" />
              </div>
            </div>

            {/* Title Input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-200">
                {L('Honorific Title (Hindi / Sanskrit)', 'सम्मान उपाधि (हिंदी / संस्कृत)')}
              </label>
              <input
                type="text"
                value={editingSpecialBadge.title}
                onChange={(e) =>
                  setEditingSpecialBadge((prev) => prev ? { ...prev, title: e.target.value } : null)
                }
                placeholder={L('e.g. Acharya Ratna, Karmakand Ratna', 'जैसे: आचार्य रत्न, कर्मकाण्ड रत्न')}
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
                  {L('Revoke Badge', 'बैज वापस लें')}
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
                  {L('Cancel', 'रद्द करें')}
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
                    ? L('Saving...', 'सहेजा जा रहा है...')
                    : editingSpecialBadge.hasSpecialBadge
                    ? L('Update Badge', 'बैज अपडेट करें')
                    : L('Award Special Badge', 'विशेष बैज प्रदान करें')}
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
              <ShieldCheck className="w-6 h-6 text-gold" /> {L('Platform Operator Console', 'प्लेटफ़ॉर्म व्यवस्थापक कंसोल')}
            </h1>
            <p className="text-xs text-stone-400 mt-1">
              {L(
                'Global monitoring, KYC approvals, emergency kill switches, and audit trail',
                'वैश्विक निगरानी, KYC स्वीकृतियाँ, आपातकालीन नियंत्रण और ऑडिट लॉग',
              )}
            </p>
          </div>
          <button
            onClick={loadAdminData}
            className="text-xs font-semibold px-4 py-2 bg-obsidian-soft hover:bg-stone-800 text-gold-pale border border-gold/20 rounded-full transition-colors"
          >
            {L('Refresh Data', 'डेटा ताज़ा करें')}
          </button>
        </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-3 mb-8 overflow-x-auto w-full max-w-full min-w-0 no-scrollbar">
        {[
          { key: 'kpi', label: L('Overview Metrics', 'मुख्य आँकड़े') },
          { key: 'pandits', label: `${L('Vedic Pandits', 'वैदिक पंडित')} (${panditsList.length})` },
          { key: 'categories', label: `${L('Stream Categories', 'प्रसारण श्रेणियाँ')} (${categoriesList.length})` },
          { key: 'bookings', label: `${L('Dakshina Offerings', 'दक्षिणा अर्पण')} (${bookingsTotal || bookingsList.length})` },
          { key: 'dakshina', label: L('Dakshina Ledger', 'दक्षिणा बही') },
          { key: 'deletionRequests', label: `${L('Deletion Requests', 'खाता विलोपन अनुरोध')} (${deletionRequests.length})` },
          { key: 'kyc', label: `${L('Pending KYC', 'लंबित KYC')} (${kycList.length})` },
          { key: 'streams', label: `${L('Live Monitor', 'लाइव निगरानी')} (${liveStreams.length})` },
          { key: 'reports', label: `${L('Safety Reports', 'सुरक्षा रिपोर्ट')} (${reports.length})` },
          { key: 'wordFilters', label: `${L('Prohibited Words', 'प्रतिबंधित शब्द')} (${wordFilters.length})` },
          { key: 'users', label: `${L('User Directory', 'उपयोगकर्ता सूची')} (${users.length})` },
          { key: 'audit', label: `${L('Audit Log', 'ऑडिट लॉग')} (${auditLogs.length})` },
          {
            key: 'banner',
            label: `${L('Occasion Banner', 'उत्सव बैनर')} ${bannerConfig.enabled ? L('● Active', '● सक्रिय') : ''}`,
          },
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
            <span className="text-[11px] text-stone-600 dark:text-stone-400 uppercase font-semibold block">
              {L('Total Users', 'कुल उपयोगकर्ता')}
            </span>
            <span className="text-2xl font-extrabold text-stone-900 dark:text-white mt-1 block">{stats.totalUsers}</span>
          </div>
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm dark:shadow-none">
            <span className="text-[11px] text-orange-700 dark:text-orange-400 uppercase font-semibold block">
              {L('Approved Pandits', 'स्वीकृत पंडित जी')}
            </span>
            <span className="text-2xl font-extrabold text-stone-900 dark:text-white mt-1 block">{stats.totalStreamers}</span>
          </div>
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm dark:shadow-none">
            <span className="text-[11px] text-red-700 dark:text-red-400 uppercase font-semibold block">
              {L('Live Right Now', 'अभी लाइव')}
            </span>
            <span className="text-2xl font-extrabold text-stone-900 dark:text-white mt-1 block">{stats.activeLiveStreams}</span>
          </div>
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm dark:shadow-none">
            <span className="text-[11px] text-stone-600 dark:text-stone-400 uppercase font-semibold block">
              {L('Total Broadcasts', 'कुल प्रसारण')}
            </span>
            <span className="text-2xl font-extrabold text-stone-900 dark:text-white mt-1 block">{stats.totalStreams}</span>
          </div>
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm dark:shadow-none">
            <span className="text-[11px] text-amber-800 dark:text-amber-400 uppercase font-semibold block">
              {L('Pending KYC', 'लंबित KYC')}
            </span>
            <span className="text-2xl font-extrabold text-stone-900 dark:text-white mt-1 block">{stats.pendingKyc}</span>
          </div>
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm dark:shadow-none">
            <span className="text-[11px] text-rose-700 dark:text-rose-400 uppercase font-semibold block">
              {L('Open Reports', 'खुली रिपोर्ट')}
            </span>
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
              <span className="text-[11px] text-stone-500 dark:text-stone-400 uppercase font-semibold block">
                {L('Total Pandits', 'कुल पंडित जी')}
              </span>
              <span className="text-2xl font-extrabold text-stone-900 dark:text-white mt-1 block">{panditsList.length}</span>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-amber-500 uppercase font-semibold block">
                {L('Special Honors (आचार्य रत्न)', 'विशेष सम्मान (आचार्य रत्न)')}
              </span>
              <span className="text-2xl font-extrabold text-amber-400 mt-1 block">
                {panditsList.filter((p) => p.hasSpecialBadge).length}
              </span>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-emerald-500 uppercase font-semibold block">
                {L('KYC Verified Badges', 'KYC सत्यापित बैज')}
              </span>
              <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                {panditsList.filter((p) => p.isVerifiedBadge).length}
              </span>
            </div>
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-orange-500 uppercase font-semibold block">
                {L('Broadcasts Conducted', 'संचालित प्रसारण')}
              </span>
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
                placeholder={L('Search pandits by name, email, or specialty...', 'नाम, ईमेल या विशेषज्ञता से पंडित खोजें...')}
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition whitespace-nowrap ${
                    panditFilter === filter
                      ? 'bg-gold text-obsidian font-bold shadow'
                      : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                  }`}
                >
                  {filter === 'all'
                    ? `${L('All', 'सभी')} (${panditsList.length})`
                    : filter === 'special'
                    ? `${L('Special Honors', 'विशेष सम्मान')} (${panditsList.filter((p) => p.hasSpecialBadge).length})`
                    : `${L('Verified', 'सत्यापित')} (${panditsList.filter((p) => p.isVerifiedBadge).length})`}
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
                            <VerifiedPanditBadge size={12} /> {L('KYC Verified', 'KYC सत्यापित')}
                          </span>
                        )}
                        {pandit.hasSpecialBadge && (
                          <SpecialPanditBadge title={pandit.specialBadgeTitle} size="sm" />
                        )}
                        {pandit.status === 'DELETION_REQUESTED' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-500/40">
                            {L('Deletion Pending', 'विलोपन लंबित')}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-400">
                        <span>{pandit.email}</span>
                        <span>•</span>
                        <span>{pandit.followerCount || 0} {L('Followers', 'अनुयायी')}</span>
                        <span>•</span>
                        <span>{pandit.totalStreams || 0} {L('Broadcasts', 'प्रसारण')}</span>
                        <span>•</span>
                        <span className="uppercase text-[10px] font-bold text-amber-500/90">
                          KYC: {translateAdminToken(pandit.kycStatus, lang)}
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
                      <span>
                        {pandit.hasSpecialBadge
                          ? L('Edit Special Badge', 'विशेष बैज संपादित करें')
                          : L('Award Special Badge', 'विशेष बैज प्रदान करें')}
                      </span>
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
                      <span>
                        {pandit.isVerifiedBadge
                          ? L('Revoke Verified', 'सत्यापित हटाएँ')
                          : L('Mark Verified', 'सत्यापित चिह्नित करें')}
                      </span>
                    </button>

                    {/* View Public Profile Link */}
                    <a
                      href={`/pandit/${pandit.slug || pandit.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-800 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{L('View Profile', 'प्रोफ़ाइल देखें')}</span>
                    </a>
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
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">
                {L('Total Categories', 'कुल श्रेणियाँ')}
              </span>
              <span className="text-2xl font-extrabold text-white mt-1 block">{categoriesList.length}</span>
            </div>
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-emerald-400 uppercase font-semibold block">
                {L('Active on Platform', 'वेबसाइट पर सक्रिय')}
              </span>
              <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                {categoriesList.filter((c) => c.isActive !== false).length}
              </span>
            </div>
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-amber-400 uppercase font-semibold block">
                {L('Inactive / Hidden', 'निष्क्रिय / छिपी हुई')}
              </span>
              <span className="text-2xl font-extrabold text-amber-400 mt-1 block">
                {categoriesList.filter((c) => c.isActive === false).length}
              </span>
            </div>
          </div>

          {/* Create Category Form */}
          <div className="bg-stone-900 border border-stone-800 p-5 sm:p-6 rounded-2xl shadow-lg">
            <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-gold" /> {L('Add New Stream Category', 'नई प्रसारण श्रेणी जोड़ें')}
            </h3>
            <p className="text-xs text-stone-400 mb-4">
              {L(
                'Create sacred stream categories (e.g. Maha Shivratri, Vedic Havan, Bhagavad Gita, Rudrabhishek) for devotees to discover live broadcasts.',
                'भक्तों द्वारा लाइव प्रसारण खोजने के लिए पावन श्रेणियाँ बनाएँ (जैसे: महाशिवरात्रि, वैदिक हवन, भगवद गीता, रुद्राभिषेक)।',
              )}
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
                  placeholder={L('Category Name (e.g. Maha Shivratri)', 'श्रेणी का नाम (जैसे: महाशिवरात्रि)')}
                  className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={newCategorySlug}
                  onChange={(e) => setNewCategorySlug(e.target.value)}
                  placeholder={L('Slug (e.g. maha-shivratri)', 'स्लग (जैसे: maha-shivratri)')}
                  className="w-full px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newCategoryOrder}
                  onChange={(e) => setNewCategoryOrder(Number(e.target.value))}
                  placeholder={L('Order (0)', 'क्रम (0)')}
                  className="w-20 px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold"
                />
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-obsidian rounded-xl text-xs font-bold transition shadow inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> {savingCategory ? L('Creating...', 'बन रहा है...') : L('Create', 'बनाएँ')}
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
                    <Edit2 className="w-4 h-4 text-gold" /> {L('Edit Category', 'श्रेणी संपादित करें')}
                  </h3>
                  <button
                    onClick={() => setEditingCategoryId(null)}
                    aria-label={L('Close modal', 'मोडल बंद करें')}
                    className="text-stone-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      {L('Category Name', 'श्रेणी का नाम')}
                    </label>
                    <input
                      type="text"
                      value={editCategoryForm.name}
                      onChange={(e) => setEditCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      {L('Display Order', 'प्रदर्शन क्रम')}
                    </label>
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
                      {L('Category is Active and visible on the website', 'श्रेणी सक्रिय है और वेबसाइट पर दिखाई देगी')}
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => setEditingCategoryId(null)}
                    className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold"
                  >
                    {L('Cancel', 'रद्द करें')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateCategory(editingCategoryId)}
                    className="px-4 py-2 bg-gold hover:bg-gold-deep text-obsidian rounded-xl text-xs font-bold transition shadow"
                  >
                    {L('Save Changes', 'परिवर्तन सहेजें')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Categories Table */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-stone-950/60 border-b border-stone-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-gold" /> {L('Existing Categories', 'मौजूदा श्रेणियाँ')} ({categoriesList.length})
              </h3>
              <button
                onClick={fetchCategories}
                className="text-xs text-stone-400 hover:text-white flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> {L('Refresh', 'रिफ़्रेश करें')}
              </button>
            </div>

            {categoriesList.length === 0 ? (
              <div className="p-10 text-center text-stone-400 text-xs">
                {L('No stream categories configured yet. Add your first category above!', 'अभी तक कोई प्रसारण श्रेणी नहीं है। ऊपर अपनी पहली श्रेणी जोड़ें!')}
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
                          <span className="font-bold text-white text-sm truncate">
                            {translateCategoryLabel(cat.name, lang)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              cat.isActive !== false
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                                : 'bg-stone-800 text-stone-400 border border-stone-700'
                            }`}
                          >
                            {cat.isActive !== false ? L('Active', 'सक्रिय') : L('Hidden', 'छिपा हुआ')}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-stone-500 block">
                          {L('slug:', 'स्लग:')} {cat.slug}
                        </span>
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
                        {cat.isActive !== false ? L('Deactivate', 'निष्क्रिय करें') : L('Activate', 'सक्रिय करें')}
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
                        {L('Edit', 'संपादित करें')}
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 text-stone-500 hover:text-red-400 hover:bg-stone-800 rounded-lg transition"
                        title={L('Delete Category', 'श्रेणी हटाएँ')}
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
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">
                {L('Total Offerings', 'कुल अर्पण')}
              </span>
              <span className="text-2xl font-extrabold text-white mt-1 block">{bookingsTotal}</span>
            </div>
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-emerald-400 uppercase font-semibold block">
                {L('Confirmed', 'पुष्ट')}
              </span>
              <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                {bookingsList.filter((b) => b.status === 'SUCCESS').length}
              </span>
            </div>
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-amber-400 uppercase font-semibold block">
                {L('Pending / Unpaid', 'लंबित / अपूर्ण')}
              </span>
              <span className="text-2xl font-extrabold text-amber-400 mt-1 block">
                {bookingsList.filter((b) => b.status === 'PENDING').length}
              </span>
            </div>
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-gold uppercase font-semibold block">
                {L('Total Dakshina Volume', 'कुल दक्षिणा मात्रा')}
              </span>
              <span className="text-2xl font-extrabold text-gold mt-1 block">
                {formatCoins(bookingsList.reduce((acc, b) => acc + (b.coins || 0), 0), lang)}
              </span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-900/60 p-4 rounded-2xl border border-stone-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                placeholder={L('Search by devotee, gotra, or pandit ji...', 'भक्त, गोत्र या पंडित जी के नाम से खोजें...')}
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition whitespace-nowrap ${
                    bookingStatusFilter === st
                      ? 'bg-gold text-obsidian font-bold shadow'
                      : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                  }`}
                >
                  {st === 'ALL' ? L('All Offerings', 'सभी अर्पण') : translateAdminToken(st, lang)}
                </button>
              ))}
              <button
                onClick={() => fetchBookings(bookingStatusFilter)}
                className="p-2 bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-white rounded-lg border border-stone-800 transition"
                title={L('Refresh', 'रिफ़्रेश करें')}
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
                        <span
                          className="text-xs text-stone-400 font-mono"
                          title={L('Email masked for privacy', 'गोपनीयता के लिए ईमेल मास्क्ड है')}
                        >
                          ({b.devoteeEmail} 🔒)
                        </span>
                      )}
                      {b.gotra && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-950/60 text-amber-300 border border-amber-600/40">
                          {L('Gotra:', 'गोत्र:')} {b.gotra}
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
                        {translateAdminToken(b.status, lang)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-stone-300">
                      <div>
                        <span className="text-stone-500">{L('Assigned Pandit:', 'नियुक्त पंडित जी:')}</span>{' '}
                        <strong className="text-gold font-serif">
                          {b.panditName || L('Temple Priest', 'मंदिर पुरोहित')}
                        </strong>
                      </div>
                      {b.streamTitle && (
                        <div>
                          <span className="text-stone-500">{L('Pooja Broadcast:', 'पूजा प्रसारण:')}</span>{' '}
                          <span className="text-stone-200">{b.streamTitle}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-stone-500">{L('Dakshina:', 'दक्षिणा:')}</span>{' '}
                        <strong className="text-amber-400">{formatCoins(b.coins || 0, lang)}</strong>
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
                    <span>{formatLocaleDate(b.createdAt, lang)}</span>
                    <span>
                      {new Date(b.createdAt).toLocaleTimeString(lang === 'hi' ? 'hi-IN' : [], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}

            {bookingsList.length === 0 && (
              <div className="bg-stone-900 border border-stone-800 p-12 text-center rounded-2xl text-stone-400 text-xs">
                {L('No dakshina offering records found matching current criteria.', 'वर्तमान मानदंडों से मेल खाने वाले कोई दक्षिणा अर्पण रिकॉर्ड नहीं मिले।')}
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
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">
                {L('Total Pandit Earnings (Dakshina + watch time)', 'कुल पंडित आय (दक्षिणा + दर्शन-समय)')}
              </span>
              <span className="text-2xl font-extrabold text-gold mt-1 block">
                {formatCoins(dakshinaData.platformTotalCoins ?? 0, lang)}
              </span>
              <span className="text-[11px] text-stone-500 block mt-0.5">
                ₹{(dakshinaData.platformTotalInr ?? 0).toLocaleString(lang === 'hi' ? 'en-IN' : undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                {L('net earned (85%)', 'शुद्ध अर्जित (85%)')}
              </span>
            </div>
            <div className="bg-stone-900 border border-amber-500/20 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-amber-400 uppercase font-semibold block">
                {L('Total Due to Pandits', 'पंडितों को कुल देय')}
              </span>
              <span className="text-2xl font-extrabold text-amber-400 mt-1 block">
                {formatCoins(dakshinaData.platformDueCoins ?? 0, lang)}
              </span>
              <span className="text-[11px] text-stone-500 block mt-0.5">
                ₹{(dakshinaData.platformDueNetInr ?? 0).toLocaleString(lang === 'hi' ? 'en-IN' : undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                {L('pending settlement', 'निपटान लंबित')}
              </span>
            </div>
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-sm">
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">
                {L('Active Earning Pandits', 'सक्रिय आय अर्जित पंडित')}
              </span>
              <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                {dakshinaData.ledger.length}
              </span>
            </div>
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-sm flex flex-col justify-between">
              <span className="text-[11px] text-stone-400 uppercase font-semibold block">
                {L('Settlement Export', 'निपटान निर्यात')}
              </span>
              <button
                onClick={exportDakshinaCsv}
                className="mt-2 w-full py-2 bg-stone-950 hover:bg-stone-800 text-gold border border-gold/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" /> {L('Export Ledger CSV', 'बही CSV निर्यात करें')}
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center justify-between gap-3 bg-stone-900/60 p-4 rounded-2xl border border-stone-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                placeholder={L('Search pandit by name or email...', 'नाम या ईमेल से पंडित खोजें...')}
                value={searchLedger}
                onChange={(e) => setSearchLedger(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold"
              />
            </div>
            <button
              onClick={fetchDakshinaLedger}
              className="px-3.5 py-2 bg-stone-950 hover:bg-stone-800 text-stone-300 rounded-xl border border-stone-800 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" /> {L('Refresh Ledger', 'बही ताज़ा करें')}
            </button>
          </div>

          {/* Ledger Table */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-stone-950/60 border-b border-stone-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-gold" /> {L('Pandit Dakshina Breakdown & Settlement Roster', 'पंडित दक्षिणा विवरण व भुगतान सूची')}
              </h3>
              <span className="text-xs text-stone-400 font-mono">
                {L('Rate: 10 Coins = ₹1 INR', 'दर: 10 कॉइन = ₹1 INR')}
              </span>
            </div>

            {dakshinaData.ledger.length === 0 ? (
              <div className="p-10 text-center text-stone-400 text-xs">
                {L('No dakshina offerings recorded yet on the platform.', 'प्लेटफ़ॉर्म पर अभी तक कोई दक्षिणा अर्पण दर्ज नहीं है।')}
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
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-white text-sm font-serif">{p.panditName}</span>
                              {p.panditStatus === 'DELETION_REQUESTED' && !p.panditDeletedAt && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-500/40">
                                  {L('Deletion Pending', 'विलोपन लंबित')}
                                </span>
                              )}
                            </div>
                            <span className="text-stone-400 text-[11px]">{p.panditEmail}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-6">
                          {/* Earned */}
                          <div>
                            <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                              {L('Earned', 'अर्जित')}
                            </span>
                            <span className="font-extrabold text-gold text-base flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5" /> {(p.earnedCoins ?? p.totalCoins ?? 0).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-stone-500 block">
                              ₹{(p.totalInr ?? 0).toFixed(2)} {L('net', 'शुद्ध')}
                            </span>
                          </div>

                          {/* Paid */}
                          <div>
                            <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                              {L('Paid', 'भुगतान किया गया')}
                            </span>
                            <span className="font-extrabold text-emerald-400 text-base flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5" /> {(p.paidCoins ?? 0).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-stone-500 block">₹{(p.paidNetInr ?? 0).toFixed(2)}</span>
                          </div>

                          {/* Due */}
                          <div>
                            <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                              {L('Due', 'बकाया')}
                            </span>
                            <span className={`font-extrabold text-base flex items-center gap-1 ${(p.dueCoins ?? 0) > 0 ? 'text-amber-400' : 'text-stone-500'}`}>
                              <Coins className="w-3.5 h-3.5" /> {(p.dueCoins ?? 0).toLocaleString('en-IN')}
                            </span>
                            <span className={`text-[10px] block ${(p.dueCoins ?? 0) > 0 ? 'text-amber-500' : 'text-stone-500'}`}>₹{(p.dueNetInr ?? 0).toFixed(2)}</span>
                          </div>

                          <div>
                            <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                              {L('Offerings', 'अर्पण')}
                            </span>
                            <span className="font-bold text-white text-sm">
                              {p.transactionCount} {L('txns', 'लेन-देन')}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-stone-400 uppercase font-semibold block">
                              {L('Last Offering', 'अंतिम अर्पण')}
                            </span>
                            <span className="text-stone-300 font-mono text-[11px]">
                              {formatLocaleDate(p.lastDakshinaAt, lang, 'N/A', 'उपलब्ध नहीं')}
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
                            <IndianRupee className="w-3.5 h-3.5" /> {L('Record Payout', 'भुगतान दर्ज करें')}
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

      {/* Tab: Pandit Account Deletion Requests (payout settlement gate) */}
      {activeTab === 'deletionRequests' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/70 p-4 rounded-2xl border border-stone-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-amber-400" /> {L('Pandit Account Deletion Approvals', 'पंडित खाता विलोपन स्वीकृतियाँ')}
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                {lang === 'hi' ? (
                  <>
                    जब तक सभी अर्जित भुगतान निपट नहीं जाते (<code className="text-amber-300">dueCoins === 0</code>), तब तक पंडित विलोपन अनुरोध यहाँ लंबित रहते हैं। स्वीकृति पर शेष वॉलेट/टॉप-अप कॉइन बिना रिफंड समाप्त हो जाते हैं।
                  </>
                ) : (
                  <>
                    Pandit deletion requests stay paused here until all earned payouts are settled (<code className="text-amber-300">dueCoins === 0</code>). Remaining wallet/top-up coins are forfeited with no refund upon approval.
                  </>
                )}
              </p>
            </div>
            <button
              onClick={fetchDeletionRequests}
              className="px-3.5 py-2 bg-stone-950 hover:bg-stone-800 text-stone-300 rounded-xl border border-stone-800 text-xs font-semibold flex items-center gap-1.5 transition shrink-0 self-start sm:self-center"
            >
              <RefreshCw className="w-3.5 h-3.5" /> {L('Refresh Requests', 'अनुरोध ताज़ा करें')}
            </button>
          </div>

          {deletionRequests.length === 0 ? (
            <div className="bg-stone-900 border border-stone-800 p-12 text-center rounded-2xl text-stone-400 text-xs">
              {L('No pending pandit deletion requests right now.', 'इस समय कोई लंबित पंडित विलोपन अनुरोध नहीं है।')}
            </div>
          ) : (
            <div className="space-y-3">
              {deletionRequests.map((req) => (
                <div
                  key={req.userId}
                  className="bg-stone-900 border border-stone-800 p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-lg"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-serif font-bold text-white text-base">{req.name}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-500/40">
                        {L('PENDING APPROVAL', 'स्वीकृति लंबित')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-950 text-stone-300 border border-stone-700">
                        {translateAdminToken(req.role, lang)}
                      </span>
                    </div>
                    <div className="text-xs text-stone-400">
                      <span>{req.email}</span>
                      {req.deletionRequestedAt && (
                        <span>
                          {' '}• {L('Requested:', 'अनुरोध तिथि:')} {formatLocaleDateTime(req.deletionRequestedAt, lang)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
                      <span className="text-stone-300">
                        {L('Earned:', 'अर्जित:')} <strong className="text-gold">{(req.earnedCoins || 0).toLocaleString('en-IN')}</strong>
                      </span>
                      <span className="text-stone-300">
                        {L('Paid:', 'भुगतान:')} <strong className="text-emerald-400">{(req.paidCoins || 0).toLocaleString('en-IN')}</strong>
                      </span>
                      <span className="text-stone-300">
                        {L('Due:', 'बकाया:')}{' '}
                        <strong className={req.dueCoins > 0 ? 'text-red-400' : 'text-emerald-400'}>
                          {formatCoins(req.dueCoins || 0, lang)} (₹{(req.dueNetInr || 0).toFixed(2)} {L('net', 'शुद्ध')})
                        </strong>
                      </span>
                      {req.walletBalanceCoins > 0 && (
                        <span className="text-stone-500 text-[11px]">
                          {lang === 'hi'
                            ? `स्वीकृति पर व्यक्तिगत वॉलेट (${req.walletBalanceCoins} कॉइन) समाप्त होगा`
                            : `Personal wallet (${req.walletBalanceCoins} coins) forfeited on approval`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end">
                    {req.dueCoins > 0 && (
                      <button
                        onClick={() => {
                          setPayoutModal({
                            panditId: req.userId,
                            panditName: req.name,
                            dueCoins: req.dueCoins,
                            dueNetInr: req.dueNetInr,
                          });
                          setPayoutForm({
                            coins: String(req.dueCoins),
                            periodTo: new Date().toISOString().split('T')[0],
                            method: 'UPI',
                            reference: '',
                            note: 'Final settlement before account deletion approval',
                          });
                        }}
                        className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-yellow-500 text-obsidian rounded-xl text-xs font-bold flex items-center gap-1.5 shadow hover:opacity-90 transition"
                      >
                        <IndianRupee className="w-3.5 h-3.5" /> {L('Settle Payout', 'भुगतान निपटाएँ')} (₹{(req.dueNetInr || 0).toFixed(2)})
                      </button>
                    )}

                    <button
                      disabled={req.dueCoins > 0}
                      title={
                        req.dueCoins > 0
                          ? lang === 'hi'
                            ? `विलोपन स्वीकृति से पहले ${req.dueCoins} बकाया कॉइन का भुगतान करें`
                            : `Settle ${req.dueCoins} due coins before approving deletion`
                          : L('Approve and permanently erase account', 'स्वीकृत कर खाता स्थायी रूप से मिटाएँ')
                      }
                      onClick={() =>
                        setConfirmAction({
                          type: 'approveDeletion',
                          id: req.userId,
                          label: req.name,
                        })
                      }
                      className="px-3.5 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Check className="w-3.5 h-3.5" /> {L('Approve & Erase', 'स्वीकृत कर मिटाएँ')}
                    </button>

                    <button
                      onClick={() =>
                        setConfirmAction({
                          type: 'rejectDeletion',
                          id: req.userId,
                          label: req.name,
                        })
                      }
                      className="px-3.5 py-2 bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-700 rounded-xl text-xs font-semibold transition"
                    >
                      {L('Restore Account', 'खाता बहाल करें')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== Payout Modal ===== */}
      {payoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-950 border border-amber-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-amber-500/15 pb-4">
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-amber-400" /> {L('Record Payout', 'भुगतान दर्ज करें')}
              </h3>
              <button
                onClick={() => setPayoutModal(null)}
                aria-label={L('Close modal', 'मोडल बंद करें')}
                className="text-stone-400 hover:text-white p-1 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-stone-300">
              {lang === 'hi' ? (
                <>
                  <strong className="text-amber-300 font-serif">{payoutModal.panditName}</strong> के लिए निपटान दर्ज किया जा रहा है। बकाया:{' '}
                  <strong className="text-amber-400">{formatCoins(payoutModal.dueCoins, lang)} (₹{payoutModal.dueNetInr.toFixed(2)} शुद्ध)</strong>।
                </>
              ) : (
                <>
                  Recording settlement for{' '}
                  <strong className="text-amber-300 font-serif">{payoutModal.panditName}</strong>.{' '}
                  Due:{' '}
                  <strong className="text-amber-400">{payoutModal.dueCoins.toLocaleString()} coins (₹{payoutModal.dueNetInr.toFixed(2)} net)</strong>.
                </>
              )}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-stone-400 uppercase font-semibold block mb-1">
                  {lang === 'hi'
                    ? `निपटान कॉइन (≤ ${payoutModal.dueCoins.toLocaleString('en-IN')} बकाया)`
                    : `Coins to Settle (≤ ${payoutModal.dueCoins.toLocaleString()} due)`}
                </label>
                <input
                  type="number"
                  placeholder={L(`Max: ${payoutModal.dueCoins}`, `अधिकतम: ${payoutModal.dueCoins}`)}
                  value={payoutForm.coins}
                  onChange={(e) => setPayoutForm((p) => ({ ...p, coins: e.target.value }))}
                  max={payoutModal.dueCoins}
                  min={1}
                  className="w-full px-3.5 py-2.5 bg-stone-900 border border-amber-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400 placeholder-stone-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-400 uppercase font-semibold block mb-1">
                  {L('Period To (earnings up to this date)', 'अवधि तक (इस तिथि तक की आय)')}
                </label>
                <input
                  type="date"
                  value={payoutForm.periodTo}
                  onChange={(e) => setPayoutForm((p) => ({ ...p, periodTo: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-stone-900 border border-amber-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-400 uppercase font-semibold block mb-1">
                  {L('Payment Method', 'भुगतान माध्यम')}
                </label>
                <select
                  value={payoutForm.method}
                  onChange={(e) => setPayoutForm((p) => ({ ...p, method: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-stone-900 border border-amber-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="UPI">UPI</option>
                  <option value="NEFT">NEFT</option>
                  <option value="IMPS">IMPS</option>
                  <option value="RTGS">RTGS</option>
                  <option value="Cheque">{L('Cheque', 'चेक')}</option>
                  <option value="Cash">{L('Cash', 'नकद')}</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-stone-400 uppercase font-semibold block mb-1">
                  {L('UTR / Transaction ID *', 'UTR / लेन-देन ID *')}
                </label>
                <input
                  type="text"
                  placeholder={L('e.g. 423987654321 (required, must be unique)', 'जैसे: 423987654321 (अनिवार्य व अद्वितीय)')}
                  value={payoutForm.reference}
                  onChange={(e) => setPayoutForm((p) => ({ ...p, reference: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-stone-900 border border-amber-500/30 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400 placeholder-stone-600"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-400 uppercase font-semibold block mb-1">
                  {L('Note (optional)', 'टिप्पणी (वैकल्पिक)')}
                </label>
                <input
                  type="text"
                  placeholder={L('e.g. November settlement', 'जैसे: नवंबर निपटान')}
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
                {L('Cancel', 'रद्द करें')}
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
                {savingPayout ? L('Saving...', 'सहेजा जा रहा है...') : L('Record Payout', 'भुगतान दर्ज करें')}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'kyc' && (
        <div className="space-y-4">
          {kycList.length === 0 ? (
            <p className="text-stone-400 text-sm">
              {L('No pending streamer verification requests.', 'कोई लंबित पंडित सत्यापन अनुरोध नहीं है।')}
            </p>
          ) : (
            kycList.map((app) => (
              <div key={app.id} className="bg-stone-900 border border-stone-800 p-5 rounded-2xl flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-white text-base">{app.user.name} ({app.user.email})</h3>
                  <p className="text-xs text-stone-400 mt-1">
                    <strong>{L('Languages:', 'भाषाएँ:')}</strong> {app.languages.join(', ')}
                  </p>
                  <p className="text-xs text-stone-400">
                    <strong>{L('Specialties:', 'विशेषज्ञताएँ:')}</strong> {app.specialties.join(', ')}
                  </p>
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
                          {L('View Credentials Document', 'प्रमाणपत्र दस्तावेज़ देखें')} ({doc.documentType || 'KYC'})
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
                    <Check className="w-3.5 h-3.5" /> {L('Approve & Verify', 'स्वीकृत कर सत्यापित करें')}
                  </button>
                  <button
                    onClick={() => handleKycDecision(app.id, 'REJECTED')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-semibold"
                  >
                    <X className="w-3.5 h-3.5" /> {L('Reject', 'अस्वीकृत करें')}
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
            <p className="text-stone-400 text-sm">{L('No streams currently live on the server.', 'वर्तमान में सर्वर पर कोई लाइव प्रसारण नहीं चल रहा है।')}</p>
          ) : (
            liveStreams.map((s) => (
              <div key={s.id} className="bg-stone-900 border border-stone-800 p-5 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider block">{L('● LIVE ON AIR', '● अभी लाइव')}</span>
                  <h3 className="text-base font-bold text-white mt-0.5">{s.title}</h3>
                  <p className="text-xs text-stone-400">
                    {L('Pandit Ji:', 'पंडित जी:')} {s.streamer.name} ({s.streamer.email}) • {L('Category:', 'श्रेणी:')} {translateCategoryLabel(s.category.name, lang)}
                  </p>
                </div>
                <button
                  onClick={() => handleForceEndStream(s.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  <StopCircle className="w-4 h-4" /> {L('Force End Stream (Kill)', 'प्रसारण तुरंत समाप्त करें (Kill)')}
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
            <p className="text-stone-400 text-sm">{L('No safety reports pending.', 'कोई सुरक्षा रिपोर्ट लंबित नहीं है।')}</p>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="bg-stone-900 border border-stone-800 p-5 rounded-2xl flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                      {translateAdminToken(r.targetType, lang)} {L('REPORT', 'रिपोर्ट')}: {translateAdminToken(r.status, lang)}
                    </span>
                    <span className="text-xs text-stone-600 dark:text-stone-400">
                      {L('By', 'द्वारा:')} {r.reporter?.name || L('Anonymous Devotee', 'अनाम भक्त')}
                    </span>
                  </div>
                  <h4 className="font-semibold text-white text-sm">{r.reason}</h4>
                  {r.details && <p className="text-xs text-stone-600 dark:text-stone-400 mt-1">{r.details}</p>}
                  {r.chatMessage && (
                    <p className="text-xs text-red-800 dark:text-red-300 mt-2 bg-red-50 dark:bg-stone-950 p-2.5 rounded-xl border border-red-200 dark:border-stone-800 font-mono">
                      {L('Flagged message:', 'चिह्नित संदेश:')} "{r.chatMessage.message}"
                    </p>
                  )}
                </div>
                {r.status === 'OPEN' && (
                  <div className="flex sm:flex-col gap-2 shrink-0 justify-center">
                    <button
                      onClick={() => handleResolveReport(r.id, 'ACTION_TAKEN')}
                      className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-semibold shadow transition"
                    >
                      {L('Resolve & Action', 'कार्रवाई कर निपटाएँ')}
                    </button>
                    <button
                      onClick={() => handleResolveReport(r.id, 'DISMISSED')}
                      className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-300 rounded-xl text-xs font-semibold border border-stone-300 dark:border-stone-700 transition"
                    >
                      {L('Dismiss Report', 'रिपोर्ट खारिज करें')}
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
            <h3 className="text-sm font-bold text-white mb-2">{L('Add Prohibited Chat Word / Regex', 'निषिद्ध चैट शब्द / Regex जोड़ें')}</h3>
            <p className="text-xs text-stone-400 mb-4">
              {L(
                'Words added here are automatically masked or blocked across all live pooja chat streams.',
                'यहाँ जोड़े गए शब्द सभी लाइव पूजा चैट प्रसारणों में स्वचालित रूप से छिपाए या अवरुद्ध किए जाते हैं।'
              )}
            </p>
            <form onSubmit={handleAddWord} className="flex flex-col sm:flex-row gap-3 max-w-xl">
              <input
                type="text"
                required
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                placeholder={L('e.g. offensive word or phrase', 'जैसे: अपमानजनक शब्द या वाक्यांश')}
                className="flex-1 px-3.5 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-orange-500"
              />
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value)}
                className="px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white"
              >
                <option value="BLOCKED">{L('Severity: Block (Auto-drop)', 'गंभीरता: अवरुद्ध (स्वतः रोकें)')}</option>
                <option value="WARNING">{L('Severity: Warn', 'गंभीरता: चेतावनी')}</option>
                <option value="FLAG">{L('Severity: Flag for Review', 'गंभीरता: समीक्षा हेतु चिह्नित')}</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-orange-700 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold shadow transition inline-flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> {L('Add Word', 'शब्द जोड़ें')}
              </button>
            </form>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 bg-stone-950/60 border-b border-stone-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{L('Active Chat Filters', 'सक्रिय चैट फ़िल्टर')} ({wordFilters.length})</h3>
              <span className="text-xs text-stone-400 font-mono">{L('Real-time socket matcher', 'रियल-टाइम सॉकेट मैचर')}</span>
            </div>

            {wordFilters.length === 0 ? (
              <div className="p-10 text-center text-stone-400 text-xs">
                {L('No active custom word filters configured.', 'कोई सक्रिय कस्टम शब्द फ़िल्टर कॉन्फ़िगर नहीं है।')}
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
                        {translateAdminToken(wf.severity || 'BLOCKED', lang)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteWord(wf.id)}
                      className="p-1.5 text-stone-600 dark:text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded-lg transition"
                      title={L('Remove filter', 'फ़िल्टर हटाएँ')}
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
                  placeholder={L('Search user by name or email (Press Enter)...', 'नाम या ईमेल से उपयोगकर्ता खोजें (Enter दबाएँ)...')}
                  className="w-full pl-9 pr-4 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold"
                />
              </div>
              <button
                onClick={handleSearchUsers}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-obsidian rounded-xl text-xs font-bold transition shadow"
              >
                {L('Search', 'खोजें')}
              </button>
              {searchUser && (
                <button
                  onClick={() => {
                    setSearchUser('');
                    apiFetch('/admin/users').then((data) => setUsers(data || []));
                  }}
                  className="px-3 py-2 bg-stone-950 hover:bg-stone-800 text-stone-400 rounded-xl text-xs transition border border-stone-800"
                >
                  {L('Clear', 'साफ़ करें')}
                </button>
              )}
            </div>

            <div className="text-xs text-stone-400 flex items-center gap-3">
              <span>{L('Total in directory:', 'निर्देशिका में कुल:')} <strong className="text-white">{users.length}</strong></span>
              <button
                onClick={() => {
                  setSearchUser('');
                  apiFetch('/admin/users').then((data) => setUsers(data || []));
                }}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg transition"
                title={L('Refresh user list', 'उपयोगकर्ता सूची रीफ़्रेश करें')}
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
                      {translateAdminToken(u.role, lang)}
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
                      {translateAdminToken(u.status, lang)}
                    </span>

                    {/* 2FA badge */}
                    {u.isTwoFactorEnabled ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold" title={L('2FA Active', '2FA सक्रिय')}>
                        <ShieldCheck className="w-3 h-3" /> 2FA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-stone-500 font-semibold" title={L('2FA Disabled', '2FA निष्क्रिय')}>
                        <Lock className="w-3 h-3" /> {L('No 2FA', '2FA नहीं')}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-stone-500 font-mono">
                    ID: {u.id} • {L('Joined:', 'शामिल तिथि:')} {formatLocaleDate(u.createdAt, lang)}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {u.deletedAt ? (
                    <span className="px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-stone-950 text-stone-500 border border-stone-800">
                      {L('Erased (DPDP)', 'मिटाया गया (DPDP)')}
                    </span>
                  ) : u.role !== 'ADMIN' ? (
                    <>
                      {u.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleUserStatus(u.id, 'BANNED')}
                          className="px-3.5 py-1.5 bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-800/50 rounded-xl text-xs font-semibold transition"
                        >
                          {L('Ban User', 'उपयोगकर्ता को प्रतिबंधित करें')}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUserStatus(u.id, 'ACTIVE')}
                          className="px-3.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 rounded-xl text-xs font-semibold transition"
                        >
                          {L('Restore User', 'उपयोगकर्ता बहाल करें')}
                        </button>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            ))}

            {users.length === 0 && (
              <div className="bg-stone-900 border border-stone-800 p-12 text-center rounded-2xl text-stone-400 text-xs">
                {L('No users found matching current query.', 'वर्तमान खोज से मेल खाने वाला कोई उपयोगकर्ता नहीं मिला।')}
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
              {L('Showing immutable platform audit trail', 'अपरिवर्तनीय प्लेटफ़ॉर्म ऑडिट ट्रेल')} (<strong className="text-white">{auditLogs.length}</strong> {L('events logged', 'घटनाएँ दर्ज')})
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
              <RefreshCw className="w-3.5 h-3.5" /> {L('Refresh Logs', 'लॉग रीफ़्रेश करें')}
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
                    <span>{L('Actor:', 'कर्ता:')} <strong className="text-stone-300">{log.actorEmail || L('System', 'सिस्टम')}</strong></span>
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
                  {formatLocaleDateTime(log.createdAt, lang)}
                </span>
              </div>
            ))}

            {auditLogs.length === 0 && (
              <div className="bg-stone-900 border border-stone-800 p-12 text-center rounded-2xl text-stone-400 text-xs space-y-1">
                <AlertCircle className="w-6 h-6 text-stone-500 mx-auto mb-2" />
                <p className="font-bold text-white text-sm">{L('No audit logs recorded yet', 'अभी तक कोई ऑडिट लॉग दर्ज नहीं हुआ है')}</p>
                <p>{L('Immutable moderation, verification, and kill switch events will automatically appear here.', 'मॉडरेशन, सत्यापन और आपातकालीन प्रसारण समाप्ति (Kill Switch) की अपरिवर्तनीय घटनाएँ यहाँ स्वतः दिखाई देंगी।')}</p>
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
                  <h2 className="font-serif text-lg font-bold text-white">{L('Occasion Announcement Banner', 'अवसर / पर्व घोषणा बैनर')}</h2>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  {L(
                    'Control the time-limited festival banner displayed at the very top of the website for all devotees.',
                    'सभी भक्तों के लिए वेबसाइट के सबसे ऊपर दिखने वाला समय-सीमित पर्व बैनर नियंत्रित करें।'
                  )}
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
                  {bannerConfig.enabled ? L('Active on Website', 'वेबसाइट पर सक्रिय') : L('Disabled / Hidden', 'निष्क्रिय / छिपा हुआ')}
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
                  {bannerConfig.enabled ? L('Disable Banner Now', 'बैनर अभी बंद करें') : L('Enable & Publish', 'सक्रिय कर प्रकाशित करें')}
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                  {L('Occasion Name / Festival Tag', 'अवसर का नाम / पर्व टैग')}
                </label>
                <input
                  type="text"
                  value={bannerConfig.occasion}
                  onChange={(e) => setBannerConfig({ ...bannerConfig, occasion: e.target.value })}
                  placeholder={L('e.g. Deepotsav, Maha Shivratri, Navratri', 'जैसे: दीपोत्सव, महाशिवरात्रि, नवरात्रि')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold transition"
                />
                <span className="text-[10px] text-stone-600 dark:text-stone-400 mt-1 block">
                  {L('Highlighted with golden drop-shadow at the start of the banner.', 'बैनर की शुरुआत में सुनहरी आभा के साथ प्रमुखता से दिखाया जाता है।')}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                  {L('Gradient Color Scheme', 'ग्रेडिएंट रंग शैली')}
                </label>
                <select
                  value={bannerConfig.gradient}
                  onChange={(e) => setBannerConfig({ ...bannerConfig, gradient: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white focus:outline-none focus:border-gold transition"
                >
                  <option value="amber-orange">{L('Deepotsav Flame (Amber-Orange-Crimson)', 'दीपोत्सव ज्योति (अंबर-केसरी-सिंदूरी)')}</option>
                  <option value="kashi-gold">{L('Kashi Sanctum (Rich Gold to Dark Amber)', 'काशी गर्भगृह (स्वर्णिम से गहन अंबर)')}</option>
                  <option value="vedic-saffron">{L('Vedic Saffron (Vermillion Saffron to Crimson)', 'वैदिक भगवा (सिंदूरी भगवा से सिंदूरी)')}</option>
                </select>
                <span className="text-[10px] text-stone-600 dark:text-stone-400 mt-1 block">
                  {L('Color gradient applied across both mobile and desktop viewports.', 'मोबाइल और डेस्कटॉप दोनों स्क्रीन पर यही रंग ग्रेडिएंट लागू होता है।')}
                </span>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                  {L('Desktop Announcement Headline', 'डेस्कटॉप घोषणा शीर्षक')}
                </label>
                <input
                  type="text"
                  value={bannerConfig.message}
                  onChange={(e) => setBannerConfig({ ...bannerConfig, message: e.target.value })}
                  placeholder={L("e.g. Join the Grand Deepotsav Mahotsav & Live Ganga Aarti from Bharat's sacred ghats", 'जैसे: भारत के पवित्र घाटों से भव्य दीपोत्सव महोत्सव एवं लाइव गंगा आरती से जुड़ें')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                  {L('Mobile Short Headline', 'मोबाइल संक्षिप्त शीर्षक')}
                </label>
                <input
                  type="text"
                  value={bannerConfig.mobileMessage}
                  onChange={(e) => setBannerConfig({ ...bannerConfig, mobileMessage: e.target.value })}
                  placeholder={L('e.g. Live Aarti from sacred ghats', 'जैसे: पवित्र घाटों से लाइव आरती')}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold transition"
                />
                <span className="text-[10px] text-stone-600 dark:text-stone-400 mt-1 block">
                  {L('Concise version that fits neatly on 360px–400px mobile screens.', '360px–400px मोबाइल स्क्रीन पर साफ़ दिखने वाला संक्षिप्त संस्करण।')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                    {L('CTA Button Text', 'CTA बटन टेक्स्ट')}
                  </label>
                  <input
                    type="text"
                    value={bannerConfig.ctaText}
                    onChange={(e) => setBannerConfig({ ...bannerConfig, ctaText: e.target.value })}
                    placeholder={L('e.g. Watch Live Aarti', 'जैसे: लाइव आरती देखें')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-300 mb-1.5">
                    {L('CTA Target Link', 'CTA लक्ष्य लिंक')}
                  </label>
                  <input
                    type="text"
                    value={bannerConfig.ctaLink}
                    onChange={(e) => setBannerConfig({ ...bannerConfig, ctaLink: e.target.value })}
                    placeholder={L('e.g. /#live-section or /pooja', 'जैसे: /#live-section या /pooja')}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold transition"
                  />
                </div>
              </div>
            </div>

            {/* Live Visual Preview */}
            <div className="mt-8 pt-6 border-t border-stone-800">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-gold" /> {L('Live Sitewide Banner Preview', 'वेबसाइट-व्यापी लाइव बैनर पूर्वावलोकन')}
              </span>

              {/* Preview Container */}
              <div className="rounded-2xl border border-stone-800 p-4 bg-stone-950 space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    {L('Desktop View:', 'डेस्कटॉप दृश्य:')}
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
                      <span className="font-medium truncate">{bannerConfig.message || L('Announcement message...', 'घोषणा संदेश...')}</span>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-amber-100 text-stone-950 font-extrabold text-[10px] whitespace-nowrap shrink-0">
                      {bannerConfig.ctaText || L('Watch Now', 'अभी देखें')}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                    {L('Mobile View (Simulated Narrow):', 'मोबाइल दृश्य (संकरा पूर्वावलोकन):')}
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
                      <span className="font-medium truncate">{bannerConfig.mobileMessage || bannerConfig.message || L('Live broadcast...', 'लाइव प्रसारण...')}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-stone-950 font-extrabold text-[9px] whitespace-nowrap shrink-0">
                      {bannerConfig.ctaText || L('Watch', 'देखें')}
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
                  {savingBanner ? L('Saving...', 'सहेजा जा रहा है...') : L('Save & Publish Live', 'सहेजें और लाइव प्रकाशित करें')}
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveBanner(false)}
                  disabled={savingBanner}
                  className="px-5 py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold rounded-xl transition border border-stone-700 disabled:opacity-60"
                >
                  {savingBanner ? L('Saving...', 'सहेजा जा रहा है...') : L('Save as Disabled (Hidden)', 'निष्क्रिय (छिपा हुआ) के रूप में सहेजें')}
                </button>
              </div>

              {bannerConfig.enabled && (
                <button
                  type="button"
                  onClick={() => handleSaveBanner(false)}
                  disabled={savingBanner}
                  className="px-4 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition"
                >
                  {L('Remove from Site Now', 'वेबसाइट से अभी हटाएँ')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={Boolean(confirmAction)}
        title={
          confirmAction
            ? L(CONFIRM_COPY[confirmAction.type].titleEn, CONFIRM_COPY[confirmAction.type].titleHi)
            : ''
        }
        description={
          confirmAction
            ? lang === 'hi'
              ? CONFIRM_COPY[confirmAction.type].descHi(confirmAction.label)
              : CONFIRM_COPY[confirmAction.type].descEn(confirmAction.label)
            : ''
        }
        confirmLabel={
          confirmAction
            ? L(CONFIRM_COPY[confirmAction.type].confirmEn, CONFIRM_COPY[confirmAction.type].confirmHi)
            : ''
        }
        cancelLabel={L('Cancel', 'रद्द करें')}
        variant={confirmAction ? CONFIRM_COPY[confirmAction.type].variant : 'danger'}
        loading={confirmBusy}
        onConfirm={executeConfirmAction}
        onCancel={() => setConfirmAction(null)}
      />
      </div>
    </div>
  );
}
