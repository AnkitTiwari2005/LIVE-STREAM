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
  getPanditDakshinaForPooja,
  getLocalizedPooja,
} from '@/data/poojaCatalog';
import { formatInrFromCoins } from '@/lib/economy';
import { useLang } from '@/lib/i18n/context';
import {
  formatCoins,
  formatExperienceLabel,
  formatLocaleDateTime,
  translateCategoryLabel,
} from '@/lib/i18n/format';

interface PanditData {
  id?: string;
  name: string;
  title: string;
  titleHi?: string;
  experience: string;
  experienceYears?: number;
  specialties: string[];
  specialtiesHi?: string[];
  languages: string[];
  image: string;
  bio: string;
  bioHi?: string;
  temple: string;
  templeHi?: string;
  templeAffiliation?: string;
  followerCount: number;
  isCurated?: boolean;
  hasSpecialBadge?: boolean;
  specialBadgeTitle?: string;
  upcoming: Array<{
    id: string;
    title: string;
    titleHi?: string;
    category?: string;
    time?: string;
    timeHi?: string;
    scheduledAt?: string;
    isLive?: boolean;
  }>;
}

const LANGUAGE_HI: Record<string, string> = {
  Hindi: 'हिन्दी',
  Sanskrit: 'संस्कृत',
  English: 'अंग्रेज़ी',
  Marathi: 'मराठी',
  Gujarati: 'गुजराती',
  Bengali: 'बंगाली',
  Tamil: 'तमिल',
  Telugu: 'तेलुगु',
  Punjabi: 'पंजाबी',
  Bhojpuri: 'भोजपुरी',
  Awadhi: 'अवधी',
};

const SPECIALTY_HI: Record<string, string> = {
  'Matrimonial Advisor': 'वैवाहिक परामर्श',
  'Kundli Milan': 'कुंडली मिलान',
  'Vedic Astrology': 'वैदिक ज्योतिष',
  'Vivah Sanskar': 'विवाह संस्कार',
  'Vastu Shastra': 'वास्तु शास्त्र',
  'Grah Shanti': 'ग्रह शांति',
  'Graha Shanti': 'ग्रह शांति',
  Karmakand: 'कर्मकाण्ड',
  'Maha Yagya': 'महायज्ञ',
  'Ganesh Pujan': 'गणेश पूजन',
  'Vedic Anushthan': 'वैदिक अनुष्ठान',
  'Sundarkand Path': 'सुंदरकांड पाठ',
  'Hanuman Aradhana': 'हनुमान आराधना',
  'Vedic Path': 'वैदिक पाठ',
  Rudrabhishek: 'रुद्राभिषेक',
  'Devi Pooja': 'देवी पूजा',
  'Durga Path': 'दुर्गा पाठ',
  'Maha Abhishek': 'महाभिषेक',
  Jyotish: 'ज्योतिष',
  'Bhajan Sandhya': 'भजन संध्या',
  'Sankalp Seva': 'संकल्प सेवा',
  'Satyanarayan Pooja': 'सत्यनारायण पूजा',
  'Durga Saptashati': 'दुर्गा सप्तशती',
  'Navgrah Poojan': 'नवग्रह पूजन',
  'Pooja Vidhi': 'पूजा विधि',
  Anushthan: 'अनुष्ठान',
};

const CURATED_SHOWCASE: Record<string, PanditData> = {
  'rohit-tiwari': {
    name: 'पंडित रोहित तिवारी (ज्योतिषाचार्य)',
    title: 'Matrimonial Advisor & Astrologer (Founder)',
    titleHi: 'वैवाहिक परामर्शदाता एवं ज्योतिषाचार्य (संस्थापक)',
    experience: '18 Years Seva',
    specialties: ['Matrimonial Advisor', 'Kundli Milan', 'Vedic Astrology', 'Vivah Sanskar'],
    specialtiesHi: ['वैवाहिक परामर्श', 'कुंडली मिलान', 'वैदिक ज्योतिष', 'विवाह संस्कार'],
    languages: ['Hindi', 'Sanskrit', 'English'],
    image: '/images/pandits/pandit-rohit-tiwari.webp',
    bio: 'Founder of Param Darshan and revered Vedic astrologer based in Delhi. Specialized in Parashari Jyotish, authentic Kundli Milan, Vivah Sanskar vidhi, and auspicious matrimonial alignments.',
    bioHi: 'परम दर्शन के संस्थापक तथा दिल्ली स्थित प्रतिष्ठित वैदिक ज्योतिषाचार्य। पाराशरी ज्योतिष, प्रामाणिक कुंडली मिलान, विवाह संस्कार विधि और शुभ वैवाहिक योगों के विशेषज्ञ।',
    temple: 'Delhi Mandir Parampara & Param Darshan Foundation',
    templeHi: 'दिल्ली मंदिर परंपरा एवं परम दर्शन फाउंडेशन',
    followerCount: 1420,
    isCurated: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'संस्थापक एवं मुख्य ज्योतिषाचार्य',
    upcoming: [
      {
        id: 'navgrah-shanti',
        title: 'Navgrah Shanti & Vedic Kundli Remedial Pooja',
        titleHi: 'नवग्रह शांति एवं वैदिक कुंडली निवारण पूजा',
        category: 'Astrology & Kundli',
        time: 'Daily • 07:30 AM IST',
        timeHi: 'प्रतिदिन • प्रातः 07:30 IST',
        isLive: false,
      },
      {
        id: 'vivah-sanskar-muhurat',
        title: 'Vedic Vivah Sanskar & Matrimonial Muhurat Aradhana',
        titleHi: 'वैदिक विवाह संस्कार एवं शुभ मुहूर्त आराधना',
        category: 'Astrology & Kundli',
        time: 'Today • 06:00 PM IST',
        timeHi: 'आज • सायं 06:00 IST',
        isLive: true,
      },
    ],
  },
  'santosh-shastri': {
    name: 'पंडित संतोष कुमार शास्त्री',
    title: 'Jyotish & Vastu Acharya (Co-Founder)',
    titleHi: 'ज्योतिष एवं वास्तु विशेषज्ञ (सह-संस्थापक)',
    experience: '20 Years Seva',
    specialties: ['Vedic Astrology', 'Vastu Shastra', 'Kundli Milan', 'Grah Shanti'],
    specialtiesHi: ['वैदिक ज्योतिष', 'वास्तु शास्त्र', 'कुंडली मिलान', 'ग्रह शांति'],
    languages: ['Hindi', 'Sanskrit'],
    image: '/images/pandits/pandit-santosh-shastri.webp',
    bio: 'Co-Founder of Param Darshan and master of spatial cosmic alignment (Vastu Shastra) and classical Vedic Jyotish. Expert in balancing residential and commercial energies and conducting sacred peace yagyas.',
    bioHi: 'परम दर्शन के सह-संस्थापक तथा वास्तु शास्त्र और शास्त्रीय वैदिक ज्योतिष के प्रकांड विद्वान। आवासीय एवं व्यावसायिक ऊर्जा संतुलन और शांति यज्ञों के विशेषज्ञ।',
    temple: 'Delhi Sanatan Tradition Sanctuary',
    templeHi: 'दिल्ली सनातन परंपरा पीठ',
    followerCount: 1280,
    isCurated: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'सह-संस्थापक एवं वास्तु रत्न',
    upcoming: [
      {
        id: 'vastu-purusha-pujan',
        title: 'Vastu Purusha Pujan & Griha Shanti Hawan',
        titleHi: 'वास्तु पुरुष पूजन एवं गृह शांति हवन',
        category: 'Vastu & Hawan',
        time: 'Daily • 08:00 AM IST',
        timeHi: 'प्रतिदिन • प्रातः 08:00 IST',
        isLive: false,
      },
      {
        id: 'sandhya-aarti',
        title: 'Sandhya Deepotsav & Divine Aarti',
        titleHi: 'संध्या दीपोत्सव एवं दिव्य आरती',
        category: 'Aarti & Darshan',
        time: 'Today • 06:30 PM IST',
        timeHi: 'आज • सायं 06:30 IST',
        isLive: true,
      },
    ],
  },
  'ravi-pathak': {
    name: 'पंडित रवि पाठक',
    title: 'Karmakand Acharya',
    titleHi: 'कर्मकाण्ड विशेषज्ञ',
    experience: '12 Years Seva',
    specialties: ['Karmakand', 'Maha Yagya', 'Ganesh Pujan', 'Vedic Anushthan'],
    specialtiesHi: ['कर्मकाण्ड', 'महायज्ञ', 'गणेश पूजन', 'वैदिक अनुष्ठान'],
    languages: ['Hindi', 'Sanskrit'],
    image: '/images/pandits/pandit-ravi-pathak.webp',
    bio: 'Dedicated Vedic Purohit specializing in classical Karmakand rituals, Ganesh Aradhana, solemn Vedic anushthans, and sacred havan sankalps.',
    bioHi: 'शास्त्रीय कर्मकाण्ड अनुष्ठान, गणेश आराधना, वैदिक अनुष्ठान और पवित्र हवन संकल्प के समर्पित वैदिक पुरोहित।',
    temple: 'Vedic Karmakand Parampara',
    templeHi: 'वैदिक कर्मकाण्ड परंपरा',
    followerCount: 920,
    isCurated: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'कर्मकाण्ड रत्न',
    upcoming: [
      {
        id: 'ganesh-riddhi-siddhi',
        title: 'Ganesh Riddhi-Siddhi Aradhana & Shanti Path',
        titleHi: 'गणेश ऋद्धि-सिद्धि आराधना एवं शांति पाठ',
        category: 'Pooja',
        time: 'Daily • 09:00 AM IST',
        timeHi: 'प्रतिदिन • प्रातः 09:00 IST',
        isLive: false,
      },
      {
        id: 'maha-yagya-anushthan',
        title: 'Maha Yagya & Vedic Karmakand Anushthan',
        titleHi: 'महायज्ञ एवं वैदिक कर्मकाण्ड अनुष्ठान',
        category: 'Havans & Yagyas',
        time: 'Tomorrow • 07:00 AM IST',
        timeHi: 'कल • प्रातः 07:00 IST',
        isLive: false,
      },
    ],
  },
  'nitin-sharma': {
    name: 'पंडित नितिन शर्मा',
    title: 'Karmakand & Sundarkand Specialist',
    titleHi: 'कर्मकाण्ड एवं सुंदरकांड विशेषज्ञ',
    experience: '10 Years Seva',
    specialties: ['Karmakand', 'Sundarkand Path', 'Hanuman Aradhana', 'Vedic Path'],
    specialtiesHi: ['कर्मकाण्ड', 'सुंदरकांड पाठ', 'हनुमान आराधना', 'वैदिक पाठ'],
    languages: ['Hindi', 'Sanskrit'],
    image: '/images/pandits/pandit-nitin-sharma.webp',
    bio: 'Accomplished practitioner of Shukla Yajurveda rituals, renowned for rhythmic Sundarkand path recitations, Hanuman chalisa anushthans, and family shanti pujas.',
    bioHi: 'शुक्ल यजुर्वेद अनुष्ठानों के सिद्ध साधक, मधुर सुंदरकांड पाठ, हनुमान चालीसा अनुष्ठान और पारिवारिक शांति पूजा के लिए प्रसिद्ध।',
    temple: 'Shukla Yajurveda Shanti Parampara',
    templeHi: 'शुक्ल यजुर्वेद शांति परंपरा',
    followerCount: 810,
    isCurated: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'सुंदरकांड रत्न',
    upcoming: [
      {
        id: 'sunderkand-path',
        title: 'Sampoorna Sunderkand Path & Hanuman Chalisa Mahajaap',
        titleHi: 'संपूर्ण सुंदरकांड पाठ एवं हनुमान चालीसा महाजाप',
        category: 'Katha & Path',
        time: 'Today • 05:30 PM IST',
        timeHi: 'आज • सायं 05:30 IST',
        isLive: true,
      },
      {
        id: 'shukla-yajurveda-shanti',
        title: 'Shukla Yajurveda Shanti Anushthan',
        titleHi: 'शुक्ल यजुर्वेद शांति अनुष्ठान',
        category: 'Karmakand',
        time: 'Tomorrow • 08:00 AM IST',
        timeHi: 'कल • प्रातः 08:00 IST',
        isLive: false,
      },
    ],
  },
  'umesh-shastri': {
    name: 'पंडित उमेश शास्त्री',
    title: 'Rudrabhishek & Devi Pooja Acharya',
    titleHi: 'रुद्राभिषेक एवं देवी पूजा विशेषज्ञ',
    experience: '16 Years Seva',
    specialties: ['Rudrabhishek', 'Devi Pooja', 'Durga Path', 'Maha Abhishek'],
    specialtiesHi: ['रुद्राभिषेक', 'देवी पूजा', 'दुर्गा पाठ', 'महाभिषेक'],
    languages: ['Hindi', 'Sanskrit'],
    image: '/images/pandits/pandit-umesh-shastri.webp',
    bio: 'Venerated Acharya of Shiva-Shakti aradhana. Conducts powerful Maha Rudrabhishek with Shukla Yajurveda mantra uccharan, Navratri Durga Saptashati, and Chandi path.',
    bioHi: 'शिव-शक्ति आराधना के श्रद्धेय आचार्य। शुक्ल यजुर्वेद मंत्रोच्चार के साथ महा रुद्राभिषेक, नवरात्रि दुर्गा सप्तशती और चंडी पाठ संपन्न कराते हैं।',
    temple: 'Shiva Shakti Sanctum Parampara',
    templeHi: 'शिव-शक्ति पीठ परंपरा',
    followerCount: 1050,
    isCurated: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'रुद्राभिषेक शिरोमणि',
    upcoming: [
      {
        id: 'rudrabhishek-live',
        title: 'Maha Rudrabhishek & Shiva Sahasranama Aradhana',
        titleHi: 'महा रुद्राभिषेक एवं शिव सहस्रनाम आराधना',
        category: 'Rudrabhishek',
        time: 'Today • 06:00 PM IST',
        timeHi: 'आज • सायं 06:00 IST',
        isLive: true,
      },
      {
        id: 'durga-saptashati-navchandi',
        title: 'Durga Saptashati & Navchandi Mahapooja',
        titleHi: 'दुर्गा सप्तशती एवं नवचंडी महापूजा',
        category: 'Devi Pooja',
        time: 'Tomorrow • 07:30 AM IST',
        timeHi: 'कल • प्रातः 07:30 IST',
        isLive: false,
      },
    ],
  },
  'kuber-tripathi': {
    name: 'आचार्य कुबेर दत्त त्रिपाठी',
    title: 'Jyotish & Karmakand Acharya',
    titleHi: 'ज्योतिष कर्मकाण्ड विशेषज्ञ',
    experience: '14 Years Seva',
    specialties: ['Jyotish', 'Karmakand', 'Bhajan Sandhya', 'Sankalp Seva'],
    specialtiesHi: ['ज्योतिष', 'कर्मकाण्ड', 'भजन संध्या', 'संकल्प सेवा'],
    languages: ['Hindi', 'Sanskrit'],
    image: '/images/pandits/acharya-kuber-tripathi.webp',
    bio: 'Scholar of Sanskrit scriptures and devotional ritual chanting. Consecrates astrological sankalp sevas, devotional bhajan aartis, and planetary remedy ceremonies.',
    bioHi: 'संस्कृत शास्त्रों और भक्तिमय वैदिक मंत्रोच्चार के विद्वान। ज्योतिषीय संकल्प सेवा, भक्ति भजन आरती एवं ग्रह निवारण अनुष्ठान संपन्न कराते हैं।',
    temple: 'Sanatan Jyotish Vidya Peeth',
    templeHi: 'सनातन ज्योतिष विद्या पीठ',
    followerCount: 890,
    isCurated: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'ज्योतिष कर्मकाण्ड भूषण',
    upcoming: [
      {
        id: 'bhajan-sandhya-deepotsav',
        title: 'Devotional Bhajan Sandhya & Deepotsav Aarti',
        titleHi: 'भक्ति भजन संध्या एवं दीपोत्सव आरती',
        category: 'Kirtan & Bhajan',
        time: 'Today • 07:00 PM IST',
        timeHi: 'आज • सायं 07:00 IST',
        isLive: true,
      },
      {
        id: 'jyotish-grah-shanti',
        title: 'Jyotish Grah Shanti & Vedic Muhurat Session',
        titleHi: 'ज्योतिष ग्रह शांति एवं वैदिक मुहूर्त सत्र',
        category: 'Astrology & Kundli',
        time: 'Tomorrow • 08:30 AM IST',
        timeHi: 'कल • प्रातः 08:30 IST',
        isLive: false,
      },
    ],
  },
  'subhash-shastri': {
    name: 'पंडित सुभाष शास्त्री',
    title: 'Satyanarayan Katha, Durga Saptashati, Navgrah & Rudrabhishek Acharya',
    titleHi: 'सत्यनारायण पूजा, दुर्गासप्तशती पाठ, नवग्रह पूजन, रुद्राभिषेक',
    experience: '15 Years Seva',
    specialties: ['Satyanarayan Pooja', 'Durga Saptashati', 'Navgrah Poojan', 'Rudrabhishek'],
    specialtiesHi: ['सत्यनारायण पूजा', 'दुर्गा सप्तशती', 'नवग्रह पूजन', 'रुद्राभिषेक'],
    languages: ['Hindi', 'Sanskrit'],
    image: '/images/pandits/pandit-subhash-shastri.webp',
    bio: 'Expert Vedic Acharya presiding over sacred Satyanarayan Katha, Durga Saptashati recitation, Navgrah dosha shanti poojas, and auspicious home abhishekams.',
    bioHi: 'सत्यनारायण कथा, दुर्गा सप्तशती पाठ, नवग्रह दोष शांति पूजा एवं शुभ गृह अभिषेक संपन्न कराने वाले अनुभवी वैदिक आचार्य।',
    temple: 'Sanatan Dharmarth Vidhi Parampara',
    templeHi: 'सनातन धर्मार्थ विधि परंपरा',
    followerCount: 960,
    isCurated: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'वैदिक विद्वान रत्न',
    upcoming: [
      {
        id: 'satyanarayan-vrat-katha',
        title: 'Sri Satyanarayan Vrat Katha & Purnima Mahapooja',
        titleHi: 'श्री सत्यनारायण व्रत कथा एवं पूर्णिमा महापूजा',
        category: 'Vedic Kathas',
        time: 'Daily • 10:00 AM IST',
        timeHi: 'प्रतिदिन • प्रातः 10:00 IST',
        isLive: false,
      },
      {
        id: 'navgrah-durga-saptashati',
        title: 'Navgrah Poojan & Durga Saptashati Recitation',
        titleHi: 'नवग्रह पूजन एवं दुर्गा सप्तशती पाठ',
        category: 'Pooja & Hawan',
        time: 'Tomorrow • 09:00 AM IST',
        timeHi: 'कल • प्रातः 09:00 IST',
        isLive: false,
      },
    ],
  },
  'sumit-shastri': {
    name: 'पंडित सुमित शास्त्री (कर्मकांड,ज्योतिष)',
    title: 'Karmakand & Jyotish Acharya',
    titleHi: 'कर्मकाण्ड एवं ज्योतिष विशेषज्ञ',
    experience: '11 Years Seva',
    specialties: ['Karmakand', 'Vedic Astrology', 'Pooja Vidhi', 'Kundli Milan'],
    specialtiesHi: ['कर्मकाण्ड', 'वैदिक ज्योतिष', 'पूजा विधि', 'कुंडली मिलान'],
    languages: ['Hindi', 'Sanskrit'],
    image: '/images/pandits/pandit-sumit-shastri.webp',
    bio: 'Vedic scholar and priest specializing in classical Karmakand rituals, solemn Vedic poojas, and astrology consultations.',
    bioHi: 'शास्त्रीय कर्मकाण्ड अनुष्ठान, वैदिक पूजा एवं ज्योतिषीय परामर्श के विशेषज्ञ वैदिक विद्वान।',
    temple: 'Sanatan Karmakand Vidhi Peeth',
    templeHi: 'सनातन कर्मकाण्ड विधि पीठ',
    followerCount: 950,
    isCurated: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'कर्मकांड एवं ज्योतिष विशेषज्ञ',
    upcoming: [
      {
        id: 'vedic-hawan-graha-shanti',
        title: 'Vedic Hawan & Graha Shanti Anushthan',
        titleHi: 'वैदिक हवन एवं ग्रह शांति अनुष्ठान',
        category: 'Pooja & Hawan',
        time: 'Daily • 08:30 AM IST',
        timeHi: 'प्रतिदिन • प्रातः 08:30 IST',
        isLive: false,
      },
    ],
  },
  'nandkishor-tripathi': {
    name: 'पंडित नंदकिशोर त्रिपाठी (कर्मकांड,ज्योतिष)',
    title: 'Karmakand & Jyotish Acharya',
    titleHi: 'कर्मकाण्ड एवं ज्योतिष विशेषज्ञ',
    experience: '13 Years Seva',
    specialties: ['Karmakand', 'Vedic Astrology', 'Graha Shanti', 'Anushthan'],
    specialtiesHi: ['कर्मकाण्ड', 'वैदिक ज्योतिष', 'ग्रह शांति', 'अनुष्ठान'],
    languages: ['Hindi', 'Sanskrit'],
    image: '/images/pandits/pandit-nandkishor-tripathi.webp',
    bio: 'Vedic priest and Astrologer specialized in Shukla Yajurveda rituals, Shanti Hawan, and auspicious astrological guidance.',
    bioHi: 'शुक्ल यजुर्वेद अनुष्ठान, शांति हवन एवं शुभ ज्योतिषीय मार्गदर्शन के विशेषज्ञ वैदिक आचार्य।',
    temple: 'Vedic Shukla Yajurveda Peeth',
    templeHi: 'वैदिक शुक्ल यजुर्वेद पीठ',
    followerCount: 920,
    isCurated: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'कर्मकांड एवं ज्योतिष विशेषज्ञ',
    upcoming: [
      {
        id: 'shukla-yajurveda-shanti-path',
        title: 'Shukla Yajurveda Shanti Path & Mahapooja',
        titleHi: 'शुक्ल यजुर्वेद शांति पाठ एवं महापूजा',
        category: 'Vedic Chanting',
        time: 'Daily • 07:00 AM IST',
        timeHi: 'प्रतिदिन • प्रातः 07:00 IST',
        isLive: false,
      },
    ],
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
  const { lang } = useLang();
  const L = (en: string, hi: string) => (lang === 'hi' ? hi : en);
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
      document.title = `${pandit.name} | ${lang === 'hi' ? 'परम दर्शन' : 'Param Darshan'}`;
    }
  }, [pandit?.name, lang]);

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
            scheduledAt: s.scheduledAt || undefined,
            time: s.scheduledAt ? undefined : 'Live Broadcast',
            timeHi: s.scheduledAt ? undefined : 'सीधा प्रसारण',
            isLive: s.status === 'LIVE',
          }));

          const combinedUpcoming = apiStreams.length > 0 ? apiStreams : (curated?.upcoming || []);

          setPandit({
            id: prof.id,
            name: prof.name || curated?.name || 'Vedic Pandit',
            title: curated?.title || (prof.templeAffiliation ? `${prof.templeAffiliation} Acharya` : 'Verified Vedic Acharya'),
            titleHi: curated?.titleHi || (prof.templeAffiliation ? `${prof.templeAffiliation} आचार्य` : 'सत्यापित वैदिक आचार्य'),
            experience: curated?.experience || (prof.experienceYears ? `${prof.experienceYears} Years Seva` : 'Traditional Lineage'),
            experienceYears: prof.experienceYears || undefined,
            specialties: (prof.specialties && prof.specialties.length > 0) ? prof.specialties : (curated?.specialties || []),
            specialtiesHi: curated?.specialtiesHi,
            languages: (prof.languages && prof.languages.length > 0) ? prof.languages : (curated?.languages || ['Hindi', 'Sanskrit']),
            image: curated?.image || prof.avatarUrl || '/images/pandits/pandit-rohit-tiwari.webp',
            bio: curated?.bio || prof.bio || 'Vedic Acharya consecrated to daily Darshan and sacred Pooja rituals.',
            bioHi: curated?.bioHi || prof.bio || 'दैनिक दर्शन एवं पवित्र वैदिक पूजा अनुष्ठानों के लिए समर्पित वैदिक आचार्य।',
            temple: curated?.temple || prof.templeAffiliation || 'Vedic Tradition Sanctuary',
            templeHi: curated?.templeHi || prof.templeAffiliation || 'वैदिक परंपरा पीठ',
            templeAffiliation: prof.templeAffiliation || undefined,
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
      toast.info(L('This is an introductory lineage showcase. You can follow live pandits directly during their active broadcasts.', 'यह परिचयात्मक परंपरा प्रोफ़ाइल है। आप सक्रिय प्रसारण के दौरान लाइव पंडित जी को सीधे फ़ॉलो कर सकते हैं।'));
      return;
    }

    setFollowingAction(true);
    const nextState = !isFollowing;

    try {
      if (nextState) {
        await apiFetch(`/streamers/${pandit.id}/follow`, { method: 'POST' });
        setIsFollowing(true);
        setFollowerCount((prev) => prev + 1);
        toast.success(L(`You are now following ${pandit.name}!`, `अब आप ${pandit.name} को फ़ॉलो कर रहे हैं!`));
      } else {
        await apiFetch(`/streamers/${pandit.id}/follow`, { method: 'DELETE' });
        setIsFollowing(false);
        setFollowerCount((prev) => Math.max(0, prev - 1));
        toast.info(L(`Unfollowed ${pandit.name}`, `${pandit.name} को अनफ़ॉलो किया गया`));
      }
    } catch (err: any) {
      toast.error(err.message || L('Failed to update follow status', 'फ़ॉलो स्थिति अपडेट नहीं हो सकी'));
    } finally {
      setFollowingAction(false);
    }
  };

  const handleShare = () => {
    if (!pandit) return;
    if (navigator.share) {
      navigator.share({
        title: L(`${pandit.name} - Verified Vedic Pandit on Param Darshan`, `${pandit.name} - परम दर्शन पर सत्यापित वैदिक पंडित`),
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success(L('Pandit Ji profile link copied to clipboard!', 'पंडित जी का प्रोफ़ाइल लिंक कॉपी हो गया!'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian text-foreground py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-gold mb-4" />
        <p className="text-xs text-stone-400">{L('Loading Vedic Acharya Profile...', 'वैदिक आचार्य प्रोफ़ाइल लोड हो रही है...')}</p>
      </div>
    );
  }

  if (notFound || !pandit) {
    return (
      <div className="min-h-screen bg-obsidian text-foreground py-20 max-w-xl mx-auto px-4 text-center">
        <AlertCircle className="w-12 h-12 text-gold mx-auto mb-4" />
        <h1 className="font-serif text-2xl font-bold text-white mb-2">{L('Pandit Ji Profile Not Found', 'पंडित जी की प्रोफ़ाइल नहीं मिली')}</h1>
        <p className="text-xs text-stone-400 mb-6">
          {L('The requested Pandit Ji profile ID does not exist or has not yet completed verification.', 'अनुरोधित पंडित जी प्रोफ़ाइल मौजूद नहीं है या अभी तक सत्यापन पूरा नहीं हुआ है।')}
        </p>
        <Link
          href="/#pandits"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold transition shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{L('Return to Verified Pandits', 'सत्यापित पंडितों पर लौटें')}</span>
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
  const displayTitle = lang === 'hi' && pandit.titleHi ? pandit.titleHi : pandit.title;
  const displayBio = lang === 'hi' && pandit.bioHi ? pandit.bioHi : pandit.bio;
  const displayTemple = lang === 'hi' && pandit.templeHi ? pandit.templeHi : pandit.temple;
  const displayExperience =
    pandit.experience === 'Traditional Lineage'
      ? L('Traditional Lineage', 'पारंपरिक परंपरा')
      : formatExperienceLabel(pandit.experience, lang);
  const displaySpecialties =
    lang === 'hi'
      ? (pandit.specialtiesHi && pandit.specialtiesHi.length === pandit.specialties.length
          ? pandit.specialtiesHi
          : pandit.specialties.map((s) => SPECIALTY_HI[s] || s))
      : pandit.specialties;

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
          <span>{L('Back to Verified Pandits', 'सत्यापित पंडितों पर वापस जाएँ')}</span>
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
                  <VerifiedPanditBadge size={14} /> {L('KYC Verified Pandit Ji', 'KYC सत्यापित पंडित जी')}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-900 border border-stone-800 text-stone-300">
                  <Sparkles className="w-3 h-3 text-gold" /> {displayExperience}
                </span>
              </div>

              <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white tracking-tight">
                {pandit.name}
              </h1>
              <p className="text-xs sm:text-sm text-gold-pale font-medium">{displayTitle}</p>
              <p className="text-xs text-stone-400">{displayTemple}</p>

              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed pt-2">
                {displayBio}
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
                    {isFollowing ? L('Following', 'फ़ॉलो कर रहे हैं') : L('Follow Pandit Ji', 'पंडित जी को फ़ॉलो करें')} ({followerCount.toLocaleString('en-IN')})
                  </span>
                </button>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-obsidian border border-gold/20 hover:bg-stone-900 text-stone-300 text-xs font-semibold transition"
                >
                  <Share2 className="w-3.5 h-3.5 text-gold-soft" />
                  <span>{L('Share Profile', 'प्रोफ़ाइल साझा करें')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Specialties & Languages */}
          <div className="mt-8 pt-6 border-t border-gold/15 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-bold text-gold uppercase tracking-wider block mb-2">{L('Sacred Ritual Specialties', 'विशेष वैदिक अनुष्ठान')}</span>
              <div className="flex flex-wrap gap-1.5">
                {displaySpecialties.length > 0 ? (
                  displaySpecialties.map((s: string) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-lg bg-obsidian border border-gold/15 text-stone-200"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-stone-600 dark:text-stone-400 italic">{L('Vedic Pooja & Hawan', 'वैदिक पूजा एवं हवन')}</span>
                )}
              </div>
            </div>

            <div>
              <span className="font-bold text-gold uppercase tracking-wider block mb-2">{L('Languages Spoken', 'बोलचाल की भाषाएँ')}</span>
              <div className="flex flex-wrap gap-1.5">
                {pandit.languages.map((l: string) => (
                  <span
                    key={l}
                    className="px-2.5 py-1 rounded-lg bg-obsidian border border-gold/15 text-stone-200"
                  >
                    {lang === 'hi' ? LANGUAGE_HI[l] || l : l}
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
            <span>{L('Sacred Broadcasts & Ceremonies', 'पवित्र प्रसारण एवं अनुष्ठान')}</span>
          </h2>

          {pandit.upcoming.length === 0 ? (
            <div className="p-8 rounded-2xl bg-obsidian-soft border border-gold/15 text-center text-stone-400 text-xs">
              {L('No live ceremonies currently scheduled for today. Follow this Pandit Ji to receive notifications when a live broadcast begins.', 'आज के लिए कोई लाइव अनुष्ठान निर्धारित नहीं है। जब सीधा प्रसारण शुरू हो तो सूचना पाने के लिए पंडित जी को फ़ॉलो करें।')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pandit.upcoming.map((u: any) => {
                const uTitle = lang === 'hi' && u.titleHi ? u.titleHi : u.title;
                const uTime = u.scheduledAt
                  ? formatLocaleDateTime(u.scheduledAt, lang, 'Live Broadcast', 'सीधा प्रसारण')
                  : (lang === 'hi' && u.timeHi ? u.timeHi : u.time);
                return (
                <div
                  key={u.id}
                  className="p-5 rounded-2xl bg-obsidian-soft border border-gold/20 shadow-lg flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] uppercase font-bold text-gold-soft bg-gold/10 px-2 py-0.5 rounded">
                        {translateCategoryLabel(u.category, lang)}
                      </span>
                      {u.isLive && (
                        <span className="text-[10px] font-bold text-red-400 flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {L('LIVE NOW', 'अभी लाइव')}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">{uTitle}</h3>
                    <p className="text-xs text-stone-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-gold-soft" />
                      <span>{uTime}</span>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gold/10">
                    <Link
                      href={`/stream/${u.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gold hover:bg-gold-deep text-obsidian text-xs font-bold rounded-full transition shadow-md"
                    >
                      <span>{L('Join Live Darshan', 'लाइव दर्शन में जुड़ें')}</span>
                    </Link>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Book Personalized Pooja Section */}
        <div className="space-y-6 pt-6 mt-8 border-t border-gold/15">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold/10 border border-gold/25 text-[10px] font-bold text-gold-soft uppercase tracking-wider mb-1.5">
                <Sparkles className="w-3 h-3 text-gold" /> {L('Personalized Sankalp Sevas', 'व्यक्तिगत संकल्प सेवाएँ')}
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <span>{L('Book Personalized Pooja with this Pandit Ji', 'इस पंडित जी के साथ व्यक्तिगत पूजा बुक करें')}</span>
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                {L('Conducted with authentic Gotra chanting and family Sankalp via private interactive darshan.', 'निजी लाइव दर्शन के माध्यम से प्रामाणिक गोत्र उच्चारण एवं पारिवारिक संकल्प सहित संपन्न।')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {specializedPoojas.map((pooja) => {
              const loc = getLocalizedPooja(pooja, lang);
              const dakshinaCoins = getPanditDakshinaForPooja(panditPricing, pooja);
              return (
                <div
                  key={pooja.id}
                  className="rounded-2xl bg-obsidian-soft border border-gold/20 hover:border-gold/50 p-5 shadow-lg flex flex-col justify-between gap-4 transition group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded">
                        {loc.category}
                      </span>
                      <span className="text-[11px] text-stone-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gold-soft" />
                        {loc.duration}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-serif text-base sm:text-lg font-bold text-white group-hover:text-amber-200 transition">
                        {loc.displayName}
                      </h3>
                      {loc.secondaryName && (
                        <p className="text-xs text-gold-soft font-serif font-medium mt-0.5">
                          {loc.secondaryName}
                        </p>
                      )}
                    </div>

                    <p className="text-xs text-stone-300 leading-relaxed">
                      {loc.description}
                    </p>

                    <div className="pt-1 flex items-center gap-1.5 text-[11px] text-stone-400">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{loc.mantraTradition}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gold/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
                        <CoinIcon size={14} />
                      </div>
                      <div>
                        <div className="text-sm font-black text-amber-200">
                          {formatCoins(dakshinaCoins, lang)}
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
                      <span>{L('Book Pooja (संकल्प लें)', 'पूजा बुक करें (संकल्प लें)')}</span>
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
        title={L('Sign In to Follow Pandit Ji', 'पंडित जी को फ़ॉलो करने के लिए लॉगिन करें')}
        description={L('Please sign in to follow verified Pandit Jis and receive email notifications when their live darshans begin.', 'सत्यापित पंडित जी को फ़ॉलो करने और लाइव दर्शन शुरू होने पर ईमेल सूचना पाने के लिए कृपया साइन इन करें।')}
        confirmLabel={L('Sign In', 'लॉगिन करें')}
        cancelLabel={L('Not Now', 'अभी नहीं')}
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
