'use client';

import React from 'react';
import { Scale } from 'lucide-react';
import { useLang } from '@/lib/i18n/context';

interface LegalPageFrameProps {
  badgeEn: string;
  badgeHi: string;
  badgeColorClass?: string;
  titleEn: string;
  titleHi: string;
  subtitleEn: React.ReactNode;
  subtitleHi: React.ReactNode;
  children: React.ReactNode;
}

/** Shared card layout for statutory legal pages with the required Hindi precedence notice. */
export function LegalPageFrame({
  badgeEn,
  badgeHi,
  badgeColorClass = 'text-amber-400',
  titleEn,
  titleHi,
  subtitleEn,
  subtitleHi,
  children,
}: LegalPageFrameProps) {
  const { lang, t: L } = useLang();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-obsidian-soft border border-gold/20 rounded-3xl p-6 sm:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-b from-amber-500/10 to-transparent border border-gold/30 flex items-center justify-center shadow-md shrink-0">
            <img
              src="/logo.webp"
              alt={L('Param Darshan', 'परम दर्शन')}
              className="w-8 h-8 object-contain drop-shadow"
            />
          </div>
          <div>
            <span className={`text-xs font-bold uppercase tracking-widest block ${badgeColorClass}`}>
              {L(badgeEn, badgeHi)}
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              {L(titleEn, titleHi)}
            </h1>
          </div>
        </div>

        <p className="text-xs text-stone-400 mb-6 pb-4 border-b border-stone-800">
          {L(subtitleEn, subtitleHi)}
        </p>

        {lang === 'hi' && (
          <div
            role="note"
            className="mb-8 p-4 rounded-2xl bg-amber-950/50 border border-amber-500/40 text-xs text-amber-100 flex items-start gap-2.5 leading-relaxed"
          >
            <Scale className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>वैधानिक सूचना:</strong> आपकी सुविधा के लिए इन नियमों व नीतियों का हिंदी अनुवाद प्रस्तुत किया गया है। किसी भी विधिक अस्पष्टता या व्याख्या में भिन्नता की स्थिति में अंग्रेज़ी पाठ ही अंतिम और मान्य होगा।
            </div>
          </div>
        )}

        <div className="space-y-8 text-stone-300 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
