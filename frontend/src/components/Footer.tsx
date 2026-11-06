import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-stone-950 border-t border-stone-900 text-stone-400 text-sm mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand & Mission */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-lg font-bold text-white mb-3">
              <span>🕉️</span>
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                Pooja & Astrology Live
              </span>
            </div>
            <p className="text-stone-400 text-xs leading-relaxed max-w-md">
              Connecting devotees with verified Vedic pandits and certified astrologers for live sacred rituals, Aarti, Darshan, and authentic spiritual counseling worldwide.
            </p>
            <p className="text-stone-500 text-xs mt-3">
              Self-hosted WebRTC video delivery powered by LiveKit SFU.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">
              Platform Links
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/" className="hover:text-orange-400">Live Darshan</Link></li>
              <li><Link href="/streamer/apply" className="hover:text-orange-400">Pandit Verification</Link></li>
              <li><Link href="/about" className="hover:text-orange-400">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-orange-400">Contact & Support</Link></li>
            </ul>
          </div>

          {/* Legal & Compliance (DPDP Act) */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">
              Compliance & Safety
            </h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/terms" className="hover:text-orange-400">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-orange-400">Privacy Policy (DPDP 2023)</Link></li>
              <li><Link href="/refund" className="hover:text-orange-400">Refund Policy</Link></li>
              <li><Link href="/grievance" className="hover:text-orange-400">Grievance Redressal</Link></li>
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
          <p>© 2026 Pooja & Astrology Live. All rights reserved.</p>
          <p>Committed to Digital Personal Data Protection Act, 2023 compliance.</p>
        </div>
      </div>
    </footer>
  );
}
