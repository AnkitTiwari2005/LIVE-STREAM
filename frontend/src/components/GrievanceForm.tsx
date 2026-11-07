'use client';

import React, { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Send, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

export function GrievanceForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [complaintType, setComplaintType] = useState('Content Violation');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiFetch('/notifications/grievance', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          complaintType,
          details: details.trim(),
        }),
      });

      setTicketId(data.ticketId || 'CONFIRMED');
      setName('');
      setEmail('');
      setPhone('');
      setDetails('');
    } catch (err: any) {
      setError(err.message || 'Failed to register grievance. Please verify inputs or email directly.');
    } finally {
      setLoading(false);
    }
  };

  if (ticketId) {
    return (
      <div className="p-6 bg-emerald-950/60 border border-emerald-700/60 rounded-2xl text-center space-y-3">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Statutory Grievance Lodged</h3>
        <p className="text-xs text-stone-300 max-w-md mx-auto">
          Your complaint has been registered under Rule 3(2) of the Information Technology Rules, 2021.
        </p>
        <div className="inline-block px-4 py-2 bg-emerald-900/80 border border-emerald-600 rounded-xl text-emerald-200 font-mono text-sm font-bold">
          Ticket Reference: {ticketId}
        </div>
        <p className="text-[11px] text-stone-400">
          A formal acknowledgment has been sent to your email. The Resident Grievance Officer will review and respond within statutory timelines (within 15 calendar days).
        </p>
        <button
          onClick={() => setTicketId(null)}
          className="mt-2 text-xs text-emerald-300 hover:underline"
        >
          Submit another inquiry
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-stone-950/90 border border-stone-800 rounded-2xl space-y-4">
      <div className="flex items-center gap-2 text-gold text-sm font-bold border-b border-stone-800 pb-3">
        <ShieldAlert className="w-4 h-4 text-amber-400" />
        <span>Lodge a Formal Grievance with the Resident Officer</span>
      </div>

      {error && (
        <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl flex items-center gap-2 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1">
            Full Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Devotee name"
            className="w-full px-3.5 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1">
            Email Address (for official notice) <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="devotee@example.com"
            className="w-full px-3.5 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-gold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1">
            Phone / WhatsApp (Optional)
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full px-3.5 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1">
            Complaint Category <span className="text-red-400">*</span>
          </label>
          <select
            value={complaintType}
            onChange={(e) => setComplaintType(e.target.value)}
            className="w-full px-3.5 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-gold"
          >
            <option value="Content Violation">Content / Broadcast Violation</option>
            <option value="Pandit Conduct">Pandit Verification or Conduct</option>
            <option value="Devotee Harassment">Harassment in Live Chat</option>
            <option value="Financial or Dakshina">Financial / Dakshina Dispute</option>
            <option value="Privacy or DPDP">Privacy / DPDP Act 2023 Rights</option>
            <option value="Other Statutory Concern">Other Statutory Concern</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-300 mb-1">
          Detailed Description of Grievance <span className="text-red-400">*</span>
        </label>
        <textarea
          required
          rows={4}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Please provide specific details including stream title, date/time, and exact nature of grievance..."
          className="w-full px-3.5 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-gold resize-y"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-gold hover:bg-gold-deep text-obsidian font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Send className="w-3.5 h-3.5" />
        <span>{loading ? 'Submitting Statutory Complaint...' : 'Submit Formal Grievance'}</span>
      </button>
    </form>
  );
}
