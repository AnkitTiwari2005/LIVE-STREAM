'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight, X, Sparkles } from 'lucide-react';

interface SearchItem {
  title: string;
  subtitle: string;
  category: string;
  url: string;
  image: string;
  keywords: string;
}

const SEARCH_DIRECTORY: SearchItem[] = [
  {
    title: 'Sandhya Ganga Aarti',
    subtitle: 'Har Ki Pauri, Haridwar · Live Darshan',
    category: 'Live Darshan',
    url: '/stream/demo',
    image: '/images/photo-1681797849099-0053b1567d95.webp',
    keywords: 'ganga aarti haridwar har ki pauri live river deep darshan',
  },
  {
    title: 'Grand Deepotsav Mahotsav',
    subtitle: 'Ram Ki Paidi, Ayodhya · Live Darshan',
    category: 'Live Darshan',
    url: '/stream/demo',
    image: '/images/photo-1577083753695-e010191bacb5.webp',
    keywords: 'grand deepotsav diwali ayodhya ram mandir lakshmi diya darshan',
  },
  {
    title: 'Mangala Aarti — Kashi Vishwanath',
    subtitle: 'Kashi Vishwanath Sanctum, Varanasi',
    category: 'Live Darshan',
    url: '/stream/demo',
    image: '/images/photo-1678593628844-6ea49dee8ce3.webp',
    keywords: 'mangala aarti kashi vishwanath varanasi shiva lingam darshan',
  },
  {
    title: 'Bhasma Aarti',
    subtitle: 'Mahakaleshwar Jyotirlinga, Ujjain',
    category: 'Live Darshan',
    url: '/stream/demo',
    image: '/images/photo-1763610651463-4e7b3befbcc8.webp',
    keywords: 'bhasma aarti mahakaleshwar ujjain shiva jyotirlinga live',
  },
  {
    title: 'Maha Rudrabhishek Abhishekam',
    subtitle: 'Vedic Chanting & Sanctum Seva, Kashi',
    category: 'Pooja',
    url: '/stream/demo',
    image: '/images/photo-1763479939733-eea29c578c17.webp',
    keywords: 'rudrabhishek shiva pooja abhishekam bilva patra kashi',
  },
  {
    title: 'Rasa Kirtan & Bhajan Sandhya',
    subtitle: 'Yamuna Ghat, Vrindavan',
    category: 'Kirtan',
    url: '/stream/demo',
    image: '/images/photo-1514377863868-02d7217c8bcd.webp',
    keywords: 'rasa kirtan bhajan vrindavan krishna radhe yamuna',
  },
  {
    title: 'Sandhya Deep Aarti',
    subtitle: 'Somnath Jyotirlinga, Gujarat',
    category: 'Live Darshan',
    url: '/stream/demo',
    image: '/images/photo-1763479168649-8ffb3bbb9103.webp',
    keywords: 'somnath deep aarti gujarat jyotirlinga ocean darshan',
  },
  {
    title: 'Pandit Aarav Sharma',
    subtitle: 'Head Archak, Kashi Vishwanath Parampara',
    category: 'Pandit',
    url: '/#pandits',
    image: '/images/photo-1543934776-32d1cc654abb.webp',
    keywords: 'pandit aarav sharma kashi rudrabhishek vedic priest',
  },
  {
    title: 'Pandit Hariram Vyas',
    subtitle: 'Senior Purohit, Haridwar Ganga Sabha',
    category: 'Pandit',
    url: '/#pandits',
    image: '/images/photo-1544186196-6908a9d76ab3.webp',
    keywords: 'pandit hariram vyas ganga aarti haridwar purohit',
  },
  {
    title: 'Acharya Devrishi',
    subtitle: 'Sanskrit Acharya, Rishikesh Gurukul',
    category: 'Pandit',
    url: '/#pandits',
    image: '/images/photo-1762838105804-c3264c29a390.webp',
    keywords: 'acharya devrishi rishikesh gurukul katha vedic',
  },
  {
    title: 'Sacred Coin Wallet',
    subtitle: 'Top-up coin packages & review history',
    category: 'Wallet',
    url: '/wallet/topup',
    image: '/images/photo-1741358706805-a5935a200a5c.webp',
    keywords: 'coins wallet recharge payment balance topup pack upi',
  },
  {
    title: 'Pandit Studio',
    subtitle: 'Broadcast your own sacred live darshan',
    category: 'Streamer',
    url: '/studio/create',
    image: '/images/photo-1791727868124-c6ba8c28449a.webp',
    keywords: 'studio broadcast pandit go live camera microphone',
  },
  {
    title: 'Devotee Help & FAQ',
    subtitle: 'Coins, billing, verification & streaming guide',
    category: 'Help',
    url: '/faq',
    image: '/images/photo-1544186196-6908a9d76ab3.webp',
    keywords: 'faq help questions support refund meter verification',
  },
  {
    title: 'About Shubhdarshan',
    subtitle: 'Our sacred lineage & mission',
    category: 'About',
    url: '/about',
    image: '/images/photo-1681797849099-0053b1567d95.webp',
    keywords: 'about mission company team pandit gurukul',
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
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const filteredItems = query.trim()
    ? SEARCH_DIRECTORY.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.keywords.toLowerCase().includes(q)
        );
      })
    : SEARCH_DIRECTORY.slice(0, 7);

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
      aria-label="Search Shubhdarshan"
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl sm:rounded-3xl border border-gold/25 bg-obsidian-deep/95 text-stone-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-gold/20 bg-stone-950/70">
          <Search className="w-5 h-5 text-gold shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search aarti, pooja, pandit, temple, or coins..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-stone-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-stone-400 hover:text-white rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between px-4 py-2 text-[11px] font-semibold text-stone-400 border-b border-stone-800/60 bg-stone-900/40">
          <span>{query.trim() ? `${filteredItems.length} results found` : 'Popular sanctums & sevas'}</span>
          <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[10px]">
            <kbd className="px-1.5 py-0.5 rounded border border-stone-700 bg-stone-800 text-stone-300">↑↓</kbd> navigate
            <kbd className="px-1.5 py-0.5 rounded border border-stone-700 bg-stone-800 text-stone-300">↵</kbd> select
            <kbd className="px-1.5 py-0.5 rounded border border-stone-700 bg-stone-800 text-stone-300">esc</kbd> close
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-400 space-y-1">
              <p className="font-bold text-white text-sm">No rituals found for &ldquo;{query}&rdquo;</p>
              <p>Try searching &ldquo;aarti&rdquo;, &ldquo;kashi&rdquo;, &ldquo;pandit&rdquo;, or &ldquo;coins&rdquo;.</p>
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.title + item.url}
                  onClick={() => handleSelect(item.url)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gold/15 border border-gold/40 text-white'
                      : 'hover:bg-stone-900/70 text-stone-200 border border-transparent'
                  }`}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-11 h-11 rounded-lg object-cover shrink-0 border border-gold/20"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm truncate text-white">
                        {item.title}
                      </span>
                      <span className="text-[10px] font-bold text-gold-pale bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20 shrink-0">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isSelected ? 'text-gold translate-x-0.5' : 'text-stone-500'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-stone-950/80 border-t border-gold/20 text-center text-[11px] text-stone-400">
          Sub-second live devotional broadcasts &amp; verified pandits worldwide
        </div>
      </div>
    </div>
  );
}
