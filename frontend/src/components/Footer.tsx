import React from 'react';
import Link from 'next/link';
import { ShieldCheck, HeartHandshake, HelpCircle } from 'lucide-react';
import { OmIcon } from '@/components/icons/SpiritualIcons';

export function Footer() {
  return (
    <footer className="bg-stone-950 border-t border-stone-900 text-stone-400 text-sm mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
          {/* Brand & Mission (Col 1 & 2) */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2 text-lg font-bold text-white mb-3 hover:opacity-90">
              <OmIcon size={26} />
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                Shubhdarshan
              </span>
            </Link>
            <p className="text-stone-400 text-xs leading-relaxed max-w-sm">
              Connecting devotees with verified Vedic pandits and certified astrologers for live sacred rituals, Aarti, Darshan, and authentic spiritual counseling worldwide.
            </p>
            <div className="flex items-center gap-2 mt-4 text-[11px] text-stone-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>DPDP Act 2023 & IT Rules 2021 Compliant</span>
            </div>
          </div>

          {/* Quick Platform Links */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/" className="hover:text-orange-400 transition-colors">Live Darshan</Link></li>
              <li><Link href="/wallet/topup" className="hover:text-orange-400 transition-colors">Sacred Coins Topup</Link></li>
              <li><Link href="/about" className="hover:text-orange-400 transition-colors">About Us</Link></li>
              <li><Link href="/faq" className="hover:text-orange-400 transition-colors">Devotee FAQ</Link></li>
              <li><Link href="/contact" className="hover:text-orange-400 transition-colors">Contact & Support</Link></li>
            </ul>
          </div>

          {/* Streamer & Priesthood */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">
              Priesthood & Trust
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/streamer/apply" className="hover:text-orange-400 transition-colors">Apply as Pandit</Link></li>
              <li><Link href="/pandit-guidelines" className="hover:text-orange-400 transition-colors">Pandit Code of Ethics</Link></li>
              <li><Link href="/studio/create" className="hover:text-orange-400 transition-colors">Broadcaster Studio</Link></li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">
              Compliance & Safety
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/terms" className="hover:text-orange-400 transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-orange-400 transition-colors">Privacy Policy (DPDP)</Link></li>
              <li><Link href="/refund" className="hover:text-orange-400 transition-colors">Refund & Cancellation</Link></li>
              <li><Link href="/grievance" className="hover:text-orange-400 transition-colors">Grievance Redressal</Link></li>
            </ul>
          </div>
        </div>

        {/* Astrological Disclaimer */}
        <div className="pt-6 border-t border-stone-900 text-[11px] text-stone-400 leading-relaxed">
          <p>
            <strong>Spiritual & Astrological Disclaimer:</strong> All pooja services, planetary remedies, astrology kundli consultations, and discourses conducted on this platform are for cultural, religious, and spiritual counseling purposes only. Astrologers and pandits broadcast as independent service providers. The platform makes no warranties and guarantees no material, financial, physical, or medical outcomes.
          </p>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 gap-2">
          <p>© 2026 Shubhdarshan Devotional Media Pvt. Ltd. All rights reserved.</p>
          <p>Ultra-low latency live media powered by LiveKit SFU.</p>
        </div>
      </div>
    </footer>
  );
}
