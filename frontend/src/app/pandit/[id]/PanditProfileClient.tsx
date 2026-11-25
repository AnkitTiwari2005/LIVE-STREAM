'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Calendar,
  Share2,
  Sparkles,
  ArrowLeft,
  Radio,
  AlertCircle,
  Clock,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import {
  OmIcon,
  DiyaIcon,
  CoinIcon,
  PranamIcon,
  VerifiedPanditBadge,
} from '@/components/icons/SpiritualIcons';
import { SpecialPanditBadge } from '@/components/SpecialPanditBadge';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import SevaBookingModal from '@/components/SevaBookingModal';
import {
  COMPREHENSIVE_POOJA_CATALOG,
  PANDIT_PRICING_CATALOG,
  PoojaItem,
  getPanditDakshinaForPooja,
} from '@/data/poojaCatalog';
import { formatInrFromCoins } from '@/lib/economy';

interface PanditData {
  id?: string;
  name: string;
  title: string;
  experience: string;
  specialties: string[];
  languages: string[];
  image: string;
  bio: string;
  temple: string;
  followerCount: number;
  isCurated?: boolean;
  hasSpecialBadge?: boolean;
  specialBadgeTitle?: string;
  upcoming: Array<{
    id: string;
    title: string;
    category?: string;
    time?: string;
    isLive?: boolean;
  }>;
}

const CURATED_SHOWCASE: Record<string, PanditData> = {
  'rohit-tiwari': {
    name: 'पंडित रोहित तिवारी (ज्योतिषाचार्य)',
    title: 'Matrimonial advisor & Astrologer (Founder)',
    experience: '18 Years Seva',
    specialties: ['Matrimonial Advisor', 'Kundli Milan', 'Vedic Astrology', 'Vivah Sanskar'],
    languages: ['Hindi', 'Sanskrit', 'English'],
    image: '/images/pandits/pandit-rohit-tiwari.webp',
    bio: 'Founder of Param Darshan and revered Vedic astrologer based in Delhi. Specialized in Parashari Jyotish, authentic Kundli Milan, Vivah Sanskar vidhi, and auspicious matrimonial alignments.',
    temple: 'Delhi Mandir Parampara & Param Darshan Foundation',
    followerCount: 1420,
    isCurated: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'संस्थापक एवं मुख्य ज्योतिषाचार्य',
    upcoming: [
      {
        id: 'navgrah-shanti',
        title: 'Navgrah Shanti & Vedic Kundli Remedial Pooja',
        category: 'Astrology & Kundli',
        time: 'Daily • 07:30 AM IST',
        isLive: false,
      },
      {
        id: 'vivah-sanskar-muhurat',
        title: 'Vedic Vivah Sanskar & Matrimonial Muhurat Aradhana',
        category: 'Astrology & Kundli',
        time: 'Today • 06:00 PM IST',
        isLive: true,
      },
    ],
  },
  'santosh-shastri': {
    name: 'पंडित संतोष कुमार शास्त्री',
    title: 'ज्योतिष एवं वास्तु विशेषज्ञ (Co-Founder)',
    experience: '20 Years Seva',
    specialties: ['Vedic Astrology', 'Vastu Shastra', 'Kundli Milan', 'Grah Shanti'],
    languages: ['Hindi', 'Sanskrit'],
    image: '/images/pandits/pandit-santosh-shastri.webp',
    bio: 'Co-Founder of Param Darshan and master of spatial cosmic alignment (Vastu Shastra) and classical Vedic Jyotish. Expert in balancing residential and commercial energies and conducting sacred peace yagyas.',
    temple: 'Delhi Sanatan Tradition Sanctuary',
    followerCount: 1280,
    isCurated: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'सह-संस्थापक एवं वास्तु रत्न',
    upcoming: [
      {
        id: 'vastu-purusha-pujan',
        title: 'Vastu Purusha Pujan & Griha Shanti Hawan',
        category: 'Vastu & Hawan',
        time: 'Daily • 08:00 AM IST',
        isLive: false,
      },
      {
        id: 'sandhya-aarti',
        title: 'Sandhya Deepotsav & Divine Aarti',
        category: 'Aarti & Darshan',
        time: 'Today • 06:30 PM IST',
        isLive: true,
      },
    ],
  },
  'ravi-pathak': {
    name: 'पंडित रवि पाठक',
    title: 'कर्मकाण्ड विशेषज्ञ',
    experience: '12 Years Seva',
    specialties: ['Karmakand', 'Maha Yagya', 'Ganesh Pujan', 'Vedic Anushthan'],
    languages: ['Hindi', 'Sanskrit'],
    image: '/images/pandits/pandit-ravi-pathak.webp',
    bio: 'Dedicated Vedic Purohit specializing in classical Karmakand rituals, Ganesh Aradhana, solemn Vedic anushthans, and sacred havan sankalps.',
    temple: 'Vedic Karmakand Parampara',
    followerCount: 920,
    isCurated: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'कर्मकाण्ड रत्न',
    upcoming: [
      {
        id: 'ganesh-riddhi-siddhi',
        title: 'Ganesh Riddhi-Siddhi Aradhana & Shanti Path',
        category: 'Pooja',
        time: 'Daily • 09:00 AM IST',
        isLive: false,
      },
      {
        id: 'maha-yagya-anushthan',
        title: 'Maha Yagya & Vedic Karmakand Anushthan',
        category: 'Havans & Yagyas',
        time: 'Tomorrow • 07:00 AM IST',
        isLive: false,
      },
    ],
  },
  'nitin-sharma': {
    name: 'पंडित नितिन शर्मा',
    title: 'कर्मकाण्ड, सुंदरकांड विशेषज्ञ',
    experience: '10 Years Seva',
    specialties: ['Karmakand', 'Sundarkand Path', 'Hanuman Aradhana', 'Vedic Path'],
    languages: ['Hindi', 'Sanskrit'],
    image: '/images/pandits/pandit-nitin-sharma.webp',
    bio: 'Accomplished practitioner of Shukla Yajurveda rituals, renowned for rhythmic Sundarkand path recitations, Hanuman chalisa anushthans, and family shanti pujas.',
    temple: 'Shukla Yajurveda Shanti Parampara',
    followerCount: 810,
    isCurated: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'सुंदरकांड रत्न',
    upcoming: [
      {
        id: 'sunderkand-path',
        title: 'Sampoorna Sunderkand Path & Hanuman Chalisa Mahajaap',
        category: 'Katha & Path',
        time: 'Today • 05:30 PM IST',
        isLive: true,
      },
      {
        id: 'shukla-yajurveda-shanti',
        title: 'Shukla Yajurveda Shanti Anushthan',
        category: 'Karmakand',
        time: 'Tomorrow • 08:00 AM IST',
        isLive: false,
      },
    ],
  },
  'umesh-shastri': {
    name: 'पंडित उमेश शास्त्री',
    title: 'रुद्राभिषेक एवं देवी पूजा',
    experience: '16 Years Seva',
    specialties: ['Rudrabhishek', 'Devi Pooja', 'Durga Path', 'Maha Abhishek'],
    languages: ['Hindi', 'Sanskrit'],
    image: '/images/pandits/pandit-umesh-shastri.webp',
    bio: 'Venerated Acharya of Shiva-Shakti aradhana. Conducts powerful Maha Rudrabhishek with Shukla Yajurveda mantra uccharan, Navratri Durga Saptashati, and Chandi path.',
    temple: 'Shiva Shakti Sanctum Parampara',
    followerCount: 1050,
    isCurated: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'रुद्राभिषेक शिरोमणि',
    upcoming: [
      {
        id: 'rudrabhishek-live',
        title: 'Maha Rudrabhishek & Shiva Sahasranama Aradhana',
        category: 'Rudrabhishek',
        time: 'Today • 06:00 PM IST',
        isLive: true,
      },
      {
        id: 'durga-saptashati-navchandi',
        title: 'Durga Saptashati & Navchandi Mahapooja',
        category: 'Devi Pooja',
        time: 'Tomorrow • 07:30 AM IST',
        isLive: false,
      },
    ],
  },
  'kuber-tripathi': {
    name: 'आचार्य कुबेर दत्त त्रिपाठी',
    title: 'ज्योतिष कर्मकाण्ड विशेषज्ञ',
    experience: '14 Years Seva',
    specialties: ['Jyotish', 'Karmakand', 'Bhajan Sandhya', 'Sankalp Seva'],
    languages: ['Hindi', 'Sanskrit'],
    image: '/images/pandits/acharya-kuber-tripathi.webp',
    bio: 'Scholar of Sanskrit scriptures and devotional ritual chanting. Consecrates astrological sankalp sevas, devotional bhajan aartis, and planetary remedy ceremonies.',
    temple: 'Sanatan Jyotish Vidya Peeth',
    followerCount: 890,
    isCurated: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'ज्योतिष कर्मकाण्ड भूषण',
    upcoming: [
      {
        id: 'bhajan-sandhya-deepotsav',
        title: 'Devotional Bhajan Sandhya & Deepotsav Aarti',
        category: 'Kirtan & Bhajan',
        time: 'Today • 07:00 PM IST',
        isLive: true,
      },
      {
        id: 'jyotish-grah-shanti',
        title: 'Jyotish Grah Shanti & Vedic Muhurat Session',
        category: 'Astrology & Kundli',
        time: 'Tomorrow • 08:30 AM IST',
        isLive: false,
      },
    ],
  },
  'subhash-shastri': {
    name: 'पंडित सुभाष शास्त्री',
    title: 'सत्य नारायण पूजा, दुर्गासप्तशती पाठ, नवग्रहपूजन, रुद्राभिषेक',
    experience: '15 Years Seva',
    specialties: ['Satyanarayan Pooja', 'Durga Saptashati', 'Navgrah Poojan', 'Rudrabhishek'],
    languages: ['Hindi', 'Sanskrit'],
    image: '/images/pandits/pandit-subhash-shastri.webp',
    bio: 'Expert Vedic Acharya presiding over sacred Satyanarayan Katha, Durga Saptashati recitation, Navgrah dosha shanti poojas, and auspicious home abhishekams.',
    temple: 'Sanatan Dharmarth Vidhi Parampara',
    followerCount: 960,
    isCurated: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'वैदिक विद्वान रत्न',
    upcoming: [
      {
        id: 'satyanarayan-vrat-katha',
        title: 'Sri Satyanarayan Vrat Katha & Purnima Mahapooja',
        category: 'Vedic Kathas',
        time: 'Daily • 10:00 AM IST',
        isLive: false,
      },
      {
        id: 'navgrah-durga-saptashati',
        title: 'Navgrah Poojan & Durga Saptashati Recitation',
        category: 'Pooja & Hawan',
        time: 'Tomorrow • 09:00 AM IST',
        isLive: false,
      },
    ],
  },
  'aarav-sharma': {
    name: 'Pandit Aarav Sharma',
    title: 'Head Archak, Kashi Vishwanath Parampara',
    experience: '22 Years Seva',
    specialties: ['Rudrabhishek', 'Mahamrityunjaya Jaap', 'Ganga Aarti', 'Vedic Chanting'],
    languages: ['Hindi', 'Sanskrit', 'English'],
    image: '/images/pandits/pandit-rohit-tiwari.webp',
    bio: 'Initiated at the sacred ghats of Varanasi under the Dashashwamedh Parampara, consecrating authentic Vedic ceremonies and sacred Rudrabhisheks.',
    temple: 'Kashi Vishwanath Corridor, Varanasi',
    followerCount: 0,
    isCurated: true,
    upcoming: [],
  },
  'hariram-vyas': {
    name: 'Pandit Hariram Vyas',
    title: 'Senior Purohit, Haridwar Ganga Sabha',
    experience: '18 Years Seva',
    specialties: ['Sandhya Aarti', 'Navgrah Shanti', 'Kavach Path'],
    languages: ['Hindi', 'Sanskrit'],
    image: '/images/pandits/pandit-santosh-shastri.webp',
    bio: 'Custody of sacred ritual traditions at Har Ki Pauri. Specializes in peace and prosperity sankalps and Navgrah dosha nivaran.',
    temple: 'Har Ki Pauri, Haridwar',
    followerCount: 0,
    isCurated: true,
    upcoming: [],
  },
  'vishwanath-bhatt': {
    name: 'Pandit Vishwanath Bhatt',
    title: 'Vedic Scholar, Tirupati Devasthanam Tradition',
    experience: '26 Years Seva',
    specialties: ['Vishnu Sahasranama', 'Satyanarayan Katha', 'Vedic Chanting'],
    languages: ['Telugu', 'Sanskrit', 'Hindi', 'English'],
    image: '/images/pandits/pandit-umesh-shastri.webp',
    bio: 'Trained in Krishna Yajurveda and Vaikhanasa Agama, leading divine katha recitals and suprabhatam chanting for devotees worldwide.',
    temple: 'Tirupati Tradition Sanctuary',
    followerCount: 0,
    isCurated: true,
    upcoming: [],
  },
  devrishi: {
    name: 'Acharya Devrishi',
    title: 'Sanskrit & Jyotish Acharya, Rishikesh',
    experience: '15 Years Seva',
    specialties: ['Vedic Astrology', 'Kundli Milan', 'Vastu Shanti'],
    languages: ['Hindi', 'Sanskrit', 'English'],
    image: '/images/pandits/acharya-kuber-tripathi.webp',
    bio: 'Trusted Jyotish Acharya providing astronomical Kundli analysis, Vastu energy alignments, and Vedic muhurta calculations.',
    temple: 'Rishikesh Tapovan Tradition',
    followerCount: 0,
    isCurated: true,
    upcoming: [],
  },
};

const PANDIT_POOJA_MAP: Record<string, string[]> = {
  'rohit-tiwari': ['kundli_matching', 'vivah_varshikotsav', 'mangal_dosh_shanti', 'navgrah', 'dasha_remedies'],
  'santosh-shastri': ['griha_pravesh_vastu', 'kundli_matching', 'navgrah', 'shani_sade_sati', 'kaal_sarp_dosh'],
  'ravi-pathak': ['gayatri_yagya', 'lakshmi_kuber_havan', 'family_sankalp', 'pitru_tarpana'],
  'nitin-sharma': ['sundarkand', 'ramayan_chopai', 'bhagwat_geeta_path', 'gayatri_yagya'],
  'umesh-shastri': ['rudrabhishek', 'mahamrityunjaya', 'laghurudra', 'chandi_havan', 'somwar_vrat'],
  'kuber-tripathi': ['family_sankalp', 'lakshmi_kuber_havan', 'navgrah', 'dasha_remedies'],
  'subhash-shastri': ['satyanarayan_katha', 'chandi_havan', 'navgrah', 'rudrabhishek'],
};

export default function PanditProfileClient() {
  const router = useRouter();
  const toast = useToast();
  const { id: paramId } = useParams() as { id: string };

  const [id, setId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
      const urlId = parts[parts.length - 1];
      if (urlId && urlId !== 'pandit') {
        return urlId;
      }
    }
    return paramId || '';
  });

  const [pandit, setPandit] = useState<PanditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingAction, setFollowingAction] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedBookingSevaId, setSelectedBookingSevaId] = useState<string | undefined>();

  useEffect(() => {
    if (pandit?.name) {
      document.title = `${pandit.name} | Param Darshan`;
    }
  }, [pandit?.name]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.replace(/\/$/, '').split('/').filter(Boolean);
      const urlId = parts[parts.length - 1];
      if (urlId && urlId !== 'pandit') {
        setId(urlId);
      }
      const stored = localStorage.getItem('pooja_user');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch {}
      }
    }
  }, [paramId]);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    setLoading(true);
    setNotFound(false);

    async function loadProfile() {
      const curated = CURATED_SHOWCASE[id];
      try {
        // N-07: Query real backend streamer profile
        const res = await apiFetch(`/streamers/profile/${id}`);
        if (!isMounted) return;

        if (res && res.profile) {
          const prof = res.profile;
          const userFollowed = currentUser?.id && Array.isArray(prof.followers)
            ? prof.followers.some((f: any) => f.followerId === currentUser.id)
            : false;

          const apiStreams = (res.streams || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            category: s.category?.name || 'Pooja',
            time: s.scheduledAt
              ? new Date(s.scheduledAt).toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : 'Live Broadcast',
            isLive: s.status === 'LIVE',
          }));

          const combinedUpcoming = apiStreams.length > 0 ? apiStreams : (curated?.upcoming || []);

          setPandit({
            id: prof.id,
            name: prof.name || curated?.name || 'Vedic Pandit',
            title: curated?.title || (prof.templeAffiliation ? `${prof.templeAffiliation} Acharya` : 'Verified Vedic Acharya'),
            experience: curated?.experience || (prof.experienceYears ? `${prof.experienceYears} Years Seva` : 'Traditional Lineage'),
            specialties: (prof.specialties && prof.specialties.length > 0) ? prof.specialties : (curated?.specialties || []),
            languages: (prof.languages && prof.languages.length > 0) ? prof.languages : (curated?.languages || ['Hindi', 'Sanskrit']),
            image: curated?.image || prof.avatarUrl || '/images/pandits/pandit-rohit-tiwari.webp',
            bio: curated?.bio || prof.bio || 'Vedic Acharya consecrated to daily Darshan and sacred Pooja rituals.',
            temple: curated?.temple || prof.templeAffiliation || 'Vedic Tradition Sanctuary',
            followerCount: prof.followerCount || curated?.followerCount || 0,
            hasSpecialBadge: prof.hasSpecialBadge !== undefined ? prof.hasSpecialBadge : (curated?.hasSpecialBadge ?? true),
            specialBadgeTitle: prof.specialBadgeTitle || curated?.specialBadgeTitle || 'आचार्य रत्न',
            isCurated: false,
            upcoming: combinedUpcoming,
          });
          setIsFollowing(userFollowed);
          setFollowerCount(prof.followerCount || curated?.followerCount || 0);
          setLoading(false);
          return;
        }
      } catch (err: any) {
        // Fallback check against curated lineage tradition items
        if (curated) {
          if (!isMounted) return;
          setPandit(curated);
          setFollowerCount(curated.followerCount);
          setLoading(false);
          return;
        }

        // Neither real profile nor valid curated tradition: 404
        if (!isMounted) return;
        setNotFound(true);
        setPandit(null);
        setLoading(false);
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [id, currentUser?.id]);

  const toggleFollow = async () => {
    if (!pandit) return;

    if (!currentUser) {
      setLoginPromptOpen(true);
      return;
    }

    if (pandit.isCurated || !pandit.id) {
      toast.info('This is an introductory lineage showcase. You can follow live pandits directly during their active broadcasts.');
      return;
    }

    setFollowingAction(true);
    const nextState = !isFollowing;

    try {
      if (nextState) {
        await apiFetch(`/streamers/${pandit.id}/follow`, { method: 'POST' });
        setIsFollowing(true);
        setFollowerCount((prev) => prev + 1);
        toast.success(`You are now following ${pandit.name}!`);
      } else {
        await apiFetch(`/streamers/${pandit.id}/follow`, { method: 'DELETE' });
        setIsFollowing(false);
        setFollowerCount((prev) => Math.max(0, prev - 1));
        toast.info(`Unfollowed ${pandit.name}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update follow status');
    } finally {
      setFollowingAction(false);
    }
  };

  const handleShare = () => {
    if (!pandit) return;
    if (navigator.share) {
      navigator.share({
        title: `${pandit.name} - Verified Vedic Pandit on Param Darshan`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Pandit profile link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian text-foreground py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-gold mb-4" />
        <p className="text-xs text-stone-400">Loading Vedic Acharya Profile...</p>
      </div>
    );
  }

  if (notFound || !pandit) {
    return (
      <div className="min-h-screen bg-obsidian text-foreground py-20 max-w-xl mx-auto px-4 text-center">
        <AlertCircle className="w-12 h-12 text-gold mx-auto mb-4" />
        <h1 className="font-serif text-2xl font-bold text-white mb-2">Pandit Profile Not Found</h1>
        <p className="text-xs text-stone-400 mb-6">
          The requested Pandit profile ID does not exist or has not yet completed verification.
        </p>
        <Link
          href="/#pandits"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold transition shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Verified Pandits</span>
        </Link>
      </div>
    );
  }

  const panditPricing =
    PANDIT_PRICING_CATALOG.find(
      (p) =>
        p.panditId === id ||
        p.name.toLowerCase().includes(id.toLowerCase()) ||
        (id === 'rohit-tiwari' && p.name.includes('रोहित')) ||
        (id === 'santosh-shastri' && p.name.includes('संतोष')) ||
        (id === 'ravi-pathak' && p.name.includes('रवि')) ||
        (id === 'nitin-sharma' && p.name.includes('नितिन')) ||
        (id === 'umesh-shastri' && p.name.includes('उमेश')) ||
        (id === 'kuber-tripathi' && p.name.includes('कुबेर')) ||
        (id === 'subhash-shastri' && p.name.includes('सुभाष'))
    ) || PANDIT_PRICING_CATALOG[0];

  const relevantPoojaIds = PANDIT_POOJA_MAP[id] || ['rudrabhishek', 'kundli_matching', 'satyanarayan_katha', 'navgrah'];
  const specializedPoojas = COMPREHENSIVE_POOJA_CATALOG.filter((p) => relevantPoojaIds.includes(p.id));

  return (
    <div className="min-h-screen bg-obsidian text-foreground py-10 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back navigation */}
        <Link
          href="/#pandits"
          className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-gold-pale mb-6 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Verified Pandits</span>
        </Link>

        {/* Profile Header Card */}
        <div className="bg-obsidian-soft border border-gold/25 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
            <div className="on-photo relative w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden border-2 border-gold/40 shadow-xl shrink-0 bg-stone-900">
              <img src={pandit.image} alt={pandit.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              {pandit.hasSpecialBadge && (
                <div className="absolute top-2.5 left-2.5 z-10">
                  <SpecialPanditBadge title={pandit.specialBadgeTitle} size="sm" />
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {pandit.hasSpecialBadge && (
                  <SpecialPanditBadge title={pandit.specialBadgeTitle} size="md" />
                )}
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gold/15 text-gold border border-gold/30">
                  <VerifiedPanditBadge size={14} /> KYC Verified Pandit
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-900 border border-stone-800 text-stone-300">
                  <Sparkles className="w-3 h-3 text-gold" /> {pandit.experience}
                </span>
              </div>

              <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white tracking-tight">
                {pandit.name}
              </h1>
              <p className="text-xs sm:text-sm text-gold-pale font-medium">{pandit.title}</p>
              <p className="text-xs text-stone-400">{pandit.temple}</p>

              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed pt-2">
                {pandit.bio}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3">
                <button
                  onClick={toggleFollow}
                  disabled={followingAction}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition shadow-md ${
                    isFollowing
                      ? 'bg-stone-800 text-gold-pale border border-gold/40'
                      : 'bg-gold hover:bg-gold-deep text-obsidian shadow-gold/20'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>
                    {isFollowing ? 'Following' : 'Follow Pandit'} ({followerCount})
                  </span>
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-obsidian border border-gold/20 hover:bg-stone-900 text-stone-300 text-xs font-semibold transition"
                >
                  <Share2 className="w-3.5 h-3.5 text-gold-soft" />
                  <span>Share Profile</span>
                </button>
              </div>
            </div>
          </div>

          {/* Specialties & Languages */}
          <div className="mt-8 pt-6 border-t border-gold/15 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-bold text-gold uppercase tracking-wider block mb-2">Sacred Ritual Specialties</span>
              <div className="flex flex-wrap gap-1.5">
                {pandit.specialties.length > 0 ? (
                  pandit.specialties.map((s: string) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-lg bg-obsidian border border-gold/15 text-stone-200"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-stone-600 dark:text-stone-400 italic">Vedic Pooja &amp; Hawan</span>
                )}
              </div>
            </div>

            <div>
              <span className="font-bold text-gold uppercase tracking-wider block mb-2">Languages Spoken</span>
              <div className="flex flex-wrap gap-1.5">
                {pandit.languages.map((l: string) => (
                  <span
                    key={l}
                    className="px-2.5 py-1 rounded-lg bg-obsidian border border-gold/15 text-stone-200"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Ceremonies & Darshan Broadcasts */}
        <div className="space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-gold" />
            <span>Sacred Broadcasts &amp; Ceremonies</span>
          </h2>

          {pandit.upcoming.length === 0 ? (
            <div className="p-8 rounded-2xl bg-obsidian-soft border border-gold/15 text-center text-stone-400 text-xs">
              No live ceremonies currently scheduled for today. Follow this Pandit to receive notifications when a live broadcast begins.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pandit.upcoming.map((u: any) => (
                <div
                  key={u.id}
                  className="p-5 rounded-2xl bg-obsidian-soft border border-gold/20 shadow-lg flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold text-gold-soft bg-gold/10 px-2 py-0.5 rounded">
                        {u.category}
                      </span>
                      {u.isLive && (
                        <span className="text-[10px] font-bold text-red-400 flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> LIVE NOW
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">{u.title}</h3>
                    <p className="text-xs text-stone-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gold-soft" />
                      <span>{u.time}</span>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gold/10">
                    <Link
                      href={`/stream/${u.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold rounded-full transition shadow-md"
                    >
                      <span>Join Live Darshan</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Book Personalized Pooja Section */}
        <div className="space-y-6 pt-6 mt-8 border-t border-gold/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold/10 border border-gold/25 text-[10px] font-bold text-gold-soft uppercase tracking-wider mb-1.5">
                <Sparkles className="w-3 h-3 text-gold" /> Personalized Sankalp Sevas
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <span>Book Personalized Pooja with this Pandit</span>
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                Conducted with authentic Gotra chanting and family Sankalp via private interactive darshan.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {specializedPoojas.map((pooja) => {
              const dakshinaCoins = getPanditDakshinaForPooja(panditPricing, pooja);
              return (
                <div
                  key={pooja.id}
                  className="rounded-2xl bg-obsidian-soft border border-gold/20 hover:border-gold/50 p-5 shadow-lg flex flex-col justify-between gap-4 transition group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
                        {pooja.category}
                      </span>
                      <span className="text-[11px] text-stone-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gold-soft" />
                        {pooja.duration}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-serif text-base sm:text-lg font-bold text-white group-hover:text-amber-200 transition">
                        {pooja.name}
                      </h3>
                      {pooja.hindiName && (
                        <p className="text-xs text-gold-soft font-serif font-medium mt-0.5">
                          {pooja.hindiName}
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-stone-300 leading-relaxed">
                      {pooja.description}
                    </p>

                    <div className="pt-1 flex items-center gap-1.5 text-[11px] text-stone-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{pooja.mantraTradition}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gold/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
                        <CoinIcon size={14} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-amber-200">
                          {dakshinaCoins} Coins
                        </div>
                        <div className="text-[10px] text-stone-400">
                          ≈ {formatInrFromCoins(dakshinaCoins)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBookingSevaId(pooja.id);
                        setBookingModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold transition shadow-md hover:scale-[1.02]"
                    >
                      <DiyaIcon size={14} />
                      <span>Book Pooja (संकल्प लें)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={loginPromptOpen}
        title="Sign In to Follow Pandit"
        description="Please sign in to follow verified Pandits and receive email notifications when their live darshans begin."
        confirmLabel="Sign In"
        cancelLabel="Not Now"
        variant="default"
        onConfirm={() => {
          setLoginPromptOpen(false);
          router.push(`/login?redirect=/pandit/${id}`);
        }}
        onCancel={() => setLoginPromptOpen(false)}
      />

      <SevaBookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        initialSevaId={selectedBookingSevaId}
        initialPanditId={id}
      />
    </div>
  );
}
