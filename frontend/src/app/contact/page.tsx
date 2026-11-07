'use client';

import React, { useState } from 'react';
import { Mail, MapPin, Phone, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { OmIcon } from '@/components/icons/SpiritualIcons';

export default function ContactPage() {
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
        throw new Error(data.message || 'Failed to submit support inquiry');
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
          <MessageSquare className="w-3.5 h-3.5" /> 24/7 Devotee Desk
        </div>
        <div className="flex items-center justify-center gap-3 mb-3">
          <OmIcon size={36} />
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Contact & Support
          </h1>
        </div>
        <p className="text-stone-400 text-sm max-w-lg mx-auto">
          We are here to assist you with pooja schedules, live streaming support, coin top-ups, and astrologer consultations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Contact Info Cards (Col 1) */}
        <div className="space-y-4">
          <div className="p-5 bg-stone-900 border border-stone-800 rounded-3xl shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-orange-600/20 text-orange-400 flex items-center justify-center mb-3">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Email Support</h3>
            <p className="text-xs text-stone-400 mb-2">For devotee queries, refunds, and general assistance:</p>
            <a href="mailto:support@shubhdarshan.com" className="text-xs font-semibold text-orange-400 hover:underline">
              support@shubhdarshan.com
            </a>
          </div>

          <div className="p-5 bg-stone-900 border border-stone-800 rounded-3xl shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-3">
              <Phone className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Devotee Support Desk</h3>
            <p className="text-xs text-stone-400 mb-2">Instant assistance during live streams & rituals:</p>
            <span className="text-xs font-semibold text-emerald-400">
              +91 11 4019 7800
            </span>
          </div>

          <div className="p-5 bg-stone-900 border border-stone-800 rounded-3xl shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Registered Office</h3>
            <p className="text-xs text-stone-400">
              Shubhdarshan Devotional Media Pvt. Ltd.<br />
              Suite 402, Sacred Heights, Barakhamba Road, Connaught Place,<br />
              New Delhi 110001, India
            </p>
          </div>
        </div>

        {/* Support Ticket Form (Col 2 & 3) */}
        <div className="md:col-span-2">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative">
            {submitted ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Message Blessed & Received</h3>
                <p className="text-sm text-stone-400 max-w-md mx-auto">
                  Thank you for reaching out, {name}. Our spiritual support team has received your ticket and will reply to <span className="text-orange-400">{email}</span> within 2 to 4 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h2 className="text-lg font-bold text-white mb-4">Send a Support Message</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Aarav Sharma"
                      className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1.5">Your Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="devotee@domain.com"
                      className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">Inquiry Subject</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Pooja Streaming Help">Live Pooja Streaming Support</option>
                    <option value="Coin Wallet & Recharge">Sacred Coin Wallet & Recharges</option>
                    <option value="Private Consultation">Private Astrologer Consultation</option>
                    <option value="Pandit Application">Pandit Verification & Onboarding</option>
                    <option value="Grievance">Statutory Grievance Redressal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">Your Message & Details</label>
                  <textarea
                    rows={4}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe how our support team can assist you..."
                    className="w-full px-4 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-white placeholder-stone-600 focus:outline-none focus:border-orange-500"
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
                  <span>{loading ? 'Dispatching Message...' : 'Deliver Message to Support'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
