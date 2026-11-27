'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Flame,
  Calendar,
  Users,
  Bell,
  Play,
  Sparkles,
  Zap,
  ShieldCheck,
  Star,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  HelpCircle,
  Music,
  Compass,
  BookOpen,
  HeartHandshake,
  Radio,
  ChevronRight,
  Eye,
  Signal,
  HandCoins,
} from 'lucide-react';
import {
  OmIcon,
  DiyaIcon,
  CoinIcon,
  PranamIcon,
  BellIcon,
  VerifiedPanditBadge,
} from '@/components/icons/SpiritualIcons';
import { SpecialPanditBadge } from '@/components/SpecialPanditBadge';
import { CoinTopupModal } from '@/components/CoinTopupModal';
import SevaBookingModal from '@/components/SevaBookingModal';
import { useToast } from '@/components/Toast';
import { STARTER_PRICE_INR } from '@/lib/economy';
import { decodeJwtClaims } from '@/lib/auth-session';
import { useLang } from '@/lib/i18n/context';
import {
  formatExperienceLabel,
  formatLocaleDateTime,
  translateCategoryLabel,
} from '@/lib/i18n/format';

interface Stream {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  status: 'LIVE' | 'SCHEDULED' | 'ENDED';
  videoQuality: string;
  scheduledAt?: string;
  peakViewers: number;
  category: { id: string; name: string; slug: string };
  streamer: {
    id: string;
    name: string;
    avatarUrl?: string;
    streamerProfile?: { isVerifiedBadge: boolean; specialties: string[] };
  };
}

// R-04: Removed LIVE_SEVA_ACTIVITIES — this was a hardcoded fake activity feed
// showing invented devotee names and actions to create a false sense of real usage.

const CATEGORY_TILES = [
  {
    id: 'rudrabhishek',
    name: 'Maha Rudrabhishek',
    nameHi: 'महा रुद्राभिषेक',
    desc: 'Panchamrit abhishekam & Rudra Suktam',
    descHi: 'पंचामृत अभिषेक एवं रुद्र सूक्तम्',
    icon: DiyaIcon,
    tag: 'Shiva Pooja',
    tagHi: 'शिव पूजा',
    filterKey: 'rudrabhishek',
    priceText: 'From 150 Coins',
    priceTextHi: '150 कॉइन से प्रारंभ',
  },
  {
    id: 'kundli_matching',
    name: 'Vedic Kundli Matching',
    nameHi: 'वैदिक कुंडली मिलान',
    desc: '1-on-1 horoscope compatibility',
    descHi: '1-पर-1 जन्मकुंडली एवं गुण मिलान',
    icon: Compass,
    tag: 'Vedic Jyotish',
    tagHi: 'वैदिक ज्योतिष',
    filterKey: 'kundli_matching',
    priceText: 'From 100 Coins',
    priceTextHi: '100 कॉइन से प्रारंभ',
  },
  {
    id: 'satyanarayan_katha',
    name: 'Satyanarayan Maha Katha',
    nameHi: 'सत्यनारायण महाकथा',
    desc: 'Auspicious katha recital & hawan',
    descHi: 'शुभ कथा पाठ एवं पवित्र हवन',
    icon: BookOpen,
    tag: 'Family Blessing',
    tagHi: 'पारिवारिक आशीर्वाद',
    filterKey: 'satyanarayan_katha',
    priceText: 'From 125 Coins',
    priceTextHi: '125 कॉइन से प्रारंभ',
  },
  {
    id: 'navgrah',
    name: 'Navgrah Dosh Nivaran',
    nameHi: 'नवग्रह दोष निवारण',
    desc: '9-planetary oblations & peace',
    descHi: 'नवग्रह आहुति एवं शांति पूजा',
    icon: Flame,
    tag: 'Planetary Shanti',
    tagHi: 'ग्रह शांति',
    filterKey: 'navgrah',
    priceText: 'From 125 Coins',
    priceTextHi: '125 कॉइन से प्रारंभ',
  },
  {
    id: 'family_sankalp',
    name: 'Family Gotra Sankalp',
    nameHi: 'पारिवारिक गोत्र संकल्प',
    desc: 'Gotra-Naam invocation during aarti',
    descHi: 'आरती में परिवार के गोत्र-नाम का उच्चारण',
    icon: HeartHandshake,
    tag: 'Gotra Chanting',
    tagHi: 'गोत्र उच्चारण',
    filterKey: 'family_sankalp',
    priceText: 'From 75 Coins',
    priceTextHi: '75 कॉइन से प्रारंभ',
  },
  {
    id: 'griha_pravesh_vastu',
    name: 'Griha Pravesh & Vastu',
    nameHi: 'गृह प्रवेश एवं वास्तु',
    desc: 'Purify home energies with Vedic hawan',
    descHi: 'वैदिक हवन द्वारा घर की ऊर्जा शुद्धि',
    icon: Shield,
    tag: 'Vastu Consecration',
    tagHi: 'वास्तु शांति',
    filterKey: 'griha_pravesh_vastu',
    priceText: 'From 200 Coins',
    priceTextHi: '200 कॉइन से प्रारंभ',
  },
  {
    id: 'mahamrityunjaya',
    name: 'Mahamrityunjaya Jaap',
    nameHi: 'महामृत्युंजय जाप',
    desc: 'Chanting for longevity & health',
    descHi: 'दीर्घायु एवं उत्तम स्वास्थ्य हेतु मंत्र जाप',
    icon: Sparkles,
    tag: 'Healing Seva',
    tagHi: 'आरोग्य सेवा',
    filterKey: 'mahamrityunjaya',
    priceText: 'From 150 Coins',
    priceTextHi: '150 कॉइन से प्रारंभ',
  },
  {
    id: 'more',
    name: 'Explore All 24+ Poojas',
    nameHi: 'सभी 24+ पूजा देखें',
    desc: 'Kaal Sarp, Yagyas, Vivah & more',
    descHi: 'कालसर्प, यज्ञ, विवाह एवं अन्य अनुष्ठान',
    icon: ArrowRight,
    tag: 'Full Catalog',
    tagHi: 'संपूर्ण सूची',
    isMore: true,
    link: '/pooja',
    priceText: 'View All 24+ →',
    priceTextHi: 'सभी 24+ देखें →',
  },
];

const FALLBACK_SCHEDULED_BROADCASTS = [
  {
    id: 'rudrabhishek-live',
    title: 'Maha Rudrabhishek & Swasti Vachan',
    titleHi: 'महा रुद्राभिषेक एवं स्वस्ति वाचन',
    description: 'Vedic Panchamrit Abhishek with resonant Rudra Sukta recitation for peace, health, and family prosperity.',
    descriptionHi: 'शांति, स्वास्थ्य एवं पारिवारिक समृद्धि हेतु रुद्र सूक्त पाठ के साथ वैदिक पंचामृत अभिषेक।',
    category: 'Rudrabhishek',
    streamer: 'पंडित उमेश शास्त्री',
    isVerified: true,
    scheduledText: 'Today, 06:00 PM IST',
    scheduledTextHi: 'आज, सायं 06:00 IST',
    quality: '1080p',
    thumbnail: '/images/hero-bg-v2.webp',
  },
  {
    id: 'navgrah-shanti',
    title: 'Navgrah Shanti & Vedic Kundli Remedial Pooja',
    titleHi: 'नवग्रह शांति एवं वैदिक कुंडली निवारण पूजा',
    description: 'Auspicious 9-graha oblations and personalized horoscope dosha nivaran chanting by verified Vedic scholar.',
    descriptionHi: 'सत्यापित वैदिक आचार्य द्वारा नवग्रह आहुति एवं जन्मकुंडली दोष निवारण मंत्रोच्चार।',
    category: 'Astrology & Kundli',
    streamer: 'पंडित रोहित तिवारी (ज्योतिषाचार्य)',
    isVerified: true,
    scheduledText: 'Tomorrow, 07:30 AM IST',
    scheduledTextHi: 'कल, प्रातः 07:30 IST',
    quality: '1080p HD',
    thumbnail: '/images/photo-1577083753695-e010191bacb5.webp',
  },
  {
    id: 'sandhya-aarti',
    title: 'Sandhya Deepotsav & Divine Aarti',
    titleHi: 'संध्या दीपोत्सव एवं दिव्य आरती',
    description: 'Devotional evening lamp invocation with conch shell reverberations and sacred mantra pushpam.',
    descriptionHi: 'शंखनाद एवं मंत्र पुष्पांजलि के साथ भक्तिमय संध्या दीप आरती।',
    category: 'Aarti & Darshan',
    streamer: 'पंडित संतोष कुमार शास्त्री',
    isVerified: true,
    scheduledText: 'Tomorrow, 06:30 PM IST',
    scheduledTextHi: 'कल, सायं 06:30 IST',
    quality: '1080p',
    thumbnail: '/images/photo-1678593628844-6ea49dee8ce3.webp',
  },
];

const FALLBACK_THUMBNAILS = [
  '/images/hero-bg-v2.webp', // Ganga Sandhya Aarti
  '/images/photo-1678593628844-6ea49dee8ce3.webp', // Kashi Mangala Aarti
  '/images/photo-1763479939733-eea29c578c17.webp', // Rudrabhishek Abhishekam
  '/images/photo-1763479168649-8ffb3bbb9103.webp', // Sandhya Deep Aarti
  '/images/photo-1741358706805-a5935a200a5c.webp', // Bhasma Aarti Mahakal
  '/images/photo-1577083753695-e010191bacb5.webp', // Grand Deepotsav
];

const CURATED_PANDITS = [
  {
    slug: 'rohit-tiwari',
    name: 'पंडित रोहित तिवारी (ज्योतिषाचार्य)',
    title: 'Matrimonial Advisor & Astrologer (Founder)',
    titleHi: 'वैवाहिक परामर्शदाता एवं ज्योतिषाचार्य (संस्थापक)',
    experience: '18 Years Seva',
    specialties: ['Matrimonial Advisor', 'Kundli Milan', 'Vedic Astrology', 'Vivah Sanskar'],
    specialtiesHi: ['वैवाहिक परामर्श', 'कुंडली मिलान', 'वैदिक ज्योतिष', 'विवाह संस्कार'],
    image: '/images/pandits/pandit-rohit-tiwari.webp',
    hasSpecialBadge: true,
    specialBadgeTitle: 'संस्थापक एवं मुख्य ज्योतिषाचार्य',
  },
  {
    slug: 'santosh-shastri',
    name: 'पंडित संतोष कुमार शास्त्री',
    title: 'Jyotish & Vastu Acharya (Co-Founder)',
    titleHi: 'ज्योतिष एवं वास्तु विशेषज्ञ (सह-संस्थापक)',
    experience: '20 Years Seva',
    specialties: ['Vedic Astrology', 'Vastu Shastra', 'Kundli Milan', 'Grah Shanti'],
    specialtiesHi: ['वैदिक ज्योतिष', 'वास्तु शास्त्र', 'कुंडली मिलान', 'ग्रह शांति'],
    image: '/images/pandits/pandit-santosh-shastri.webp',
    hasSpecialBadge: true,
    specialBadgeTitle: 'सह-संस्थापक एवं वास्तु रत्न',
  },
  {
    slug: 'ravi-pathak',
    name: 'पंडित रवि पाठक',
    title: 'Karmakand Acharya',
    titleHi: 'कर्मकाण्ड विशेषज्ञ',
    experience: '12 Years Seva',
    specialties: ['Karmakand', 'Maha Yagya', 'Ganesh Pujan', 'Vedic Anushthan'],
    specialtiesHi: ['कर्मकाण्ड', 'महायज्ञ', 'गणेश पूजन', 'वैदिक अनुष्ठान'],
    image: '/images/pandits/pandit-ravi-pathak.webp',
    hasSpecialBadge: true,
    specialBadgeTitle: 'कर्मकाण्ड रत्न',
  },
  {
    slug: 'nitin-sharma',
    name: 'पंडित नितिन शर्मा',
    title: 'Karmakand & Sundarkand Specialist',
    titleHi: 'कर्मकाण्ड एवं सुंदरकांड विशेषज्ञ',
    experience: '10 Years Seva',
    specialties: ['Karmakand', 'Sundarkand Path', 'Hanuman Aradhana', 'Vedic Path'],
    specialtiesHi: ['कर्मकाण्ड', 'सुंदरकांड पाठ', 'हनुमान आराधना', 'वैदिक पाठ'],
    image: '/images/pandits/pandit-nitin-sharma.webp',
    hasSpecialBadge: true,
    specialBadgeTitle: 'सुंदरकांड रत्न',
  },
  {
    slug: 'umesh-shastri',
    name: 'पंडित उमेश शास्त्री',
    title: 'Rudrabhishek & Devi Pooja Acharya',
    titleHi: 'रुद्राभिषेक एवं देवी पूजा विशेषज्ञ',
    experience: '16 Years Seva',
    specialties: ['Rudrabhishek', 'Devi Pooja', 'Durga Path', 'Maha Abhishek'],
    specialtiesHi: ['रुद्राभिषेक', 'देवी पूजा', 'दुर्गा पाठ', 'महाभिषेक'],
    image: '/images/pandits/pandit-umesh-shastri.webp',
    hasSpecialBadge: true,
    specialBadgeTitle: 'रुद्राभिषेक शिरोमणि',
  },
  {
    slug: 'kuber-tripathi',
    name: 'आचार्य कुबेर दत्त त्रिपाठी',
    title: 'Jyotish & Karmakand Acharya',
    titleHi: 'ज्योतिष कर्मकाण्ड विशेषज्ञ',
    experience: '14 Years Seva',
    specialties: ['Jyotish', 'Karmakand', 'Bhajan Sandhya', 'Sankalp Seva'],
    specialtiesHi: ['ज्योतिष', 'कर्मकाण्ड', 'भजन संध्या', 'संकल्प सेवा'],
    image: '/images/pandits/acharya-kuber-tripathi.webp',
    hasSpecialBadge: true,
    specialBadgeTitle: 'ज्योतिष कर्मकाण्ड भूषण',
  },
  {
    slug: 'subhash-shastri',
    name: 'पंडित सुभाष शास्त्री',
    title: 'Satyanarayan Katha, Durga Saptashati, Navgrah & Rudrabhishek Acharya',
    titleHi: 'सत्यनारायण पूजा, दुर्गासप्तशती पाठ, नवग्रह पूजन, रुद्राभिषेक',
    experience: '15 Years Seva',
    specialties: ['Satyanarayan Pooja', 'Durga Saptashati', 'Navgrah Poojan', 'Rudrabhishek'],
    specialtiesHi: ['सत्यनारायण पूजा', 'दुर्गा सप्तशती', 'नवग्रह पूजन', 'रुद्राभिषेक'],
    image: '/images/pandits/pandit-subhash-shastri.webp',
    hasSpecialBadge: true,
    specialBadgeTitle: 'वैदिक विद्वान रत्न',
  },
  {
    slug: 'sumit-shastri',
    name: 'पंडित सुमित शास्त्री (कर्मकांड,ज्योतिष)',
    title: 'Karmakand & Jyotish Acharya',
    titleHi: 'कर्मकाण्ड एवं ज्योतिष विशेषज्ञ',
    experience: '11 Years Seva',
    specialties: ['Karmakand', 'Vedic Astrology', 'Pooja Vidhi', 'Kundli Milan'],
    specialtiesHi: ['कर्मकाण्ड', 'वैदिक ज्योतिष', 'पूजा विधि', 'कुंडली मिलान'],
    image: '/images/pandits/pandit-sumit-shastri.webp',
    hasSpecialBadge: true,
    specialBadgeTitle: 'कर्मकांड एवं ज्योतिष विशेषज्ञ',
  },
  {
    slug: 'nandkishor-tripathi',
    name: 'पंडित नंदकिशोर त्रिपाठी (कर्मकांड,ज्योतिष)',
    title: 'Karmakand & Jyotish Acharya',
    titleHi: 'कर्मकाण्ड एवं ज्योतिष विशेषज्ञ',
    experience: '13 Years Seva',
    specialties: ['Karmakand', 'Vedic Astrology', 'Graha Shanti', 'Anushthan'],
    specialtiesHi: ['कर्मकाण्ड', 'वैदिक ज्योतिष', 'ग्रह शांति', 'अनुष्ठान'],
    image: '/images/pandits/pandit-nandkishor-tripathi.webp',
    hasSpecialBadge: true,
    specialBadgeTitle: 'कर्मकांड एवं ज्योतिष विशेषज्ञ',
  },
];

const DEVOTEE_TESTIMONIALS = [
  {
    name: 'Dr. Ramesh Sundaram',
    nameHi: 'डॉ. रमेश सुंदरम',
    location: 'London, United Kingdom',
    locationHi: 'लंदन, यूनाइटेड किंगडम',
    quote:
      'Living in London, participating in Kashi Vishwanath Mangala Aarti live at 4 AM IST with clear real-time audio felt like sitting right inside the temple sanctum. Param Darshan is a divine blessing.',
    quoteHi:
      'लंदन में रहते हुए प्रातः 4 बजे IST पर स्पष्ट लाइव ऑडियो के साथ काशी विश्वनाथ मंगला आरती में शामिल होना ऐसा लगा मानो मंदिर के गर्भगृह में ही बैठे हों। परम दर्शन वास्तव में एक दिव्य आशीर्वाद है।',
    ritual: 'Kashi Mangala Aarti',
    ritualHi: 'काशी मंगला आरती',
  },
  {
    name: 'Meera & Rajesh Patel',
    nameHi: 'मीरा एवं राजेश पटेल',
    location: 'Fremont, California',
    locationHi: 'फ़्रेमोंट, कैलिफ़ोर्निया',
    quote:
      'We booked a personalized family Sankalp for our mother’s 70th birthday. The pandit ji chanted our gotra and names with pure Vedic precision. The video quality was crystal clear.',
    quoteHi:
      'हमने अपनी माताजी के 70वें जन्मदिन पर व्यक्तिगत पारिवारिक संकल्प कराया। पंडित जी ने शुद्ध वैदिक उच्चारण के साथ हमारे गोत्र व नामों का पाठ किया। वीडियो गुणवत्ता बिल्कुल स्पष्ट थी।',
    ritual: 'Rudrabhishek Sankalp',
    ritualHi: 'रुद्राभिषेक संकल्प',
  },
  {
    name: 'Ananya Deshmukh',
    nameHi: 'अनन्या देशमुख',
    location: 'Singapore',
    locationHi: 'सिंगापुर',
    quote:
      'The transparent 5 coins/min rate and instant Razorpay recharge make it so effortless. No complicated subscriptions, just pure devotion whenever I seek peace after work.',
    quoteHi:
      '5 कॉइन/मिनट की पारदर्शी दर और त्वरित Razorpay रिचार्ज इसे बेहद सरल बनाते हैं। कोई जटिल सब्सक्रिप्शन नहीं — जब भी शांति की चाह हो, बस शुद्ध भक्ति।',
    ritual: 'Sandhya Deep Aarti',
    ritualHi: 'संध्या दीप आरती',
  },
];

export default function HomePage() {
  const toast = useToast();
  const { lang } = useLang();
  const L = (en: string, hi: string) => (lang === 'hi' ? hi : en);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [topupModalOpen, setTopupModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedSevaId, setSelectedSevaId] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const syncUser = () => {
      const stored = localStorage.getItem('pooja_user');
      const token = localStorage.getItem('pooja_token');
      const claims = decodeJwtClaims(token);
      if (stored && token) {
        try {
          const parsed = JSON.parse(stored);
          if (!claims?.sub || parsed.id === claims.sub) {
            setUser(parsed);
          } else {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    };

    syncUser();
    window.addEventListener('sd-auth-change', syncUser);

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'booking') {
        const pending = sessionStorage.getItem('pending_seva_booking');
        if (pending) {
          try {
            const parsed = JSON.parse(pending);
            if (parsed.sevaId) {
              setSelectedSevaId(parsed.sevaId);
            }
          } catch {}
        }
        setBookingModalOpen(true);
      }
    }

    return () => {
      window.removeEventListener('sd-auth-change', syncUser);
    };
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    async function loadCategories() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
        const catRes = await fetch(`${apiUrl}/admin/categories`);
        if (catRes.ok && !cancelled) {
          const cats = await catRes.json();
          setCategories(cats);
        }
      } catch {}
    }
    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let lastFetchedAt = 0;

    async function loadStreams() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
        let streamUrl = `${apiUrl}/streams/public`;
        const params = new URLSearchParams();
        if (selectedCategory) params.append('categoryId', selectedCategory);
        if (debouncedSearch) params.append('search', debouncedSearch);
        if (params.toString()) streamUrl += `?${params.toString()}`;
        const streamRes = await fetch(streamUrl, { cache: 'no-store' });
        if (streamRes.ok && !cancelled) {
          const data = await streamRes.json();
          setStreams(data);
        }
        lastFetchedAt = Date.now();
      } catch (err) {
        console.error('Failed to fetch public stream data:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStreams();

    // Poll streams every 30s only while the tab is visible so background tabs do not wake serverless DB.
    const pollInterval = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        loadStreams();
      }
    }, 30_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchedAt >= 15_000) {
        loadStreams();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedCategory, debouncedSearch]);

  const liveStreams = streams.filter((s) => s.status === 'LIVE');
  const upcomingStreams = streams.filter((s) => s.status === 'SCHEDULED');

  const handleRemindMe = async (streamId: string) => {
    const token = localStorage.getItem('pooja_token');
    if (!token) {
      toast.info(L('Please sign in to set email reminders.', 'ईमेल रिमाइंडर सेट करने के लिए कृपया साइन इन करें।'));
      window.location.href = '/login';
      return;
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
    try {
      const res = await fetch(`${apiUrl}/notifications/remind/${streamId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      toast.success(data.message || L('Email reminder scheduled successfully!', 'ईमेल रिमाइंडर सफलतापूर्वक सेट हो गया!'));
    } catch {
      toast.error(L('Failed to set reminder.', 'रिमाइंडर सेट नहीं हो सका।'));
    }
  };

  const featuredStream = liveStreams[0] || null;
  const nextUpcomingStream = upcomingStreams[0] || null;

  return (
    <div className="min-h-screen bg-obsidian text-white w-full overflow-x-clip">
      {/* 1. Sacred Hero Section */}
      <section className="relative overflow-x-clip pt-10 pb-16 lg:pt-14 lg:pb-24 border-b border-gold/15 w-full max-w-full">
        {/* Background Image with Ambient Saffron Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Ambient Warm Golden Saffron Radial Glow */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.22),rgba(234,88,12,0.08)_50%,transparent_75%)] blur-2xl dark:opacity-100 opacity-20" />

          {/* Sacred Temple Photography Backdrop */}
          <img
            src="/images/hero-bg-v2.webp"
            alt={L('Sandhya Ganga Aarti Haridwar Sanctum', 'संध्या गंगा आरती हरिद्वार गर्भगृह')}
            className="backdrop-photo h-full w-full object-cover opacity-35 scale-105"
          />

          {/* Smooth Gradient Vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-obsidian/70 via-obsidian/85 to-obsidian" />

          {/* Mandala Background Pattern */}
          <div className="mandala-bg absolute inset-0 opacity-40 [mask-image:radial-gradient(800px_500px_at_50%_30%,black,transparent)]" />
        </div>

        <div className="relative mx-auto grid grid-cols-1 max-w-7xl gap-8 px-5 lg:grid-cols-12 lg:gap-8 lg:px-8 items-center w-full overflow-x-clip">
          {/* Left Column: Sacred Copy & Value Props */}
          <div className="flex flex-col justify-center lg:col-span-7 min-w-0 w-full">
            <div>
              {liveStreams.length > 0 ? (
                <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 sm:px-4 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider sm:tracking-[0.24em] text-gold-pale shadow-[0_0_20px_rgba(245,158,11,0.15)] max-w-full truncate">
                  <span className="live-dot shrink-0" />
                  <span className="truncate">{L('Live Vedic Broadcasts • KYC-Verified Pandit Jis', 'लाइव वैदिक प्रसारण • KYC सत्यापित पंडित जी')}</span>
                </p>
              ) : (
                <p className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 sm:px-4 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider sm:tracking-[0.24em] text-gold-pale shadow-[0_0_20px_rgba(245,158,11,0.15)] max-w-full truncate">
                  <DiyaIcon size={14} className="shrink-0" />
                  <span className="truncate">{L('Live Vedic Broadcasts • KYC-Verified Pandit Jis', 'लाइव वैदिक प्रसारण • KYC सत्यापित पंडित जी')}</span>
                </p>
              )}
            </div>

            <h1 className="mt-5 sm:mt-6 w-full max-w-2xl font-serif text-3xl sm:text-5xl lg:text-7xl font-bold leading-[1.12] sm:leading-[1.08] tracking-tight break-words overflow-hidden text-white">
              {L('Sacred Vedic rituals,', 'पवित्र वैदिक अनुष्ठान,')} <br />
              <span className="gold-text italic font-serif">{L('one tap away', 'बस एक क्लिक दूर')}</span>
            </h1>

            <p className="mt-4 sm:mt-6 w-full max-w-xl text-stone-300 text-sm sm:text-lg leading-relaxed">
              {L(
                'Param Darshan connects you directly with KYC-verified Vedic Pandit Jis for personalized poojas, havans, and spiritual counseling — in live interactive HD, directly to your screen.',
                'परम दर्शन आपको व्यक्तिगत पूजा, हवन और आध्यात्मिक परामर्श के लिए KYC-सत्यापित वैदिक पंडित जी से सीधे जोड़ता है — लाइव इंटरैक्टिव HD में सीधे आपकी स्क्रीन पर।',
              )}
            </p>

            {/* Hero Action Buttons */}
            <div className="mt-7 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
              {liveStreams.length > 0 && featuredStream ? (
                <Link
                  href={`/stream/${featuredStream.id}`}
                  className="group inline-flex items-center justify-center gap-3 rounded-full bg-gold px-7 py-3.5 text-sm font-bold text-obsidian shadow-[0_0_36px_rgba(245,158,11,0.4)] transition hover:bg-gold-deep hover:shadow-[0_0_48px_rgba(245,158,11,0.6)] hover:scale-[1.02] w-full sm:w-auto"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-obsidian/20">
                    <Play className="h-3.5 w-3.5 fill-obsidian text-obsidian ml-0.5" />
                  </span>
                  <span>{L('Watch Live Darshan', 'लाइव दर्शन देखें')}</span>
                </Link>
              ) : (
                <button
                  onClick={() => {
                    setSelectedSevaId(undefined);
                    setBookingModalOpen(true);
                  }}
                  className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-gold px-7 py-3.5 text-sm font-bold text-obsidian shadow-[0_0_36px_rgba(245,158,11,0.4)] transition hover:bg-gold-deep hover:shadow-[0_0_48px_rgba(245,158,11,0.6)] hover:scale-[1.02] w-full sm:w-auto"
                >
                  <DiyaIcon size={20} className="transform group-hover:scale-110 transition-transform" />
                  <span>{L('Book a Live Pooja', 'लाइव पूजा बुक करें')}</span>
                </button>
              )}

              <Link
                href="/schedule"
                className="hero-btn-schedule inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3.5 text-sm font-extrabold transition w-full sm:w-auto shadow-sm"
              >
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="font-extrabold">{L('Pooja Schedule', 'पूजा समय-सारिणी')}</span>
              </Link>

              {user ? (
                <button
                  onClick={() => setTopupModalOpen(true)}
                  className="hero-btn-secondary inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3.5 text-sm font-extrabold transition hover:border-amber-400 w-full sm:w-auto shadow-sm"
                >
                  <CoinIcon size={18} />
                  <span className="font-extrabold">{L('Recharge Coins', 'कॉइन रिचार्ज करें')}</span>
                </button>
              ) : (
                <Link
                  href="/register"
                  className="hero-btn-secondary inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3.5 text-sm font-extrabold transition hover:border-amber-400 w-full sm:w-auto shadow-sm"
                >
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="font-extrabold">{L('Claim 100 Free Coins', '100 मुफ़्त कॉइन पाएँ')}</span>
                </Link>
              )}
            </div>

            {/* Platform Stats Row — honest code-backed platform facts */}
            <dl className="mt-8 sm:mt-12 grid grid-cols-2 gap-x-3 sm:gap-x-6 gap-y-4 sm:gap-y-6 border-t border-gold/15 pt-5 sm:pt-8 sm:grid-cols-4">
              <div>
                <dd className="font-serif text-2xl sm:text-4xl font-bold text-gold-pale">100%</dd>
                <dt className="mt-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-normal sm:tracking-[0.16em] text-stone-400">
                  {L('KYC Verified', 'KYC सत्यापित')}
                </dt>
              </div>
              <div>
                <dd className="font-serif text-2xl sm:text-4xl font-bold text-gold-pale">{L('5 Coins', '5 कॉइन')}</dd>
                <dt className="mt-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-normal sm:tracking-[0.16em] text-stone-400">
                  {L('Per Minute', 'प्रति मिनट')}
                </dt>
              </div>
              <div>
                <dd className="font-serif text-2xl sm:text-4xl font-bold text-gold-pale">{L('100 Coins', '100 कॉइन')}</dd>
                <dt className="mt-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-normal sm:tracking-[0.16em] text-stone-400">
                  {L('Welcome Bonus', 'स्वागत बोनस')}
                </dt>
              </div>
              <div>
                <dd className="font-serif text-2xl sm:text-4xl font-bold text-gold-pale">HD</dd>
                <dt className="mt-1 text-[10px] sm:text-[11px] font-bold uppercase tracking-normal sm:tracking-[0.16em] text-stone-400">
                  {L('Live WebRTC', 'लाइव WebRTC')}
                </dt>
              </div>
            </dl>
          </div>

          {/* Right Column: Hero Featured Live Stream or Placeholder Card */}
          <div className="lg:col-span-5 min-w-0 w-full overflow-hidden">
            {featuredStream ? (
              <div className="relative rounded-3xl border border-stone-200 dark:border-gold/30 bg-white dark:bg-gradient-to-b dark:from-[#221810] dark:to-obsidian p-3 shadow-xl dark:shadow-[0_25px_70px_rgba(0,0,0,0.85)] group transition hover:border-amber-400 dark:hover:border-gold/60 overflow-hidden">
                <div className="on-photo video-overlay relative aspect-[16/10] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-black">
                  <img
                    src={
                      featuredStream.thumbnailUrl ||
                      '/images/photo-1678593628844-6ea49dee8ce3.webp'
                    }
                    alt={featuredStream.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-95" />

                  {/* Top Overlay Badges */}
                  <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 rounded-full bg-vermillion-deep/95 backdrop-blur-md px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-md">
                      <span className="live-dot" style={{ width: '6px', height: '6px' }} />
                      {L('LIVE', 'लाइव')}
                    </span>
                    <span className="rounded-full bg-black/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-amber-200 border border-amber-400/30 shadow-md">
                      {L('Live HD', 'लाइव HD')}
                    </span>
                  </div>

                  <div className="absolute top-3.5 right-3.5 rounded-full bg-black/80 backdrop-blur-md px-3 py-1 text-[11px] font-semibold text-stone-200 flex items-center gap-1.5 border border-white/20 shadow-md">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>{featuredStream.peakViewers || 1} {L('watching', 'भक्त दर्शक')}</span>
                  </div>

                  {/* Bottom Overlay Title & Join CTA */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300 block mb-1">
                      {translateCategoryLabel(featuredStream.category?.name || 'Live Aarti', lang)}
                    </span>
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-white line-clamp-2 leading-snug">
                      {featuredStream.title}
                    </h3>
                    <div className="mt-3.5 flex items-center justify-between pt-2 border-t border-white/20">
                      <div className="flex items-center gap-2">
                        <PranamIcon size={16} />
                        <span className="text-xs font-semibold text-stone-200">
                          {featuredStream.streamer?.name || L('Vedic Pandit Ji', 'वैदिक पंडित जी')}
                        </span>
                        <VerifiedPanditBadge size={14} />
                      </div>
                      <Link
                        href={`/stream/${featuredStream.id}`}
                        className="rounded-full bg-gold hover:bg-gold-deep text-obsidian font-bold px-4 py-2 text-xs shadow-lg transition-transform hover:scale-105 flex items-center gap-1"
                      >
                        <span>{L('Join Darshan', 'दर्शन से जुड़ें')}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative rounded-3xl border border-stone-200 dark:border-gold/30 bg-white dark:bg-gradient-to-b dark:from-[#221810] dark:to-obsidian p-3 sm:p-4 shadow-xl dark:shadow-[0_25px_70px_rgba(0,0,0,0.85)] group transition hover:border-amber-400 dark:hover:border-gold/60 overflow-hidden">
                <div className="altar-repose-card relative aspect-[16/10] sm:aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-amber-100/80 via-orange-50/70 to-rose-50/50 dark:bg-[#0c0a09] flex flex-col justify-between p-4 sm:p-6 border border-amber-300 dark:border-gold/20 shadow-inner">
                  <img
                    src="/images/hero-bg-v2.webp"
                    alt={L('Sanctum Repose', 'पवित्र गर्भगृह')}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-20 dark:opacity-40 mix-blend-multiply dark:mix-blend-normal"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/70 to-transparent dark:from-obsidian dark:via-obsidian/75 dark:to-obsidian/60" />

                  {/* Top Overlay Badges */}
                  <div className="relative z-10 flex items-center justify-between gap-2 overflow-hidden min-w-0">
                    <span className="flex items-center gap-1.5 rounded-full bg-amber-100/95 dark:bg-black/85 backdrop-blur-md px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-400/35 shadow-sm dark:shadow-md">
                      <DiyaIcon size={14} className="text-amber-600 dark:text-amber-400" />
                      <span>{L('Live Pooja Altar', 'लाइव पूजा वेदी')}</span>
                    </span>
                    {nextUpcomingStream ? (
                      <span className="flex items-center gap-1.5 rounded-full bg-amber-100/95 dark:bg-black/85 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-amber-900 dark:text-amber-100 border border-amber-300 dark:border-amber-400/35 shadow-sm dark:shadow-md">
                        <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>
                          {L('Next:', 'अगला:')} {new Date(nextUpcomingStream.scheduledAt || Date.now()).toLocaleTimeString(lang === 'hi' ? 'hi-IN' : 'en-IN', { hour: '2-digit', minute: '2-digit' })} IST
                        </span>
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100/95 dark:bg-black/85 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-amber-900 dark:text-stone-200 border border-amber-300 dark:border-white/20 shadow-sm dark:shadow-md">
                        <span>{L('Verified Vedic Acharyas', 'सत्यापित वैदिक आचार्य')}</span>
                      </span>
                    )}
                  </div>

                  {/* Center Sacred Diya & Message */}
                  <div className="relative z-10 text-center py-2 sm:py-3">
                    <div className="w-14 h-14 mx-auto mb-2 rounded-2xl bg-amber-100/70 dark:bg-gradient-to-b dark:from-amber-500/10 dark:to-transparent border border-amber-300 dark:border-gold/30 flex items-center justify-center shadow-sm dark:shadow-[0_0_24px_rgba(245,158,11,0.25)]">
                      <img src="/logo.webp" alt={L('Param Darshan', 'परम दर्शन')} className="w-10 h-10 object-contain drop-shadow" />
                    </div>
                    <h3 className="altar-repose-title font-serif text-xl sm:text-2xl font-bold tracking-tight">
                      {L('Live Pooja Altar in Repose', 'पूजा वेदी विश्राम अवस्था में')}
                    </h3>
                    <p className="altar-repose-desc text-xs mt-1.5 w-full max-w-sm mx-auto leading-relaxed break-words">
                      {L(
                        'Verified Vedic Pandit Jis stream live whenever they conduct sacred rituals, havan poojas, or astrological discourses. Active broadcasts will appear here in real time.',
                        'जब भी सत्यापित वैदिक पंडित जी पूजा, हवन या ज्योतिषीय प्रवचन करते हैं तो लाइव प्रसारण यहाँ तुरंत दिखाई देता है।',
                      )}
                    </p>
                    {nextUpcomingStream && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-black/85 backdrop-blur-md border border-amber-300 dark:border-amber-400/40 text-[11px] shadow-sm dark:shadow-md max-w-full overflow-hidden">
                        <span className="altar-repose-upcoming-badge font-bold uppercase tracking-wider text-[10px] shrink-0">{L('Upcoming:', 'आगामी:')}</span>
                        <span className="altar-repose-upcoming font-bold truncate min-w-0 flex-1">{nextUpcomingStream.title}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="relative z-10 pt-3 border-t border-amber-200/80 dark:border-white/15 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2.5 xs:gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <PranamIcon size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="text-xs font-semibold text-stone-700 dark:text-stone-200 whitespace-nowrap">
                        {L('KYC-Verified Pandit Jis', 'KYC सत्यापित पंडित जी')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 w-full xs:w-auto justify-end">
                      <button
                        onClick={() => {
                          setSelectedSevaId(undefined);
                          setBookingModalOpen(true);
                        }}
                        className="rounded-full bg-gold hover:bg-gold-deep text-obsidian font-bold px-3 py-1.5 text-xs shadow-md transition-transform hover:scale-105 flex items-center gap-1.5 shrink-0"
                      >
                        <DiyaIcon size={14} />
                        <span>{L('Book a Pooja', 'पूजा बुक करें')}</span>
                      </button>
                      <Link
                        href="/schedule"
                        className="rounded-full bg-white dark:bg-black/80 hover:bg-stone-50 dark:hover:bg-black backdrop-blur-md border border-stone-300 dark:border-amber-400/35 text-stone-800 dark:text-amber-100 hover:text-stone-950 dark:hover:text-white font-bold px-2.5 py-1.5 text-xs transition flex items-center gap-1 shadow-sm dark:shadow-md shrink-0"
                      >
                        <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>{L('Schedule', 'समय-सारिणी')}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* R-04: Removed "Worldwide Devotee Seva" ticker — it displayed
                invented devotee names and fake bookings to simulate activity.
                Replaced with nothing; the right column already shows the
                featured live stream card or the platform description card. */}
          </div>
        </div>
      </section>

      {/* 2. Category Filter & Search Section ("Book Personalized Vedic Poojas & Consultations") */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-12" id="live-section">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gold/15">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold-soft">
              {L('Sacred Pooja & Seva Booking', 'पवित्र पूजा एवं सेवा बुकिंग')}
            </p>
            <h2 className="mt-1 font-serif text-3xl sm:text-4xl font-bold text-white">
              {L('Book Personalized Vedic Poojas & Consultations', 'व्यक्तिगत वैदिक पूजा एवं परामर्श बुक करें')}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-stone-400 max-w-xl">
              {L(
                'Select a sacred ritual, choose your preferred KYC-verified Pandit Ji, and book a live personal broadcast.',
                'अपना पवित्र अनुष्ठान चुनें, KYC-सत्यापित पंडित जी का चयन करें और व्यक्तिगत लाइव प्रसारण बुक करें।',
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* View Full Catalog Button */}
            <Link
              href="/pooja"
              className="catalog-explore-btn inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full border text-xs font-bold transition shrink-0 shadow-sm"
            >
              <DiyaIcon size={14} />
              <span>{L('Explore All 24+ Poojas & Kathas', 'सभी 24+ पूजा एवं कथाएँ देखें')}</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            </Link>

            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-gold-soft" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={L('Search pooja, pandit ji...', 'पूजा, पंडित जी खोजें...')}
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-obsidian-soft border border-gold/20 text-xs sm:text-sm text-white placeholder-stone-400 focus:outline-none focus:border-gold transition"
              />
            </div>
          </div>
        </div>

        {/* 8-Tile Sacred Category Grid (Seva Booking Flow) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 my-6">
          {CATEGORY_TILES.map((cat) => {
            const Icon = cat.icon;
            const isMoreCard = (cat as any).isMore;
            const catName = lang === 'hi' ? cat.nameHi : cat.name;
            const catDesc = lang === 'hi' ? cat.descHi : cat.desc;
            const catTag = lang === 'hi' ? cat.tagHi : cat.tag;
            const catPrice = lang === 'hi' ? cat.priceTextHi : cat.priceText;

            if (isMoreCard) {
              return (
                <Link
                  key={cat.id}
                  href="/pooja"
                  className="group relative cursor-pointer rounded-2xl bg-gradient-to-br from-gold/20 via-obsidian-soft to-obsidian p-4 border border-gold/40 hover:border-gold transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-[0_10px_30px_rgba(245,158,11,0.2)] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-gold/20 border border-gold/40 flex items-center justify-center text-gold group-hover:scale-110 transition-transform">
                        <Icon size={18} />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gold-pale bg-gold/20 px-2 py-0.5 rounded-full border border-gold/30">
                        {catTag}
                      </span>
                    </div>
                    <h3 className="font-serif text-sm sm:text-base font-bold text-white group-hover:text-gold-pale transition-colors">
                      {catName}
                    </h3>
                    <p className="text-[11px] text-stone-300 mt-1 line-clamp-1 leading-snug">
                      {catDesc}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gold/20 flex items-center justify-between text-[11px] text-gold font-bold">
                    <span>{L('View All 24+ Sevas', 'सभी 24+ सेवाएँ देखें')}</span>
                    <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform" />
                  </div>
                </Link>
              );
            }

            return (
              <div
                key={cat.id}
                onClick={() => {
                  setSelectedSevaId(cat.filterKey || cat.id);
                  setBookingModalOpen(true);
                }}
                className="group relative cursor-pointer rounded-2xl bg-obsidian-soft p-4 border border-gold/15 hover:border-gold/50 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-[0_10px_30px_rgba(245,158,11,0.12)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold group-hover:scale-110 transition-transform">
                      <Icon size={18} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold-pale bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">
                      {catTag}
                    </span>
                  </div>
                  <h3 className="font-serif text-sm sm:text-base font-bold text-white group-hover:text-gold-pale transition-colors">
                    {catName}
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-1 line-clamp-1 leading-snug">
                    {catDesc}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-stone-800/60 flex items-center justify-between text-[11px] text-gold-soft font-semibold">
                  <span>{catPrice || L('Book Live Session', 'लाइव सत्र बुक करें')}</span>
                  <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Category Filter Pills Row */}
        <div className="flex items-center gap-2 overflow-x-auto w-full max-w-full min-w-0 py-2 no-scrollbar">
          <button
            onClick={() => {
              setSelectedCategory('');
              setSearchQuery('');
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              selectedCategory === '' && searchQuery === ''
                ? 'bg-gold text-obsidian shadow-[0_0_18px_rgba(245,158,11,0.3)]'
                : 'bg-obsidian-soft text-stone-300 border border-gold/15 hover:border-gold/40 hover:text-gold-pale'
            }`}
          >
            {L('All Sacred Rituals', 'सभी पवित्र अनुष्ठान')}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-gold text-obsidian shadow-[0_0_18px_rgba(245,158,11,0.3)]'
                  : 'bg-obsidian-soft text-stone-300 border border-gold/15 hover:border-gold/40 hover:text-gold-pale'
              }`}
            >
              {translateCategoryLabel(cat.name, lang)}
            </button>
          ))}
        </div>
      </section>

      {/* 3. Live Now or Scheduled Broadcasts Section */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-8" id="live-streams-grid">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {liveStreams.length > 0 ? (
              <>
                <span className="live-dot" />
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                  {L('Darshan streaming this very moment', 'इसी क्षण चल रहे लाइव दर्शन')}
                </h2>
              </>
            ) : (
              <>
                <Calendar className="w-6 h-6 text-gold" />
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
                  {L('Scheduled Vedic Poojas & Darshans', 'निर्धारित वैदिक पूजा एवं दर्शन')}
                </h2>
              </>
            )}
          </div>
          <span className="text-xs text-gold-soft/90 font-medium hidden sm:inline">
            {liveStreams.length > 0
              ? L('5 Coins / min metered darshan • Live HD', '5 कॉइन / मिनट मीटर्ड दर्शन • लाइव HD')
              : L('Upcoming live broadcasts scheduled by KYC-verified Pandit Jis', 'KYC-सत्यापित पंडित जी द्वारा निर्धारित आगामी लाइव प्रसारण')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Active Live Streams from API */}
          {liveStreams.map((stream, idx) => {
            const fallbackImg = FALLBACK_THUMBNAILS[idx % FALLBACK_THUMBNAILS.length];
            return (
              <Link
                key={stream.id}
                href={`/stream/${stream.id}`}
                className="group rounded-2xl overflow-hidden bg-obsidian-soft border border-gold/15 hover:border-gold/50 transition-all flex flex-col shadow-xl hover:shadow-[0_12px_36px_rgba(245,158,11,0.12)]"
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-video bg-black overflow-hidden on-photo">
                  <img
                    src={stream.thumbnailUrl || fallbackImg}
                    alt={stream.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/hero-bg-v2.webp';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent opacity-80" />

                  {/* LIVE badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-red-600/90 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> {L('LIVE', 'लाइव')}
                  </div>

                  {/* Quality & Coin Meter */}
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <span className="rounded bg-black/75 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-stone-200">
                      1080p HD
                    </span>
                  </div>

                  {/* Play Hover Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-obsidian shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                      <Play className="h-5 w-5 fill-obsidian ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-soft">
                        {translateCategoryLabel(stream.category?.name || 'Aarti', lang)}
                      </span>
                      <span className="text-[10px] font-bold text-gold-pale bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CoinIcon size={12} /> {L('5 C/min', '5 कॉइन/मिनट')}
                      </span>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-white line-clamp-1 group-hover:text-gold-pale transition">
                      {stream.title}
                    </h3>
                    <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                      {stream.description || L('Join live sacred rituals, Vedic chanting, and Aarti.', 'लाइव पवित्र अनुष्ठान, वैदिक मंत्रोच्चार एवं आरती में शामिल हों।')}
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-300">
                    <div className="flex items-center gap-1.5 font-medium">
                      <PranamIcon size={16} />
                      <span className="text-stone-200">{stream.streamer?.name || L('Vedic Pandit Ji', 'वैदिक पंडित जी')}</span>
                      {stream.streamer?.streamerProfile?.isVerifiedBadge && (
                        <VerifiedPanditBadge size={14} />
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-stone-400 font-medium">
                      <Users className="w-3.5 h-3.5 text-gold" />
                      <span>{stream.peakViewers || 1}</span>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* When No Live Stream: Display Scheduled Broadcasts created by Pandits */}
          {liveStreams.length === 0 && (upcomingStreams.length > 0 ? upcomingStreams : FALLBACK_SCHEDULED_BROADCASTS).map((item: any, idx: number) => {
            const fallbackImg = FALLBACK_THUMBNAILS[idx % FALLBACK_THUMBNAILS.length];
            const dateStr = item.scheduledAt
              ? formatLocaleDateTime(item.scheduledAt, lang)
              : (lang === 'hi' && item.scheduledTextHi ? item.scheduledTextHi : (item.scheduledText || L('Today Evening', 'आज सायं')));
            const streamerName = item.streamer?.name || item.streamer || L('Vedic Pandit Ji', 'वैदिक पंडित जी');
            const categoryName = translateCategoryLabel(item.category?.name || item.category || 'Vedic Pooja', lang);
            const itemTitle = lang === 'hi' && item.titleHi ? item.titleHi : item.title;
            const itemDesc = lang === 'hi' && item.descriptionHi ? item.descriptionHi : item.description;
            const thumbUrl = item.thumbnailUrl || item.thumbnail || fallbackImg;

            return (
              <div
                key={item.id}
                className="group rounded-2xl overflow-hidden bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/15 hover:border-amber-400 dark:hover:border-gold/50 transition-all flex flex-col shadow-md dark:shadow-xl hover:shadow-lg"
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-video bg-black overflow-hidden on-photo">
                  <img
                    src={thumbUrl}
                    alt={itemTitle}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/images/hero-bg-v2.webp';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                  {/* Scheduled badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/85 backdrop-blur-md border border-amber-400/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-100 shadow-md">
                    <Calendar className="w-3 h-3 text-amber-400" />
                    <span>{dateStr}</span>
                  </div>

                  {/* Quality & Coin Meter */}
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <span className="rounded bg-black/75 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-stone-200">
                      1080p HD
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-gold-soft">
                        {categoryName}
                      </span>
                      <span className="text-[10px] font-bold text-amber-900 dark:text-gold-pale bg-amber-500/10 dark:bg-gold/10 border border-amber-500/25 dark:border-gold/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CoinIcon size={12} /> {L('5 C/min', '5 कॉइन/मिनट')}
                      </span>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white line-clamp-1 group-hover:text-amber-700 dark:group-hover:text-gold-pale transition">
                      {itemTitle}
                    </h3>
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                      {itemDesc}
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-stone-200 dark:border-stone-800/80 space-y-3">
                    <div className="flex items-center justify-between text-xs text-stone-600 dark:text-stone-300">
                      <div className="flex items-center gap-1.5 font-medium">
                        <PranamIcon size={16} />
                        <span className="text-stone-800 dark:text-stone-200 font-semibold">{streamerName}</span>
                        <VerifiedPanditBadge size={14} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleRemindMe(item.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-full border border-amber-300 dark:border-gold/30 bg-amber-50 dark:bg-gold/10 hover:bg-amber-100 dark:hover:bg-gold/20 text-amber-950 dark:text-gold-pale transition shadow-sm"
                      >
                        <Bell className="w-3.5 h-3.5 text-amber-600 dark:text-gold" />
                        <span>{L('Remind Me', 'याद दिलाएँ')}</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedSevaId(item.category?.slug || 'rudrabhishek');
                          setBookingModalOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-full bg-gold hover:bg-gold-deep text-obsidian transition shadow"
                      >
                        <DiyaIcon size={14} />
                        <span>{L('Book Sankalp', 'संकल्प बुक करें')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Upcoming Sacred Gatherings ("Upcoming sacred gatherings") */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-14 scroll-mt-5" id="upcoming">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="calendar-tag text-xs font-bold uppercase tracking-[0.24em]">
              {L('Pooja Calendar', 'पूजा पंचांग')}
            </p>
            <h2 className="calendar-title mt-1 font-serif text-2xl sm:text-3xl font-bold">
              {L('Upcoming sacred gatherings', 'आगामी पवित्र अनुष्ठान एवं सभाएँ')}
            </h2>
          </div>
        </div>

        {upcomingStreams.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-obsidian-soft p-8 text-center text-stone-600 dark:text-stone-400 text-xs sm:text-sm">
            {L(
              'All sanctum schedules for the week are currently being synchronized with mandir trusts. Please check back shortly.',
              'इस सप्ताह के सभी मंदिर कार्यक्रम वर्तमान में समन्वित किए जा रहे हैं। कृपया शीघ्र पुनः जाँचें।',
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingStreams.map((stream) => (
              <div
                key={stream.id}
                className="rounded-2xl bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/15 p-5 flex flex-col justify-between shadow-md dark:shadow-lg hover:border-amber-400 dark:hover:border-gold/35 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="calendar-tag text-[10px] font-bold uppercase tracking-[0.2em]">
                      {translateCategoryLabel(stream.category.name, lang)}
                    </span>
                    {stream.scheduledAt && (
                      <span className="calendar-date-pill text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm border">
                        <Clock className="w-3 h-3 shrink-0" />
                        {formatLocaleDateTime(stream.scheduledAt, lang)}
                      </span>
                    )}
                  </div>

                  <h3 className="calendar-title font-serif text-lg font-bold line-clamp-1">{stream.title}</h3>
                  <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                    {stream.description || L('Sacred upcoming Vedic pooja and Aarti.', 'आगामी पवित्र वैदिक पूजा एवं आरती।')}
                  </p>

                  <div className="mt-4 flex items-center gap-1.5 text-xs text-stone-700 dark:text-stone-300 font-semibold">
                    <PranamIcon size={14} />
                    <span>{stream.streamer.name}</span>
                    <VerifiedPanditBadge size={14} />
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-stone-200 dark:border-stone-800/80 flex items-center justify-between">
                  <button
                    onClick={() => handleRemindMe(stream.id)}
                    className="calendar-remind-btn flex items-center gap-1.5 text-xs font-black border px-3.5 py-1.5 rounded-full transition shadow-sm"
                  >
                    <Bell className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-black">{L('Remind Me', 'याद दिलाएँ')}</span>
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                    {L('Live HD', 'लाइव HD')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Meet the Custodians of Tradition ("Verified Pandits & Acharyas") */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-16 border-t border-gold/15 scroll-mt-4" id="pandits">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold-soft">
            {L('Identity & KYC Verification', 'पहचान एवं KYC सत्यापन')}
          </p>
          <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-bold text-white">
            {L('Meet the custodians of tradition', 'वैदिक परंपरा के संवाहक आचार्यगण')}
          </h2>
          <p className="mt-3 text-stone-400 text-xs sm:text-sm leading-relaxed">
            {L(
              'Every Pandit Ji on Param Darshan undergoes government identity KYC review and profile verification before being authorized to broadcast.',
              'परम दर्शन पर प्रत्येक पंडित जी को लाइव प्रसारण की अनुमति मिलने से पहले सरकारी पहचान KYC समीक्षा और प्रोफ़ाइल सत्यापन प्रक्रिया से गुज़रना होता है।',
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {CURATED_PANDITS.map((p) => {
            const pTitle = lang === 'hi' ? p.titleHi : p.title;
            const pSpecs = lang === 'hi' ? p.specialtiesHi : p.specialties;
            return (
            <div
              key={p.name}
              className="rounded-2xl bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/15 overflow-hidden shadow-lg dark:shadow-xl hover:border-amber-400 dark:hover:border-gold/40 transition group"
            >
              <div className="relative aspect-square overflow-hidden bg-stone-900 on-photo">
                <img
                  src={p.image}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                {p.hasSpecialBadge && (
                  <div className="absolute top-3 left-3 z-10 max-w-[65%]">
                    <SpecialPanditBadge title={p.specialBadgeTitle} size="sm" />
                  </div>
                )}
                <div className="absolute top-3 right-3 rounded-full bg-black/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-amber-200 flex items-center gap-1 border border-amber-400/40 shadow-md">
                  <VerifiedPanditBadge size={12} />
                  <span className="text-amber-200">{L('Verified', 'सत्यापित')}</span>
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-amber-400/40 text-amber-200 font-bold text-xs shadow-md">
                    <VerifiedPanditBadge size={14} />
                    <span className="text-amber-200">{L('KYC Verified', 'KYC सत्यापित')}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-2">
                <h3 className="pandit-name font-serif text-lg font-bold">{p.name}</h3>
                <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-tight">{pTitle}</p>
                {p.hasSpecialBadge && (
                  <div className="pt-1">
                    <SpecialPanditBadge title={p.specialBadgeTitle} size="sm" />
                  </div>
                )}
                <div className="pandit-stats flex items-center justify-between text-[11px] pt-1 font-semibold">
                  <span>{formatExperienceLabel(p.experience, lang)}</span>
                  {/* R-04: Removed fake review count */}
                </div>
                <div className="flex flex-wrap gap-1 pt-2">
                  {pSpecs.map((s) => (
                    <span
                      key={s}
                      className="pandit-specialty-tag text-[9px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <div className="pt-3 border-t border-stone-200 dark:border-gold/10 flex items-center justify-between gap-2">
                  <Link
                    href={`/pandit/${p.slug}`}
                    className="pandit-btn-profile flex-1 py-1.5 px-3 border rounded-xl text-center text-xs font-black transition shadow-sm"
                  >
                    <span className="font-black">{L('View Profile & Sevas', 'प्रोफ़ाइल एवं सेवाएँ देखें')}</span>
                  </Link>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </section>

      {/* 6. Three Steps to Your First Darshan ("How It Works") */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-16 border-t border-gold/15">
        <div className="text-center max-w-xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold-soft">
            {L('Seamless Devotional Journey', 'सरल एवं दिव्य भक्ति यात्रा')}
          </p>
          <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-bold text-white">
            {L('Three steps to your sacred live pooja', 'पवित्र लाइव पूजा के तीन सरल चरण')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="rounded-2xl bg-obsidian-soft border border-gold/15 p-6 shadow-xl relative">
            <span className="font-serif text-5xl font-black text-amber-700/80 dark:text-amber-500/70 block mb-2 step-num">01</span>
            <h3 className="font-serif text-xl font-bold text-white mb-2">
              {L('Select Ritual & Verified Pandit Ji', 'अनुष्ठान और सत्यापित पंडित जी चुनें')}
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
              {L(
                'Choose from authentic Vedic rituals — Rudrabhishek, Navgrah Shanti, Kundli guidance, or Family Sankalp. Select your preferred KYC-verified Pandit Ji.',
                'रुद्राभिषेक, नवग्रह शांति, कुंडली मार्गदर्शन या पारिवारिक संकल्प जैसे प्रामाणिक वैदिक अनुष्ठान चुनें और अपने पसंदीदा KYC-सत्यापित पंडित जी का चयन करें।',
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-obsidian-soft border border-gold/15 p-6 shadow-xl relative">
            <span className="font-serif text-5xl font-black text-amber-700/80 dark:text-amber-500/70 block mb-2 step-num">02</span>
            <h3 className="font-serif text-xl font-bold text-white mb-2">
              {L('Join Live Consecrated Broadcast', 'लाइव पवित्र प्रसारण से जुड़ें')}
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
              {L(
                'Connect to our live WebRTC stream with crisp sacred audio. Hear authentic Vedic mantras and ritual chants with pure acoustics directly on your screen.',
                'स्पष्ट ध्वनि के साथ हमारी लाइव WebRTC स्ट्रीम से जुड़ें। सीधे अपनी स्क्रीन पर शुद्ध वैदिक मंत्रोच्चार एवं आरती का श्रवण करें।',
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-obsidian-soft border border-gold/15 p-6 shadow-xl relative">
            <span className="font-serif text-5xl font-black text-amber-700/80 dark:text-amber-500/70 block mb-2 step-num">03</span>
            <h3 className="font-serif text-xl font-bold text-white mb-2">
              {L('Offer Sankalp & Dakshina', 'संकल्प एवं दक्षिणा अर्पित करें')}
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 leading-relaxed">
              {L(
                'Provide your family Gotra for personal chanting, interact directly in the consecrated chatroom, and offer voluntary Dakshina using your Sacred Coin wallet.',
                'व्यक्तिगत उच्चारण हेतु अपने परिवार का गोत्र दर्ज करें, लाइव चैट में संवाद करें और अपने पवित्र कॉइन वॉलेट से स्वेच्छिक दक्षिणा अर्पित करें।',
              )}
            </p>
          </div>
        </div>
      </section>

      {/* 7. One Currency for Every Seva ("Devotional Coins & Transparent Seva") */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-16 border-t border-gold/15">
        <div className="rounded-3xl border border-gold/25 bg-obsidian-soft p-8 sm:p-12 shadow-xl relative overflow-hidden">
          <div className="mandala-bg absolute inset-0 opacity-30 pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-gold-pale">
                <CoinIcon size={16} /> {L('Transparent Devotional Economy', 'पारदर्शी भक्ति अर्थव्यवस्था')}
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white">
                {L('One currency for every seva', 'हर सेवा के लिए एक ही मुद्रा')}
              </h2>
              <p className="text-stone-300 text-xs sm:text-sm leading-relaxed max-w-xl">
                {L(
                  'No hidden subscriptions or recurring credit card traps. You receive 100 free coins upon signup. Metered Darshan costs a transparent 5 coins per minute, deducted smoothly as you watch. Top up securely anytime via UPI, Cards, or NetBanking.',
                  'कोई छिपा सब्सक्रिप्शन या स्वचालित शुल्क नहीं। साइन-अप पर आपको 100 मुफ़्त कॉइन मिलते हैं। मीटर्ड दर्शन का शुल्क पारदर्शी रूप से 5 कॉइन प्रति मिनट है। आप UPI, कार्ड या नेटबैंकिंग से कभी भी सुरक्षित टॉप-अप कर सकते हैं।',
                )}
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => setTopupModalOpen(true)}
                  className="rounded-full bg-gold px-6 py-3 text-xs font-black text-obsidian shadow-lg hover:bg-gold-deep transition"
                >
                  {L(`View Coin Packages (from ₹${STARTER_PRICE_INR})`, `कॉइन पैकेज देखें (₹${STARTER_PRICE_INR} से शुरू)`)}
                </button>
                <Link
                  href="/faq"
                  className="text-xs font-semibold text-stone-300 hover:text-gold-pale transition flex items-center gap-1"
                >
                  <HelpCircle className="w-3.5 h-3.5" /> {L('How do coins work?', 'कॉइन कैसे काम करते हैं?')}
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-3 text-center">
              <div className="p-4 rounded-2xl bg-obsidian border border-gold/15">
                <span className="font-serif text-2xl font-bold text-gold-pale block">{L('100 Coins', '100 कॉइन')}</span>
                <span className="text-[11px] text-stone-400">{L('Free Joining Bonus', 'मुफ़्त स्वागत बोनस')}</span>
              </div>
              <div className="p-4 rounded-2xl bg-obsidian border border-gold/15">
                <span className="font-serif text-2xl font-bold text-gold-pale block">{L('5 Coins/min', '5 कॉइन/मिनट')}</span>
                <span className="text-[11px] text-stone-400">{L('Live Metered Stream', 'लाइव मीटर्ड प्रसारण')}</span>
              </div>
              <div className="p-4 rounded-2xl bg-obsidian border border-gold/15">
                <span className="font-serif text-2xl font-bold text-gold-pale block">{L('100% Secure', '100% सुरक्षित')}</span>
                <span className="text-[11px] text-stone-400">{L('Razorpay Encrypted', 'Razorpay एन्क्रिप्टेड')}</span>
              </div>
              <div className="p-4 rounded-2xl bg-obsidian border border-gold/15">
                <span className="font-serif text-2xl font-bold text-gold-pale block">{L('No Expiry', 'कोई समाप्ति तिथि नहीं')}</span>
                <span className="text-[11px] text-stone-400">{L('Coins Valid Forever', 'कॉइन सदैव मान्य')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Devotee Testimonials ("Blessings received across the world") */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-16 border-t border-gold/15">
        <div className="text-center max-w-xl mx-auto mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-gold-soft">
            {L('Global Sangha', 'वैश्विक श्रद्धालु संगम')}
          </p>
          <h2 className="mt-2 font-serif text-3xl sm:text-4xl font-bold text-white">
            {L('Blessings received, across the seas', 'सात समंदर पार भी पहुँचते आशीर्वाद')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DEVOTEE_TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl bg-obsidian-soft border border-gold/15 p-6 shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-gold">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-gold" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-stone-300 leading-relaxed italic">
                  &ldquo;{lang === 'hi' ? t.quoteHi : t.quote}&rdquo;
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-stone-800/80 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white block">{lang === 'hi' ? t.nameHi : t.name}</span>
                  <span className="text-[10px] text-stone-400">{lang === 'hi' ? t.locationHi : t.location}</span>
                </div>
                <span className="text-[10px] font-bold text-gold-soft bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">
                  {lang === 'hi' ? t.ritualHi : t.ritual}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 9. Final Sacred Call to Action Banner ("Your first Darshan is on us") */}
      <section className="mx-auto max-w-7xl px-5 lg:px-8 py-16">
        <div className="rounded-3xl border border-gold/25 bg-obsidian-soft p-8 sm:p-16 text-center shadow-xl relative overflow-hidden">
          <div className="mandala-bg absolute inset-0 opacity-40 pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-5">
            {user ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gold-pale">
                  <Sparkles className="w-4 h-4 text-gold" /> {L('Sanatana Dharma Worldwide • 100% Shastric Integrity', 'विश्वव्यापी सनातन धर्म • 100% शास्त्रीय मर्यादा')}
                </span>

                <h2 className="font-serif text-3xl sm:text-5xl font-bold text-white">
                  {L('Participate in Sacred Live Darshan', 'पवित्र लाइव दर्शन में सहभागी बनें')}
                </h2>

                <p className="text-stone-300 text-xs sm:text-base leading-relaxed">
                  {L(
                    'Connect with Bharat’s holy sanctums, receive blessings from verified Vedic Pandit Jis, and book personalized sanctum poojas.',
                    'भारत के पवित्र तीर्थस्थलों से जुड़ें, सत्यापित वैदिक पंडित जी से आशीर्वाद प्राप्त करें और व्यक्तिगत पूजा बुक करें।',
                  )}
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
                  <Link
                    href="/pooja"
                    className="rounded-full bg-gold px-8 py-3.5 text-sm font-bold text-obsidian shadow-[0_0_36px_rgba(245,158,11,0.4)] hover:bg-gold-deep transition"
                  >
                    {L('Explore Sanctum Poojas', 'मंदिर एवं वैदिक पूजा देखें')}
                  </Link>
                  <button
                    onClick={() => {
                      setSelectedSevaId(undefined);
                      setBookingModalOpen(true);
                    }}
                    className="rounded-full border border-gold/40 bg-obsidian-soft hover:bg-gold/10 px-6 py-3.5 text-sm font-bold text-gold-pale transition"
                  >
                    {L('Book a Live Pooja Session', 'लाइव पूजा सत्र बुक करें')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-gold-pale">
                  <Sparkles className="w-4 h-4 text-gold" /> {L('100 Free Coins on Joining', 'जुड़ने पर 100 मुफ़्त कॉइन')}
                </span>

                <h2 className="font-serif text-3xl sm:text-5xl font-bold text-white">
                  {L('Your first Darshan is on us', 'आपका पहला दर्शन हमारी ओर से निःशुल्क')}
                </h2>

                <p className="text-stone-300 text-xs sm:text-base leading-relaxed">
                  {L(
                    'Experience authentic Vedic rituals and personalized poojas today. Join devotees across the globe receiving live blessings from KYC-verified Pandit Jis.',
                    'आज ही प्रामाणिक वैदिक अनुष्ठानों और व्यक्तिगत पूजा का अनुभव करें। KYC-सत्यापित पंडित जी से लाइव आशीर्वाद पाने वाले विश्वभर के भक्तों से जुड़ें।',
                  )}
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
                  <Link
                    href="/register"
                    className="rounded-full bg-gold px-8 py-3.5 text-sm font-bold text-obsidian shadow-[0_0_36px_rgba(245,158,11,0.4)] hover:bg-gold-deep transition"
                  >
                    {L('Join Free & Claim 100 Coins', 'निःशुल्क जुड़ें और 100 कॉइन पाएँ')}
                  </Link>
                  <button
                    onClick={() => {
                      setSelectedSevaId(undefined);
                      setBookingModalOpen(true);
                    }}
                    className="rounded-full border border-gold/40 bg-obsidian-soft hover:bg-gold/10 px-6 py-3.5 text-sm font-bold text-gold-pale transition"
                  >
                    {L('Book a Live Pooja Session', 'लाइव पूजा सत्र बुक करें')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Coin Topup Modal */}
      <CoinTopupModal
        isOpen={topupModalOpen}
        onClose={() => setTopupModalOpen(false)}
        onSuccess={() => {}}
      />

      {/* Seva Booking Modal */}
      <SevaBookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        initialSevaId={selectedSevaId}
      />
    </div>
  );
}
