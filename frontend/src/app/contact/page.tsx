'use client';

import React, { useState } from 'react';
import { Mail, MapPin, Phone, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { OmIcon } from '@/components/icons/SpiritualIcons';
import { useLang } from '@/lib/i18n/context';

export default function ContactPage() {
  const { lang, t: L } = useLang();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Pooja Streaming Help');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
      const res = await fetch(`${apiUrl}/notifications/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || L('Failed to submit support inquiry', 'सहायता अनुरोध जमा नहीं हो सका'));
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-600/20 text-orange-400 text-xs font-bold border border-orange-500/30 mb-3">
          <MessageSquare className="w-3.5 h-3.5" /> {L('Devotee Support Desk', 'भक्त सहायता केंद्र')}
        </div>
        <div className="flex items-center justify-center gap-3 mb-3">
          <OmIcon size={36} />
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {L('Contact & Support', 'संपर्क व सहायता')}
          </h1>
        </div>
        <p className="text-stone-400 text-sm max-w-lg mx-auto">
          {L(
            'We are here to assist you with pooja schedules, live streaming support, coin top-ups, and astrologer consultations.',
            'हम पूजा समय-सारणी, लाइव प्रसारण सहायता, कॉइन टॉप-अप और ज्योतिष परामर्श में आपकी मदद के लिए सदैव तत्पर हैं।',
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Contact Info Cards (Col 1) */}
        <div className="space-y-4">
          <div className="p-5 bg-obsidian-soft border border-gold/20 rounded-3xl shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 text-orange-400 flex items-center justify-center mb-3">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-white mb-1">{L('Email Support', 'ईमेल सहायता')}</h3>
            <p className="text-xs text-stone-400 mb-2">
              {L('For devotee queries, refunds, and general assistance:', 'भक्त प्रश्नों, रिफंड और सामान्य सहायता के लिए:')}
            </p>
            <a href="mailto:paramdarshan.com@gmail.com" className="text-xs font-semibold text-gold-pale hover:underline">
              paramdarshan.com@gmail.com
            </a>
          </div>

          <div className="p-5 bg-obsidian-soft border border-gold/20 rounded-3xl shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3">
              <Phone className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-white mb-1">{L('Devotee Support Desk', 'भक्त सहायता हेल्पलाइन')}</h3>
            <p className="text-xs text-stone-600 dark:text-stone-400 mb-2">
              {L('Support hours: 6:00 AM – 10:00 PM IST daily:', 'सहायता समय: प्रतिदिन सुबह 6:00 – रात 10:00 IST:')}
            </p>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              +91-92122-83098
            </span>
            <br />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              +91-96708-42038 ({L('WhatsApp', 'WhatsApp')})
            </span>
          </div>

          <div className="p-5 bg-obsidian-soft border border-gold/20 rounded-3xl shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-white mb-1">{L('Registered Office', 'पंजीकृत कार्यालय')}</h3>
            <p className="text-xs text-stone-400">
              {L('Param Darshan', 'परम दर्शन')}<br />
              {L('Rohini Sector 15, Rohini,', 'रोहिणी सेक्टर 15, रोहिणी,')}<br />
              {L('Delhi 110089, India', 'दिल्ली 110089, भारत')}
            </p>
          </div>
        </div>

        {/* Support Ticket Form (Col 2 & 3) */}
        <div className="md:col-span-2">
          <div className="bg-obsidian-soft border border-gold/20 rounded-3xl p-6 sm:p-10 shadow-2xl relative">
            {submitted ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {L('Message Blessed & Received', 'संदेश सफलतापूर्वक प्राप्त हुआ')}
                </h3>
                <p className="text-sm text-stone-400 max-w-md mx-auto">
                  {lang === 'hi' ? (
                    <>
                      संपर्क करने के लिए धन्यवाद, {name}। हमारी आध्यात्मिक सहायता टीम ने आपका अनुरोध प्राप्त कर लिया है और 2 से 4 घंटों के भीतर <span className="text-orange-400">{email}</span> पर उत्तर देगी।
                    </>
                  ) : (
                    <>
                      Thank you for reaching out, {name}. Our spiritual support team has received your ticket and will reply to <span className="text-orange-400">{email}</span> within 2 to 4 hours.
                    </>
                  )}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-lg font-bold text-white mb-4">{L('Send a Support Message', 'सहायता संदेश भेजें')}</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">{L('Your Full Name', 'आपका पूरा नाम')}</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={L('e.g. Aarav Sharma', 'जैसे: आरव शर्मा')}
                      className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white placeholder-stone-400 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">{L('Your Email Address', 'आपका ईमेल पता')}</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="devotee@domain.com"
                      className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white placeholder-stone-400 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">{L('Inquiry Subject', 'पूछताछ का विषय')}</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Pooja Streaming Help">{L('Live Pooja Streaming Support', 'लाइव पूजा स्ट्रीमिंग सहायता')}</option>
                    <option value="Coin Wallet & Recharge">{L('Sacred Coin Wallet & Recharges', 'पावन कॉइन वॉलेट व रिचार्ज')}</option>
                    <option value="Private Consultation">{L('Private Astrologer Consultation', 'निजी ज्योतिष परामर्श')}</option>
                    <option value="Pandit Application">{L('Pandit Verification & Onboarding', 'पंडित सत्यापन व आवेदन')}</option>
                    <option value="Grievance">{L('Statutory Grievance Redressal', 'वैधानिक शिकायत निवारण')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">{L('Your Message & Details', 'आपका संदेश व विवरण')}</label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={L('Describe how our support team can assist you...', 'बताएँ कि हमारी सहायता टीम आपकी किस प्रकार सहायता कर सकती है...')}
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white placeholder-stone-400 focus:outline-none focus:border-orange-500"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-xs text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-2xl shadow-xl shadow-orange-950/50 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {loading
                      ? L('Dispatching Message...', 'संदेश भेजा जा रहा है...')
                      : L('Deliver Message to Support', 'सहायता टीम को संदेश भेजें')}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
