'use client';

import React, { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Send, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { useLang } from '@/lib/i18n/context';

export function GrievanceForm() {
  const { t: L } = useLang();
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
      setError(
        err.message ||
          L(
            'Failed to register grievance. Please verify inputs or email directly.',
            'शिकायत दर्ज नहीं हो सकी। कृपया विवरण जाँचें या सीधे ईमेल करें।',
          ),
      );
    } finally {
      setLoading(false);
    }
  };

  if (ticketId) {
    return (
      <div className="p-6 bg-emerald-950/60 border border-emerald-700/60 rounded-2xl text-center space-y-3">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">{L('Statutory Grievance Lodged', 'वैधानिक शिकायत दर्ज हुई')}</h3>
        <p className="text-xs text-stone-300 max-w-md mx-auto">
          {L(
            'Your complaint has been registered under Rule 3(2) of the Information Technology Rules, 2021.',
            'आपकी शिकायत सूचना प्रौद्योगिकी नियम, 2021 के नियम 3(2) के तहत पंजीकृत हो गई है।',
          )}
        </p>
        <div className="inline-block px-4 py-2 bg-emerald-900/80 border border-emerald-600 rounded-xl text-emerald-200 font-mono text-sm font-bold">
          {L('Ticket Reference:', 'टिकट संदर्भ संख्या:')} {ticketId}
        </div>
        <p className="text-[11px] text-stone-400">
          {L(
            'A formal acknowledgment has been sent to your email. The Resident Grievance Officer will review and respond within statutory timelines (within 15 calendar days).',
            'आपके ईमेल पर औपचारिक पावती भेज दी गई है। निवासी शिकायत अधिकारी वैधानिक समय-सीमा (15 कैलेंडर दिनों के भीतर) में समीक्षा कर उत्तर देंगे।',
          )}
        </p>
        <button
          onClick={() => setTicketId(null)}
          className="mt-2 text-xs text-emerald-300 hover:underline"
        >
          {L('Submit another inquiry', 'एक और शिकायत दर्ज करें')}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-stone-950/90 border border-stone-800 rounded-2xl space-y-4">
      <div className="flex items-center gap-2 text-gold text-sm font-bold border-b border-stone-800 pb-3">
        <ShieldAlert className="w-4 h-4 text-amber-400" />
        <span>{L('Lodge a Formal Grievance with the Resident Officer', 'निवासी शिकायत अधिकारी के समक्ष औपचारिक शिकायत दर्ज करें')}</span>
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
            {L('Full Name', 'पूरा नाम')} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={L('Devotee name', 'भक्त का नाम')}
            className="w-full px-3.5 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-stone-300 mb-1">
            {L('Email Address (for official notice)', 'ईमेल पता (आधिकारिक सूचना हेतु)')} <span className="text-red-400">*</span>
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
            {L('Phone / WhatsApp (Optional)', 'फ़ोन / WhatsApp (वैकल्पिक)')}
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
            {L('Complaint Category', 'शिकायत श्रेणी')} <span className="text-red-400">*</span>
          </label>
          <select
            value={complaintType}
            onChange={(e) => setComplaintType(e.target.value)}
            className="w-full px-3.5 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-gold"
          >
            <option value="Content Violation">{L('Content / Broadcast Violation', 'सामग्री / प्रसारण उल्लंघन')}</option>
            <option value="Pandit Conduct">{L('Pandit Verification or Conduct', 'पंडित सत्यापन या आचरण')}</option>
            <option value="Devotee Harassment">{L('Harassment in Live Chat', 'लाइव चैट में उत्पीड़न')}</option>
            <option value="Financial or Dakshina">{L('Financial / Dakshina Dispute', 'वित्तीय / दक्षिणा विवाद')}</option>
            <option value="Privacy or DPDP">{L('Privacy / DPDP Act 2023 Rights', 'गोपनीयता / DPDP अधिनियम 2023 अधिकार')}</option>
            <option value="Other Statutory Concern">{L('Other Statutory Concern', 'अन्य वैधानिक विषय')}</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-stone-300 mb-1">
          {L('Detailed Description of Grievance', 'शिकायत का विस्तृत विवरण')} <span className="text-red-400">*</span>
        </label>
        <textarea
          required
          rows={4}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={L(
            'Please provide specific details including stream title, date/time, and exact nature of grievance...',
            'कृपया प्रसारण शीर्षक, तिथि/समय और शिकायत की सटीक प्रकृति सहित पूरा विवरण दें...',
          )}
          className="w-full px-3.5 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white focus:outline-none focus:border-gold resize-y"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-gold hover:bg-gold-deep text-obsidian font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Send className="w-3.5 h-3.5" />
        <span>
          {loading
            ? L('Submitting Statutory Complaint...', 'वैधानिक शिकायत जमा हो रही है...')
            : L('Submit Formal Grievance', 'औपचारिक शिकायत जमा करें')}
        </span>
      </button>
    </form>
  );
}
