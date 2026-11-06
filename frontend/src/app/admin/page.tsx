'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Users,
  Video,
  FileCheck,
  Radio,
  StopCircle,
  Check,
  X,
  Search,
  Sparkles,
  Lock,
} from 'lucide-react';

export default function AdminConsolePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'kpi' | 'kyc' | 'streams' | 'reports' | 'users' | 'audit'>('kpi');
  const [stats, setStats] = useState<any>(null);
  const [kycList, setKycList] = useState<any[]>([]);
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('pooja_token');
    const storedUser = localStorage.getItem('pooja_user');
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(storedUser);
    if (user.role !== 'ADMIN') {
      alert('Access restricted to platform operators only.');
      router.push('/');
      return;
    }

    loadAdminData();
  }, [router]);

  const loadAdminData = async () => {
    setLoading(true);
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
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

      // 5. Audit Logs
      const auditRes = await fetch(`${apiUrl}/admin/audit-logs`, { headers });
      if (auditRes.ok) setAuditLogs(await auditRes.json());
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKycDecision = async (profileId: string, decision: 'APPROVED' | 'REJECTED') => {
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

    let rejectionReason: string | undefined = undefined;
    if (decision === 'REJECTED') {
      rejectionReason = prompt('Enter reason for rejection:') || 'Qualifications could not be verified.';
    }

    try {
      await fetch(`${apiUrl}/streamers/admin/applications/${profileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision, rejectionReason }),
      });
      loadAdminData();
    } catch {
      alert('Failed to update KYC status.');
    }
  };

  const handleForceEndStream = async (streamId: string) => {
    if (!confirm('Emergency Action: Force end this stream immediately on LiveKit SFU?')) return;
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

    try {
      await fetch(`${apiUrl}/admin/streams/${streamId}/force-end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      loadAdminData();
    } catch {
      alert('Failed to force end stream.');
    }
  };

  const handleSearchUsers = async () => {
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    try {
      const res = await fetch(`${apiUrl}/admin/users?query=${encodeURIComponent(searchUser)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setUsers(await res.json());
    } catch {
      alert('User search failed.');
    }
  };

  const handleUserStatus = async (userId: string, status: 'ACTIVE' | 'SUSPENDED' | 'BANNED') => {
    const token = localStorage.getItem('pooja_token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    try {
      await fetch(`${apiUrl}/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, reason: 'Administrative intervention' }),
      });
      handleSearchUsers();
    } catch {
      alert('Status change failed.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🛡️ Platform Operator Console
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Global monitoring, KYC approvals, emergency kill switches, and audit trail
          </p>
        </div>
        <button
          onClick={loadAdminData}
          className="text-xs font-semibold px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 rounded-xl transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-800 pb-3 mb-8 overflow-x-auto">
        {[
          { key: 'kpi', label: 'Overview Metrics' },
          { key: 'kyc', label: `Pending KYC (${kycList.length})` },
          { key: 'streams', label: `Live Monitor (${liveStreams.length})` },
          { key: 'reports', label: `Safety Reports (${reports.length})` },
          { key: 'users', label: 'User Directory' },
          { key: 'audit', label: 'Audit Log' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-orange-600 text-white'
                : 'text-stone-400 hover:text-white hover:bg-stone-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: KPI Overview */}
      {activeTab === 'kpi' && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl">
            <span className="text-[11px] text-stone-400 uppercase font-semibold block">Total Users</span>
            <span className="text-2xl font-extrabold text-white mt-1 block">{stats.totalUsers}</span>
          </div>
          <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl">
            <span className="text-[11px] text-orange-400 uppercase font-semibold block">Approved Pandits</span>
            <span className="text-2xl font-extrabold text-white mt-1 block">{stats.totalStreamers}</span>
          </div>
          <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl">
            <span className="text-[11px] text-red-400 uppercase font-semibold block">Live Right Now</span>
            <span className="text-2xl font-extrabold text-white mt-1 block">{stats.activeLiveStreams}</span>
          </div>
          <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl">
            <span className="text-[11px] text-stone-400 uppercase font-semibold block">Total Broadcasts</span>
            <span className="text-2xl font-extrabold text-white mt-1 block">{stats.totalStreams}</span>
          </div>
          <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl">
            <span className="text-[11px] text-amber-400 uppercase font-semibold block">Pending KYC</span>
            <span className="text-2xl font-extrabold text-white mt-1 block">{stats.pendingKyc}</span>
          </div>
          <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl">
            <span className="text-[11px] text-rose-400 uppercase font-semibold block">Open Reports</span>
            <span className="text-2xl font-extrabold text-white mt-1 block">{stats.openReports}</span>
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
                <div>
                  <h3 className="font-bold text-white text-base">{app.user.name} ({app.user.email})</h3>
                  <p className="text-xs text-stone-400 mt-1"><strong>Languages:</strong> {app.languages.join(', ')}</p>
                  <p className="text-xs text-stone-400"><strong>Specialties:</strong> {app.specialties.join(', ')}</p>
                  <p className="text-xs text-stone-300 mt-2 bg-stone-950 p-2.5 rounded-xl border border-stone-800">{app.bio}</p>
                </div>
                <div className="flex sm:flex-col gap-2 shrink-0 justify-center">
                  <button
                    onClick={() => handleKycDecision(app.id, 'APPROVED')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-xs font-semibold"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve & Verify
                  </button>
                  <button
                    onClick={() => handleKycDecision(app.id, 'REJECTED')}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold"
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
                  <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider block">● LIVE ON AIR</span>
                  <h3 className="text-base font-bold text-white mt-0.5">{s.title}</h3>
                  <p className="text-xs text-stone-400">Streamer: {s.streamer.name} ({s.streamer.email}) • Category: {s.category.name}</p>
                </div>
                <button
                  onClick={() => handleForceEndStream(s.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg"
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
              <div key={r.id} className="bg-stone-900 border border-stone-800 p-5 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{r.targetType} REPORT: {r.status}</span>
                  <span className="text-xs text-stone-400">By {r.reporter.name}</span>
                </div>
                <h4 className="font-semibold text-white text-sm">{r.reason}</h4>
                {r.details && <p className="text-xs text-stone-400 mt-1">{r.details}</p>}
                {r.chatMessage && (
                  <p className="text-xs text-red-300 mt-2 bg-stone-950 p-2 rounded border border-stone-800 font-mono">
                    Flagged message: "{r.chatMessage.message}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 5: User Management */}
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
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold"
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
                      className="px-3 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-xs font-semibold"
                    >
                      Ban User
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUserStatus(u.id, 'ACTIVE')}
                      className="px-3 py-1 bg-green-600/80 hover:bg-green-600 text-white rounded-lg text-xs font-semibold"
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
                <span className="font-semibold text-orange-400 mr-2">[{log.action}]</span>
                <span className="text-white">{log.targetResource}</span>
                <span className="text-stone-400 block text-[11px] mt-0.5">By: {log.actorEmail || 'System'}</span>
              </div>
              <span className="text-stone-500 font-mono text-[11px]">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
