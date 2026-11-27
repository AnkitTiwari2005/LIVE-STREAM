'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight, X, Radio } from 'lucide-react';
import { useLang } from '@/lib/i18n/context';

interface SearchItem {
  title: string;
  titleHi?: string;
  subtitle: string;
  subtitleHi?: string;
  category: string;
  categoryHi?: string;
  url: string;
  image: string;
  keywords: string;
}

// M-10: Static directory now contains only stable site sections.
// Live streams are fetched from the real API and merged at the top of results.
const STATIC_DIRECTORY: SearchItem[] = [
  {
    title: 'पंडित रोहित तिवारी (ज्योतिषाचार्य)',
    subtitle: 'Matrimonial advisor & Astrologer (Founder)',
    subtitleHi: 'वैवाहिक परामर्शदाता एवं ज्योतिषाचार्य (संस्थापक)',
    category: 'Pandit',
    categoryHi: 'पंडित जी',
    url: '/pandit/rohit-tiwari',
    image: '/images/pandits/pandit-rohit-tiwari.webp',
    keywords: 'pandit rohit tiwari matrimonial advisor astrologer jyotishacharya founder vivah kundli milan',
  },
  {
    title: 'पंडित संतोष कुमार शास्त्री',
    subtitle: 'ज्योतिष एवं वास्तु विशेषज्ञ (Co-Founder)',
    subtitleHi: 'ज्योतिष एवं वास्तु विशेषज्ञ (सह-संस्थापक)',
    category: 'Pandit',
    categoryHi: 'पंडित जी',
    url: '/pandit/santosh-shastri',
    image: '/images/pandits/pandit-santosh-shastri.webp',
    keywords: 'pandit santosh kumar shastri vastu shastra jyotish co-founder grievance officer astrology grah shanti',
  },
  {
    title: 'पंडित रवि पाठक',
    subtitle: 'कर्मकाण्ड विशेषज्ञ',
    category: 'Pandit',
    categoryHi: 'पंडित जी',
    url: '/pandit/ravi-pathak',
    image: '/images/pandits/pandit-ravi-pathak.webp',
    keywords: 'pandit ravi pathak karmakand ganesh pujan maha yagya vedic anushthan',
  },
  {
    title: 'पंडित नितिन शर्मा',
    subtitle: 'कर्मकाण्ड, सुंदरकांड विशेषज्ञ',
    category: 'Pandit',
    categoryHi: 'पंडित जी',
    url: '/pandit/nitin-sharma',
    image: '/images/pandits/pandit-nitin-sharma.webp',
    keywords: 'pandit nitin sharma karmakand sunderkand sundarkand hanuman chalisa vedic path',
  },
  {
    title: 'पंडित उमेश शास्त्री',
    subtitle: 'रुद्राभिषेक एवं देवी पूजा',
    category: 'Pandit',
    categoryHi: 'पंडित जी',
    url: '/pandit/umesh-shastri',
    image: '/images/pandits/pandit-umesh-shastri.webp',
    keywords: 'pandit umesh shastri rudrabhishek devi pooja durga saptashati chandi path',
  },
  {
    title: 'आचार्य कुबेर दत्त त्रिपाठी',
    subtitle: 'ज्योतिष कर्मकाण्ड विशेषज्ञ',
    category: 'Pandit',
    categoryHi: 'पंडित जी',
    url: '/pandit/kuber-tripathi',
    image: '/images/pandits/acharya-kuber-tripathi.webp',
    keywords: 'acharya kuber dutt tripathi jyotish karmakand bhajan sankalp seva',
  },
  {
    title: 'पंडित सुभाष शास्त्री',
    subtitle: 'सत्य नारायण पूजा, दुर्गासप्तशती पाठ, नवग्रहपूजन, रुद्राभिषेक',
    category: 'Pandit',
    categoryHi: 'पंडित जी',
    url: '/pandit/subhash-shastri',
    image: '/images/pandits/pandit-subhash-shastri.webp',
    keywords: 'pandit subhash shastri satyanarayan pooja durga saptashati navgrah poojan rudrabhishek',
  },
  {
    title: 'पंडित सुमित शास्त्री (कर्मकांड,ज्योतिष)',
    subtitle: 'कर्मकांड एवं ज्योतिष विशेषज्ञ',
    category: 'Pandit',
    categoryHi: 'पंडित जी',
    url: '/pandit/sumit-shastri',
    image: '/images/pandits/pandit-sumit-shastri.webp',
    keywords: 'pandit sumit shastri karmakand jyotish astrology pooja vidhi',
  },
  {
    title: 'पंडित नंदकिशोर त्रिपाठी (कर्मकांड,ज्योतिष)',
    subtitle: 'कर्मकांड एवं ज्योतिष विशेषज्ञ',
    category: 'Pandit',
    categoryHi: 'पंडित जी',
    url: '/pandit/nandkishor-tripathi',
    image: '/images/pandits/pandit-nandkishor-tripathi.webp',
    keywords: 'pandit nandkishor tripathi karmakand jyotish astrology graha shanti anushthan',
  },
  {
    title: 'Sacred Coin Wallet',
    titleHi: 'पवित्र कॉइन वॉलेट',
    subtitle: 'Top-up coin packages & review history',
    subtitleHi: 'कॉइन पैक रिचार्ज करें और इतिहास देखें',
    category: 'Wallet',
    categoryHi: 'वॉलेट',
    url: '/wallet/topup',
    image: '/images/photo-1741358706805-a5935a200a5c.webp',
    keywords: 'coins wallet recharge payment balance topup pack upi',
  },
  {
    title: 'Become a Verified Pandit Ji',
    titleHi: 'सत्यापित पंडित जी बनें',
    subtitle: 'Apply for KYC & Pandit broadcast verification',
    subtitleHi: 'KYC और पंडित प्रसारण सत्यापन के लिए आवेदन करें',
    category: 'Streamer',
    categoryHi: 'प्रसारक',
    url: '/streamer/apply',
    image: '/images/pandits/pandit-rohit-tiwari.webp',
    keywords: 'apply pandit become acharya priest verification onboard kyc',
  },
  {
    title: 'Pandit Ji Broadcaster Studio',
    titleHi: 'पंडित जी प्रसारक स्टूडियो',
    subtitle: 'For verified Pandit Jis to go live & stream pooja',
    subtitleHi: 'सत्यापित पंडित जी के लिए लाइव पूजा प्रसारण हेतु',
    category: 'Streamer',
    categoryHi: 'प्रसारक',
    url: '/studio/create',
    image: '/images/photo-1791727868124-c6ba8c28449a.webp',
    keywords: 'studio broadcast pandit go live camera microphone acharya',
  },
  {
    title: 'Devotee Help & FAQ',
    titleHi: 'भक्त सहायता एवं FAQ',
    subtitle: 'Coins, billing, verification & streaming guide',
    subtitleHi: 'कॉइन, बिलिंग, सत्यापन एवं स्ट्रीमिंग मार्गदर्शिका',
    category: 'Help',
    categoryHi: 'सहायता',
    url: '/faq',
    image: '/images/photo-1544186196-6908a9d76ab3.webp',
    keywords: 'faq help questions support refund meter verification',
  },
  {
    title: 'About Param Darshan',
    titleHi: 'परम दर्शन के बारे में',
    subtitle: 'Our sacred lineage & mission',
    subtitleHi: 'हमारी पवित्र परंपरा एवं उद्देश्य',
    category: 'About',
    categoryHi: 'परिचय',
    url: '/about',
    image: '/images/hero-bg-v2.webp',
    keywords: 'about mission company team pandit kyc heritage',
  },
  {
    title: 'Free Kundli',
    titleHi: 'निःशुल्क कुंडली',
    subtitle: 'Janam kundali, moon sign, dasha & avakhada',
    subtitleHi: 'जन्म कुंडली, चंद्र राशि, दशा एवं अवकहड़ा',
    category: 'Astrology',
    categoryHi: 'ज्योतिष',
    url: '/kundli',
    image: '/images/hero-bg-v2.webp',
    keywords: 'kundli kundali janam birth chart horoscope rashi nakshatra dasha lagna astrology jyotish',
  },
];

export function SearchPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useLang();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // M-10: Live streams fetched from real API, merged at top of results
  const [liveStreamItems, setLiveStreamItems] = useState<SearchItem[]>([]);

  // M-10: Fetch live & upcoming streams from the real public API when palette opens
  useEffect(() => {
    if (!isOpen) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    fetch(`${apiUrl}/streams/public`)
      .then((r) => r.ok ? r.json() : [])
      .then((streams: any[]) => {
        const items: SearchItem[] = streams
          .filter((s) => s.status === 'LIVE' || s.status === 'SCHEDULED')
          .slice(0, 5)
          .map((s) => ({
            title: s.title || 'Live Pooja Broadcast',
            subtitle: `${s.status === 'LIVE' ? '🔴 LIVE now' : '🗓 Scheduled'} · ${s.streamer?.name || 'Verified Pandit'}`,
            subtitleHi: `${s.status === 'LIVE' ? '🔴 अभी लाइव' : '🗓 निर्धारित'} · ${s.streamer?.name || 'सत्यापित पंडित जी'}`,
            category: s.status === 'LIVE' ? 'Live' : 'Scheduled',
            categoryHi: s.status === 'LIVE' ? 'लाइव' : 'निर्धारित',
            url: `/stream/${s.id}`,
            image: s.thumbnailUrl || '/images/hero-bg-v2.webp',
            keywords: `${s.title} ${s.streamer?.name || ''} live stream aarti pooja`,
          }));
        setLiveStreamItems(items);
      })
      .catch(() => setLiveStreamItems([]));
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName))) {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggling
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // M-10: Merge live API results (always at top) with static directory
  const allItems = [...liveStreamItems, ...STATIC_DIRECTORY];

  const filteredItems = query.trim()
    ? allItems.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.keywords.toLowerCase().includes(q)
        );
      })
    : allItems.slice(0, 7);

  const handleSelect = (url: string) => {
    onClose();
    router.push(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex].url);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('Search Param Darshan', 'परम दर्शन में खोजें')}
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-gold/25 bg-white dark:bg-obsidian-deep/95 text-stone-900 dark:text-stone-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-stone-200 dark:border-gold/20 bg-stone-50 dark:bg-stone-950/70">
          <Search className="w-5 h-5 text-amber-600 dark:text-gold shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('Search aarti, pooja, pandit, temple, or coins...', 'आरती, पूजा, पंडित जी, मंदिर या कॉइन खोजें…')}
            className="w-full bg-transparent text-sm sm:text-base text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label={t('Clear search', 'खोज साफ़ करें')}
              className="p-1 text-stone-400 hover:text-stone-900 dark:hover:text-white rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between px-4 py-2 text-[11px] font-semibold text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800/60 bg-stone-100/70 dark:bg-stone-900/40">
          <span>
            {liveStreamItems.length > 0 && !query.trim() && (
              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-bold mr-2">
                <Radio className="w-3 h-3 animate-pulse" /> {liveStreamItems.length} {t('Live', 'लाइव')}
              </span>
            )}
            {query.trim()
              ? t(`${filteredItems.length} results found`, `${filteredItems.length} परिणाम मिले`)
              : t('Popular sanctums & sevas', 'लोकप्रिय मंदिर एवं सेवाएँ')}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[10px]">
            <kbd className="px-1.5 py-0.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300">↑↓</kbd> {t('navigate', 'चुनें')}
            <kbd className="px-1.5 py-0.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300">↵</kbd> {t('select', 'खोलें')}
            <kbd className="px-1.5 py-0.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300">esc</kbd> {t('close', 'बंद करें')}
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-500 dark:text-stone-400 space-y-1">
              <p className="font-bold text-stone-900 dark:text-white text-sm">
                {t(`No rituals found for "${query}"`, `"${query}" के लिए कोई परिणाम नहीं मिला`)}
              </p>
              <p>{t('Try searching "aarti", "kashi", "pandit", or "coins".', '"आरती", "काशी", "पंडित" या "कॉइन" खोजकर देखें।')}</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              const isLive = item.category === 'Live';
              const displayTitle = t(item.title, item.titleHi || item.title);
              const displaySubtitle = t(item.subtitle, item.subtitleHi || item.subtitle);
              const displayCategory = t(item.category, item.categoryHi || item.category);
              return (
                <div
                  key={item.title + item.url}
                  onClick={() => handleSelect(item.url)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-amber-100 dark:bg-gold/15 border border-amber-300 dark:border-gold/40 text-stone-900 dark:text-white shadow-sm'
                      : 'hover:bg-stone-100 dark:hover:bg-stone-900/70 text-stone-700 dark:text-stone-200 border border-transparent'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={item.image}
                      alt={displayTitle}
                      className="w-11 h-11 rounded-lg object-cover border border-stone-200 dark:border-gold/20"
                    />
                    {isLive && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white dark:border-stone-900 animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm truncate text-stone-900 dark:text-white">
                        {displayTitle}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        isLive
                          ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'
                          : 'text-amber-800 dark:text-gold-pale bg-amber-50 dark:bg-gold/10 border-amber-200 dark:border-gold/20'
                      }`}>
                        {displayCategory}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                      {displaySubtitle}
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? 'text-amber-600 dark:text-gold translate-x-0.5' : 'text-stone-400 dark:text-stone-500'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-stone-50 dark:bg-stone-950/80 border-t border-stone-200 dark:border-gold/20 text-center text-[11px] text-stone-600 dark:text-stone-400">
          {t(
            'Real-time devotional broadcasts & KYC-verified pandits worldwide',
            'देश-विदेश में रियल-टाइम भक्ति प्रसारण एवं KYC-सत्यापित पंडित जी',
          )}
        </div>
      </div>
    </div>
  );
}
