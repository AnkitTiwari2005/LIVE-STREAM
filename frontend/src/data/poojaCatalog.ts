export interface PoojaItem {
  id: string;
  name: string;
  hindiName?: string;
  category: 'Shiva & Rudra' | 'Astrology & Kundli' | 'Vedic Kathas' | 'Havans & Yagyas' | 'Samskaras & Family' | 'Dosha Remedies';
  duration: string;
  description: string;
  significance: string;
  samagriIncluded: boolean;
  baseDakshina: number; // in coins
  tag: string;
  mantraTradition: string;
}

export interface PanditPricing {
  panditId: string;
  name: string;
  title: string;
  lineage: string;
  experience: string;
  rating: string;
  reviewsCount: string;
  avatar: string;
  specialties: string[];
  dakshinaCoins: number; // custom price for this pooja
  isAvailableToday: boolean;
  hasSpecialBadge?: boolean;
  specialBadgeTitle?: string;
}

export const COMPREHENSIVE_POOJA_CATALOG: PoojaItem[] = [
  // 1. Shiva & Rudra Sevas
  {
    id: 'rudrabhishek',
    name: 'Maha Rudrabhishek & Swasti Vachan',
    hindiName: 'महा रुद्राभिषेक एवं स्वस्तिवाचन',
    category: 'Shiva & Rudra',
    duration: '45 mins',
    description: 'Panchamrit Abhishekam with resonant Rudra Sukta recitation invoking Bhagwan Shiva for removal of suffering and deep family peace.',
    significance: 'Dispels negative energies, restores physical health, and grants supreme mental serenity.',
    samagriIncluded: true,
    baseDakshina: 150,
    tag: 'Sacred Ritual',
    mantraTradition: 'Shukla Yajurveda Rudrashtadhyayi',
  },
  {
    id: 'mahamrityunjaya',
    name: 'Mahamrityunjaya Jaap & Healing Path',
    hindiName: 'महामृत्युंजय महाजाप अनुष्ठान',
    category: 'Shiva & Rudra',
    duration: '50 mins',
    description: 'Potent 108/1008 Vedic mantra chanting dedicated to Tryambakam for recovery from severe illness, vitality, and longevity.',
    significance: 'Protective shield against untimely distress, chronic ailments, and ancestral karmic blocks.',
    samagriIncluded: true,
    baseDakshina: 150,
    tag: 'Healing Mantra',
    mantraTradition: 'Rigvedic Moola Mantra',
  },
  {
    id: 'laghurudra',
    name: 'Laghurudra Abhishek & Bilva Archana',
    hindiName: 'लघुरुद्र अभिषेक एवं बिल्वार्चन',
    category: 'Shiva & Rudra',
    duration: '60 mins',
    description: 'Eleven intense recitations of Sri Rudram with 108 sanctified Bilva Patra offerings and Gangajal abhishekam.',
    significance: 'Bestows spiritual elevation, prosperity, and removes persistent hurdles in life.',
    samagriIncluded: true,
    baseDakshina: 200,
    tag: 'Intense Seva',
    mantraTradition: 'Krishna Yajurveda Taittiriya Samhita',
  },
  {
    id: 'somwar_vrat',
    name: 'Somwar Vrat Udyapan & Shiva Aarti',
    hindiName: 'सोमवार व्रत उद्यापन',
    category: 'Shiva & Rudra',
    duration: '40 mins',
    description: 'Traditional completion ritual for Solah Somwar or Pradosh fasting with consecrated Naivedyam offerings.',
    significance: 'Fulfills cherished family wishes, harmonious matrimony, and spiritual merit.',
    samagriIncluded: true,
    baseDakshina: 120,
    tag: 'Vrat Udyapan',
    mantraTradition: 'Puranic Shiva Samhita',
  },

  // 2. Astrology & Kundli Consultations
  {
    id: 'kundli_matching',
    name: 'Personal Vedic Kundli Matching & Horoscope Analysis',
    hindiName: 'वैदिक कुंडली मिलान एवं जन्मपत्रिका विश्लेषण',
    category: 'Astrology & Kundli',
    duration: '35 mins',
    description: '1-on-1 private live chart consultation: Ashtakoot Guna Milan, Mangal Dosh analysis, and comprehensive compatibility scoring.',
    significance: 'Ensures marital harmony, emotional bonding, and long-term family peace before marriage.',
    samagriIncluded: false,
    baseDakshina: 100,
    tag: '1-on-1 Jyotish',
    mantraTradition: 'Brihat Parashara Hora Shastra',
  },
  {
    id: 'dasha_remedies',
    name: 'Mahadasha & Antardasha Vedic Remedies Consultation',
    hindiName: 'दशा अंतर्दशा एवं ग्रह उपाय परामर्श',
    category: 'Astrology & Kundli',
    duration: '30 mins',
    description: 'Detailed birth-chart examination of current planetary periods with tailored gemstone, mantra, and daan recommendations.',
    significance: 'Navigates challenging career, financial, or legal phases with authentic Vedic guidance.',
    samagriIncluded: false,
    baseDakshina: 100,
    tag: 'Career & Life',
    mantraTradition: 'Jaimini & Parashari Sutras',
  },
  {
    id: 'navgrah',
    name: 'Navgrah Shanti & Dosh Nivaran Pooja',
    hindiName: 'नवग्रह शांति एवं दोष निवारण पूजा',
    category: 'Astrology & Kundli',
    duration: '45 mins',
    description: 'Consecrated oblations to harmonize all 9 cosmic celestial bodies (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu).',
    significance: 'Neutralizes negative planetary transits (Gochara), stabilizes health, and invites good fortune.',
    samagriIncluded: true,
    baseDakshina: 125,
    tag: 'Planetary Shanti',
    mantraTradition: 'Vedic Navgrah Suktam',
  },
  {
    id: 'shani_sade_sati',
    name: 'Shani Sade Sati & Dhaiya Shanti Pooja',
    hindiName: 'शनि साढ़े साती एवं ढैय्या शांति पूजा',
    category: 'Astrology & Kundli',
    duration: '45 mins',
    description: 'Specialized Saturn pacification ritual with sesame seed oil lamp lighting, blue flower offerings, and Shani Stotra recitation.',
    significance: 'Alleviates mental stress, sudden delays in ventures, and protects against career setbacks.',
    samagriIncluded: true,
    baseDakshina: 130,
    tag: 'Shani Shanti',
    mantraTradition: 'Dasharatha Shani Stotram & Vedic Mantras',
  },
  {
    id: 'janma_nakshatra',
    name: 'Janma Nakshatra Shanti & Ayushya Havan',
    hindiName: 'जन्म नक्षत्र शांति एवं आयुष्य हवन',
    category: 'Astrology & Kundli',
    duration: '50 mins',
    description: 'Propitiation of your birth star deity with 108 Ahutis of sacred herbs to invigorate vital life force (Prana).',
    significance: 'Fortifies inner confidence, intellect, and physical immunity.',
    samagriIncluded: true,
    baseDakshina: 140,
    tag: 'Nakshatra Seva',
    mantraTradition: 'Taittiriya Brahmana Nakshatra Suktam',
  },

  // 3. Vedic Kathas & Discourses
  {
    id: 'satyanarayan_katha',
    name: 'Shri Satyanarayan Maha Katha & Hawan',
    hindiName: 'श्री सत्यनारायण महाकथा एवं हवन',
    category: 'Vedic Kathas',
    duration: '60 mins',
    description: 'Complete recital of the 5 sacred chapters of Bhagwan Vishnu’s glory with panchamrit, banana prasad, and concluding hawan.',
    significance: 'Brings immense auspiciousness on Purnima, birthdays, housewarmings, or milestones.',
    samagriIncluded: true,
    baseDakshina: 125,
    tag: 'Family Blessing',
    mantraTradition: 'Skanda Purana Reva Khanda',
  },
  {
    id: 'sundarkand',
    name: 'Sampoorna Sundarkand Path & Hanuman Aarti',
    hindiName: 'संपूर्ण सुंदरकांड पाठ एवं हनुमान आरती',
    category: 'Vedic Kathas',
    duration: '75 mins',
    description: 'Resonant musical recitation of Goswami Tulsidas’s Sundarkand invoking Bajrangbali for courage and victory over hurdles.',
    significance: 'Removes deep fears, negative planetary shadows, and bestows boundless self-confidence.',
    samagriIncluded: true,
    baseDakshina: 140,
    tag: 'Hanuman Seva',
    mantraTradition: 'Ramcharitmanas Sundarkand',
  },
  {
    id: 'bhagwat_geeta_path',
    name: 'Shrimad Bhagavad Gita Mahatmya & Sankalp Path',
    hindiName: 'श्रीमद्भगवद्गीता माहात्म्य एवं संकल्प पाठ',
    category: 'Vedic Kathas',
    duration: '45 mins',
    description: 'Recitation of pivotal Gita chapters (Chapter 12 Bhakti Yoga & Chapter 15 Purushottama Yoga) with philosophical commentary.',
    significance: 'Grants clarity of duty, inner peace, and divine spiritual wisdom in difficult life decisions.',
    samagriIncluded: false,
    baseDakshina: 110,
    tag: 'Vedic Wisdom',
    mantraTradition: 'Mahabharata Bhishma Parva',
  },
  {
    id: 'ramayan_chopai',
    name: 'Akhand Ramayan Samput Path & Swasti Chanting',
    hindiName: 'रामायण सम्पुट पाठ एवं स्वस्ति मन्त्र',
    category: 'Vedic Kathas',
    duration: '60 mins',
    description: 'Chanting of sacred Ramcharitmanas Chaupais tailored with special gotra samput for family unity and prosperity.',
    significance: 'Strengthens family harmony, eradicates domestic quarrels, and invokes Prabhu Sri Ram’s blessings.',
    samagriIncluded: true,
    baseDakshina: 135,
    tag: 'Family Peace',
    mantraTradition: 'Awadhi Vedic Sanatan Recital',
  },

  // 4. Havans & Yagyas
  {
    id: 'griha_pravesh_vastu',
    name: 'Griha Pravesh & Vastu Swasti Havan',
    hindiName: 'गृह प्रवेश एवं वास्तु स्वस्ति हवन',
    category: 'Havans & Yagyas',
    duration: '60 mins',
    description: 'Comprehensive consecration of residential or commercial properties to harmonize directional energies (Dishashul).',
    significance: 'Purges residual stale energies and blesses the household with abundance, health, and peace.',
    samagriIncluded: true,
    baseDakshina: 200,
    tag: 'Vastu Consecration',
    mantraTradition: 'Vastu Shastra & Matsya Purana Vidhi',
  },
  {
    id: 'chandi_havan',
    name: 'Maha Chandi Navarna Havan & Durga Saptashati Path',
    hindiName: 'महा चण्डी नवाक्षर हवन एवं दुर्गा सप्तशती',
    category: 'Havans & Yagyas',
    duration: '75 mins',
    description: 'Powerful Devi invocation with offerings of sacred lotus seeds, camphor, guggul, and Durga Saptashati samput.',
    significance: 'Supreme protection from hostile adversaries, mysterious delays, and business obstacles.',
    samagriIncluded: true,
    baseDakshina: 250,
    tag: 'Devi Shakti',
    mantraTradition: 'Markandeya Purana Chandi Vidhana',
  },
  {
    id: 'gayatri_yagya',
    name: 'Savitru Gayatri Maha Yagya (108 Ahutis)',
    hindiName: 'सविर्तृ गायत्री महायज्ञ (१०८ आहुति)',
    category: 'Havans & Yagyas',
    duration: '50 mins',
    description: 'Purificatory solar fire ritual chanting the divine Rigvedic Gayatri mantra with consecrated cow ghee and samidha.',
    significance: 'Heightens memory, sharpens intellect for students, and purifies spiritual aura.',
    samagriIncluded: true,
    baseDakshina: 140,
    tag: 'Intellect & Aura',
    mantraTradition: 'Rigveda Mandala 3 Sukta 62',
  },
  {
    id: 'lakshmi_kuber_havan',
    name: 'Shri Lakshmi Kuber Dhan Prapti Havan',
    hindiName: 'श्री लक्ष्मी कुबेर धन प्राप्ति हवन',
    category: 'Havans & Yagyas',
    duration: '55 mins',
    description: 'Recitation of Sri Suktam and Kanakadhara Stotram with sacred bilva fruit and honey offerings into consecrated agni.',
    significance: 'Attracts financial stability, removes debt distress, and invites Mahalakshmi into commercial enterprises.',
    samagriIncluded: true,
    baseDakshina: 175,
    tag: 'Prosperity Seva',
    mantraTradition: 'Rigvedic Sri Suktam',
  },

  // 5. Samskaras & Family Seva
  {
    id: 'family_sankalp',
    name: 'Personalized Family Gotra Sankalp & Chanting',
    hindiName: 'पारिवारिक गोत्र संकल्प एवं स्वस्तिवाचन',
    category: 'Samskaras & Family',
    duration: '30 mins',
    description: 'Direct invocation of your ancestral gotra, pravara, and immediate family members during the auspicious live temple darshan.',
    significance: 'Connects modern family lineages with timeless Vedic blessings regardless of physical location.',
    samagriIncluded: false,
    baseDakshina: 75,
    tag: 'Gotra Chanting',
    mantraTradition: 'Vedic Sankalp Vidhi',
  },
  {
    id: 'namkaran_sanskar',
    name: 'Vedic Namkaran (Child Naming) Ceremony',
    hindiName: 'वैदिक नामकरण संस्कार',
    category: 'Samskaras & Family',
    duration: '45 mins',
    description: 'Auspicious Vedic naming ritual based on the newborn’s Janma Nakshatra Pada, followed by Ayushya Suktam chanting.',
    significance: 'Bestows righteous character, longevity, and removes birth-moment inauspiciousness.',
    samagriIncluded: true,
    baseDakshina: 150,
    tag: 'Samskara',
    mantraTradition: 'Grihya Sutras Sanskara Vidhi',
  },
  {
    id: 'vivah_varshikotsav',
    name: 'Vivah Varshikotsav (Marriage Anniversary) Pooja',
    hindiName: 'विवाह वार्षिकोत्सव दम्पत्ति स्वस्ति पूजा',
    category: 'Samskaras & Family',
    duration: '40 mins',
    description: 'Sacred Gauri-Shankar and Lakshmi-Narayan invocation for husband and wife to rejuvenate their marital vows.',
    significance: 'Deepens mutual affection, dispels marital misunderstandings, and guarantees familial unity.',
    samagriIncluded: true,
    baseDakshina: 125,
    tag: 'Marital Bliss',
    mantraTradition: 'Puranic Dampatti Ashirwad',
  },
  {
    id: 'pitru_tarpana',
    name: 'Amavasya Pitru Tarpana & Tila Havan',
    hindiName: 'अमावस्या पितृ तर्पण एवं तिल हवन',
    category: 'Samskaras & Family',
    duration: '45 mins',
    description: 'Solemn offering of black sesame seeds, kusha grass, and sacred water dedicated to departed ancestors.',
    significance: 'Pleases departed ancestors, dissolves Pitru Dosha, and brings blessings to children.',
    samagriIncluded: true,
    baseDakshina: 130,
    tag: 'Pitru Seva',
    mantraTradition: 'Garuda Purana & Shraddha Kalpa',
  },

  // 6. Dosha Remedies
  {
    id: 'kaal_sarp_dosh',
    name: 'Kaal Sarp Dosh Nivaran & Nag Pooja',
    hindiName: 'कालसर्प दोष निवारण एवं नाग पूजा',
    category: 'Dosha Remedies',
    duration: '50 mins',
    description: 'Propitiation of Ashta-Nagas (Ananta, Vasuki, Shesha, etc.) to nullify the Rahu-Ketu planetary entrapment.',
    significance: 'Unlocks blocked opportunities, mitigates recurring nightmares, and restores career upward mobility.',
    samagriIncluded: true,
    baseDakshina: 160,
    tag: 'Dosha Nivaran',
    mantraTradition: 'Nag Gayatri & Puranic Vidhi',
  },
  {
    id: 'mangal_dosh_shanti',
    name: 'Bhauma Mangal Dosh Shanti & Angaraka Stotra Path',
    hindiName: 'भौम मंगल दोष शांति एवं अंगारक स्तोत्र',
    category: 'Dosha Remedies',
    duration: '40 mins',
    description: 'Pacification of aggressive Mars influences located in the 1st, 4th, 7th, 8th, or 12th houses of marriage charts.',
    significance: 'Clears marriage delays and mitigates domestic temperamental conflicts.',
    samagriIncluded: true,
    baseDakshina: 135,
    tag: 'Manglik Shanti',
    mantraTradition: 'Rishi Mandavya Mangal Stotram',
  },
  {
    id: 'rahu_ketu_peeda',
    name: 'Rahu-Ketu Peeda Shanti & Sarpa Gayatri Jaap',
    hindiName: 'राहु-केतु पीड़ा शांति एवं सर्प गायत्री जाप',
    category: 'Dosha Remedies',
    duration: '45 mins',
    description: 'Consecrated oblations with mustard seeds, black sesame, and Kusha grass to soothe sudden karmic storms.',
    significance: 'Dispels irrational anxiety, phobias, and deceptive relationships.',
    samagriIncluded: true,
    baseDakshina: 140,
    tag: 'Shadow Planets',
    mantraTradition: 'Vedic Rahu-Ketu Suktam',
  },
];

export const PANDIT_PRICING_CATALOG: PanditPricing[] = [
  {
    panditId: '73b080c9-8bfb-41e6-8c5a-dba40c9409c5', // Backward compatibility for saved bookings
    name: 'पंडित रोहित तिवारी (ज्योतिषाचार्य)',
    title: 'Matrimonial advisor & Astrologer (Founder)',
    lineage: 'Parashari Vedic Parampara & Jyotish Visharad, Delhi',
    experience: '18 Years Seva',
    rating: '4.98',
    reviewsCount: '1,420',
    avatar: '/images/pandits/pandit-rohit-tiwari.webp',
    specialties: ['Matrimonial Advisor', 'Kundli Milan', 'Vedic Astrology', 'Vivah Sanskar'],
    dakshinaCoins: 160,
    isAvailableToday: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'संस्थापक एवं मुख्य ज्योतिषाचार्य',
  },
  {
    panditId: '8cfb4f7f-f337-4475-8885-d0d91ae0939e',
    name: 'पंडित संतोष कुमार शास्त्री',
    title: 'ज्योतिष एवं वास्तु विशेषज्ञ (Co-Founder)',
    lineage: 'Vedic Vastu & Jyotish Parampara, Delhi',
    experience: '20 Years Seva',
    rating: '4.96',
    reviewsCount: '1,280',
    avatar: '/images/pandits/pandit-santosh-shastri.webp',
    specialties: ['Vedic Astrology', 'Vastu Shastra', 'Kundli Milan', 'Grah Shanti'],
    dakshinaCoins: 150,
    isAvailableToday: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'सह-संस्थापक एवं वास्तु रत्न',
  },
  {
    panditId: 'pandit_ravi_pathak',
    name: 'पंडित रवि पाठक',
    title: 'कर्मकाण्ड विशेषज्ञ',
    lineage: 'Vedic Karmakand & Anushthan Parampara',
    experience: '12 Years Seva',
    rating: '4.94',
    reviewsCount: '920',
    avatar: '/images/pandits/pandit-ravi-pathak.webp',
    specialties: ['Karmakand', 'Maha Yagya', 'Ganesh Pujan', 'Vedic Anushthan'],
    dakshinaCoins: 130,
    isAvailableToday: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'कर्मकाण्ड रत्न',
  },
  {
    panditId: 'pandit_nitin_sharma',
    name: 'पंडित नितिन शर्मा',
    title: 'कर्मकाण्ड, सुंदरकांड विशेषज्ञ',
    lineage: 'Shukla Yajurveda & Sunderkand Parampara',
    experience: '10 Years Seva',
    rating: '4.92',
    reviewsCount: '810',
    avatar: '/images/pandits/pandit-nitin-sharma.webp',
    specialties: ['Karmakand', 'Sundarkand Path', 'Hanuman Aradhana', 'Vedic Path'],
    dakshinaCoins: 125,
    isAvailableToday: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'सुंदरकांड रत्न',
  },
  {
    panditId: 'pandit_umesh_shastri',
    name: 'पंडित उमेश शास्त्री',
    title: 'रुद्राभिषेक एवं देवी पूजा',
    lineage: 'Shiva-Shakti Aradhana & Dashashwamedh Parampara',
    experience: '16 Years Seva',
    rating: '4.95',
    reviewsCount: '1,050',
    avatar: '/images/pandits/pandit-umesh-shastri.webp',
    specialties: ['Rudrabhishek', 'Devi Pooja', 'Durga Path', 'Maha Abhishek'],
    dakshinaCoins: 145,
    isAvailableToday: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'रुद्राभिषेक शिरोमणि',
  },
  {
    panditId: 'acharya_kuber_tripathi',
    name: 'आचार्य कुबेर दत्त त्रिपाठी',
    title: 'ज्योतिष कर्मकाण्ड विशेषज्ञ',
    lineage: 'Sanskrit Vishwavidyalaya & Jyotish Acharya',
    experience: '14 Years Seva',
    rating: '4.93',
    reviewsCount: '890',
    avatar: '/images/pandits/acharya-kuber-tripathi.webp',
    specialties: ['Jyotish', 'Karmakand', 'Bhajan Sandhya', 'Sankalp Seva'],
    dakshinaCoins: 135,
    isAvailableToday: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'ज्योतिष कर्मकाण्ड भूषण',
  },
  {
    panditId: 'pandit_subhash_shastri',
    name: 'पंडित सुभाष शास्त्री',
    title: 'सत्य नारायण पूजा, दुर्गासप्तशती पाठ, नवग्रहपूजन, रुद्राभिषेक',
    lineage: 'Sanatan Vedic Dharmarth Vidhi Parampara',
    experience: '15 Years Seva',
    rating: '4.94',
    reviewsCount: '960',
    avatar: '/images/pandits/pandit-subhash-shastri.webp',
    specialties: ['Satyanarayan Pooja', 'Durga Saptashati', 'Navgrah Poojan', 'Rudrabhishek'],
    dakshinaCoins: 140,
    isAvailableToday: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'वैदिक विद्वान रत्न',
  },
  {
    panditId: 'pandit_sumit_shastri',
    name: 'पंडित सुमित शास्त्री (कर्मकांड,ज्योतिष)',
    title: 'कर्मकांड एवं ज्योतिष विशेषज्ञ',
    lineage: 'Vedic Karmakand & Jyotish Parampara',
    experience: '11 Years Seva',
    rating: '4.93',
    reviewsCount: '870',
    avatar: '/images/pandits/pandit-sumit-shastri.webp',
    specialties: ['Karmakand', 'Vedic Astrology', 'Pooja Vidhi', 'Kundli Milan'],
    dakshinaCoins: 135,
    isAvailableToday: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'कर्मकांड एवं ज्योतिष विशेषज्ञ',
  },
  {
    panditId: 'pandit_nandkishor_tripathi',
    name: 'पंडित नंदकिशोर त्रिपाठी (कर्मकांड,ज्योतिष)',
    title: 'कर्मकांड एवं ज्योतिष विशेषज्ञ',
    lineage: 'Shukla Yajurveda & Jyotish Parampara',
    experience: '13 Years Seva',
    rating: '4.92',
    reviewsCount: '890',
    avatar: '/images/pandits/pandit-nandkishor-tripathi.webp',
    specialties: ['Karmakand', 'Vedic Astrology', 'Graha Shanti', 'Anushthan'],
    dakshinaCoins: 135,
    isAvailableToday: true,
    hasSpecialBadge: true,
    specialBadgeTitle: 'कर्मकांड एवं ज्योतिष विशेषज्ञ',
  },
];

/**
 * Calculates a Pandit's specific dakshina for a chosen pooja
 * based on base pooja complexity and pandit seniority.
 */
export function getPanditDakshinaForPooja(pandit: PanditPricing, pooja: PoojaItem): number {
  const base = pooja.baseDakshina;
  if (pandit.name.includes('रोहित तिवारी') || pandit.name.includes('Rohit Tiwari')) {
    return Math.round(base * 1.15); // Founder & Senior Astrologer
  }
  if (pandit.name.includes('संतोष कुमार शास्त्री') || pandit.name.includes('Santosh Kumar Shastri')) {
    return Math.round(base * 1.12); // Co-Founder & Vastu Specialist
  }
  if (pandit.name.includes('उमेश शास्त्री') || pandit.name.includes('Umesh Shastri')) {
    return Math.round(base * 1.08);
  }
  if (pandit.name.includes('सुभाष शास्त्री') || pandit.name.includes('Subhash Shastri')) {
    return Math.round(base * 1.05);
  }
  return base;
}

export const POOJA_HI: Record<
  string,
  {
    duration: string;
    description: string;
    significance: string;
    tag: string;
    mantraTradition: string;
  }
> = {
  rudrabhishek: {
    duration: '45 मिनट',
    tag: 'पवित्र अनुष्ठान',
    mantraTradition: 'शुक्ल यजुर्वेद रुद्राष्टाध्यायी',
    description: 'कष्ट निवारण और पारिवारिक शांति के लिए भगवान शिव के रुद्र सूक्त पाठ के साथ पंचामृत अभिषेक।',
    significance: 'नकारात्मक ऊर्जा दूर करता है, शारीरिक स्वास्थ्य सुधारता है और गहरी मानसिक शांति देता है।',
  },
  mahamrityunjaya: {
    duration: '50 मिनट',
    tag: 'आरोग्य मंत्र',
    mantraTradition: 'ऋग्वैदिक मूल मंत्र',
    description: 'गंभीर रोग से स्वास्थ्य लाभ, जीवन शक्ति और दीर्घायु के लिए त्र्यंबकं महामृत्युंजय मंत्र का 108/1008 वैदिक जप।',
    significance: 'असमय संकट, पुराने रोगों और पूर्व कर्म बाधाओं से रक्षा कवच प्रदान करता है।',
  },
  laghurudra: {
    duration: '60 मिनट',
    tag: 'विशेष सेवा',
    mantraTradition: 'कृष्ण यजुर्वेद तैत्तिरीय संहिता',
    description: '108 पवित्र बिल्वपत्र और गंगाजल अभिषेक के साथ श्री रुद्रम् के ग्यारह आवर्तन का विशेष अनुष्ठान।',
    significance: 'आध्यात्मिक उन्नति, समृद्धि और जीवन की कठिन बाधाओं का निवारण करता है।',
  },
  somwar_vrat: {
    duration: '40 मिनट',
    tag: 'व्रत उद्यापन',
    mantraTradition: 'पौराणिक शिव संहिता',
    description: 'सोलह सोमवार या प्रदोष व्रत के पूर्ण होने पर पवित्र नैवेद्य अर्पण के साथ पारंपरिक उद्यापन अनुष्ठान।',
    significance: 'मनोकामना पूर्ति, सुखद दांपत्य जीवन और आध्यात्मिक पुण्य प्रदान करता है।',
  },
  kundli_matching: {
    duration: '35 मिनट',
    tag: '1-ऑन-1 ज्योतिष',
    mantraTradition: 'बृहत्पाराशर होरा शास्त्र',
    description: '1-ऑन-1 निजी लाइव कुंडली परामर्श: अष्टकूट गुण मिलान, मंगल दोष विश्लेषण और विवाह अनुकूलता मूल्यांकन।',
    significance: 'विवाह से पूर्व वैवाहिक सामंजस्य, भावनात्मक जुड़ाव और दीर्घकालिक पारिवारिक शांति सुनिश्चित करता है।',
  },
  dasha_remedies: {
    duration: '30 मिनट',
    tag: 'करियर एवं जीवन',
    mantraTradition: 'जैमिनी एवं पाराशरी सूत्र',
    description: 'वर्तमान महादशा-अंतर्दशा की गहन जाँच और सटीक रत्न, मंत्र एवं दान उपायों का मार्गदर्शन।',
    significance: 'कठिन करियर, आर्थिक या कानूनी दौर में प्रामाणिक वैदिक मार्गदर्शन देता है।',
  },
  navgrah: {
    duration: '45 मिनट',
    tag: 'ग्रह शांति',
    mantraTradition: 'वैदिक नवग्रह सूक्तम्',
    description: 'नवग्रहों (सूर्य, चंद्र, मंगल, बुध, गुरु, शुक्र, शनि, राहु, केतु) के सामंजस्य हेतु पवित्र आहुति व शांति अनुष्ठान।',
    significance: 'अशुभ ग्रह गोचर को शांत करता है, स्वास्थ्य स्थिर करता है और सौभाग्य लाता है।',
  },
  shani_sade_sati: {
    duration: '45 मिनट',
    tag: 'शनि शांति',
    mantraTradition: 'दशरथ शनि स्तोत्र एवं वैदिक मंत्र',
    description: 'तिल तेल दीपक, नीले पुष्प अर्पण और शनि स्तोत्र पाठ के साथ विशेष शनि शांति पूजा।',
    significance: 'मानसिक तनाव, कार्यों में अचानक देरी और करियर बाधाओं से सुरक्षा देता है।',
  },
  janma_nakshatra: {
    duration: '50 मिनट',
    tag: 'नक्षत्र सेवा',
    mantraTradition: 'तैत्तिरीय ब्राह्मण नक्षत्र सूक्तम्',
    description: 'प्राणशक्ति को प्रबल करने हेतु पवित्र औषधियों की 108 आहुतियों के साथ जन्म नक्षत्र देवता की आराधना।',
    significance: 'आत्मविश्वास, बुद्धि और शारीरिक रोग-प्रतिरोधक क्षमता को सशक्त बनाता है।',
  },
  satyanarayan_katha: {
    duration: '60 मिनट',
    tag: 'पारिवारिक आशीर्वाद',
    mantraTradition: 'स्कंद पुराण रेवा खंड',
    description: 'पंचामृत, कदली प्रसाद और समापन हवन सहित भगवान विष्णु के 5 पवित्र अध्यायों का संपूर्ण कथा पाठ।',
    significance: 'पूर्णिमा, जन्मदिन, गृहप्रवेश या शुभ अवसरों पर अपार मंगल और समृद्धि लाता है।',
  },
  sundarkand: {
    duration: '75 मिनट',
    tag: 'हनुमान सेवा',
    mantraTradition: 'रामचरितमानस सुंदरकांड',
    description: 'साहस और बाधाओं पर विजय हेतु बजरंगबली के आह्वान के साथ गोस्वामी तुलसीदास कृत सुंदरकांड का संगीतमय पाठ।',
    significance: 'गहरे भय और नकारात्मक ग्रह छाया को दूर कर असीम आत्मबल देता है।',
  },
  bhagwat_geeta_path: {
    duration: '45 मिनट',
    tag: 'वैदिक ज्ञान',
    mantraTradition: 'महाभारत भीष्म पर्व',
    description: 'भक्ति योग (अध्याय 12) एवं पुरुषोत्तम योग (अध्याय 15) के प्रमुख श्लोकों का भावार्थ सहित पाठ।',
    significance: 'जीवन के कठिन निर्णयों में कर्तव्य-बोध, आंतरिक शांति और आध्यात्मिक विवेक देता है।',
  },
  ramayan_chopai: {
    duration: '60 मिनट',
    tag: 'पारिवारिक शांति',
    mantraTradition: 'अवधी वैदिक सनातन पाठ',
    description: 'परिवार की एकता और समृद्धि के लिए विशेष गोत्र सम्पुट सहित पावन रामचरितमानस चौपाइयों का पाठ।',
    significance: 'पारिवारिक प्रेम बढ़ाता है, गृह-क्लेश शांत करता है और प्रभु श्रीराम की कृपा दिलाता है।',
  },
  griha_pravesh_vastu: {
    duration: '60 मिनट',
    tag: 'वास्तु शुद्धि',
    mantraTradition: 'वास्तु शास्त्र एवं मत्स्य पुराण विधि',
    description: 'दिशाशूल और घर या व्यापार स्थल की ऊर्जाओं को संतुलित करने के लिए संपूर्ण वैदिक वास्तु हवन।',
    significance: 'पुरानी नकारात्मक ऊर्जा दूर कर घर में सुख, स्वास्थ्य और समृद्धि का वास कराता है।',
  },
  chandi_havan: {
    duration: '75 मिनट',
    tag: 'देवी शक्ति',
    mantraTradition: 'मार्कंडेय पुराण चंडी विधान',
    description: 'कमलगट्टा, कपूर, गुग्गुल आहुति और दुर्गा सप्तशती सम्पुट के साथ महा चंडी शक्ति अनुष्ठान।',
    significance: 'अज्ञात बाधाओं, शत्रु भय और व्यापारिक रुकावटों से सर्वोच्च रक्षा प्रदान करता है।',
  },
  gayatri_yagya: {
    duration: '50 मिनट',
    tag: 'बुद्धि एवं तेज',
    mantraTradition: 'ऋग्वेद मंडल 3 सूक्त 62',
    description: 'शुद्ध गोघृत एवं समिधा के साथ पावन वैदिक गायत्री मंत्र की 108 आहुतियों का सूर्योपासना यज्ञ।',
    significance: 'विद्यार्थियों की स्मरण शक्ति व बुद्धि प्रखर करता है और आभामंडल शुद्ध करता है।',
  },
  lakshmi_kuber_havan: {
    duration: '55 मिनट',
    tag: 'समृद्धि सेवा',
    mantraTradition: 'ऋग्वैदिक श्री सूक्तम्',
    description: 'बिल्वफल एवं मधु आहुति के साथ श्री सूक्तम् और कनकधारा स्तोत्र का पवित्र लक्ष्मी-कुबेर हवन।',
    significance: 'आर्थिक स्थिरता बढ़ाता है, ऋण बाधा घटाता है और व्यवसाय में महालक्ष्मी कृपा लाता है।',
  },
  family_sankalp: {
    duration: '30 मिनट',
    tag: 'गोत्र मंत्रोच्चार',
    mantraTradition: 'वैदिक संकल्प विधि',
    description: 'लाइव मंदिर दर्शन के दौरान आपके गोत्र, प्रवर और परिवारजनों के नाम से प्रत्यक्ष वैदिक संकल्प उच्चारण।',
    significance: 'दूरी चाहे जितनी हो, परिवार को सीधे पावन वैदिक आशीर्वाद से जोड़ता है।',
  },
  namkaran_sanskar: {
    duration: '45 मिनट',
    tag: 'संस्कार',
    mantraTradition: 'गृह्य सूत्र संस्कार विधि',
    description: 'शिशु के जन्म नक्षत्र चरण के अनुसार शुभ नामकरण विधि एवं आयुष्य सूक्त पाठ।',
    significance: 'सद्गुण, दीर्घायु और जन्मकालिक अरिष्ट निवारण का आशीर्वाद प्रदान करता है।',
  },
  vivah_varshikotsav: {
    duration: '40 मिनट',
    tag: 'दांपत्य सुख',
    mantraTradition: 'पौराणिक दम्पत्ति आशीर्वाद',
    description: 'विवाह वर्षगाँठ पर पति-पत्नी के सुखद जीवन हेतु गौरी-शंकर व लक्ष्मी-नारायण पूजन।',
    significance: 'आपसी प्रेम गहरा करता है, मतभेद दूर करता है और पारिवारिक एकता सुदृढ़ करता है।',
  },
  pitru_tarpana: {
    duration: '45 मिनट',
    tag: 'पितृ सेवा',
    mantraTradition: 'गरुड़ पुराण एवं श्राद्ध कल्प',
    description: 'दिवंगत पूर्वजों की तृप्ति के लिए काले तिल, कुश और पावन जल से विधिपूर्वक पितृ तर्पण व हवन।',
    significance: 'पितरों को संतुष्ट करता है, पितृ दोष शांत करता है और संतान-सुख में सहायक होता है।',
  },
  kaal_sarp_dosh: {
    duration: '50 मिनट',
    tag: 'दोष निवारण',
    mantraTradition: 'नाग गायत्री एवं पौराणिक विधि',
    description: 'राहु-केतु ग्रह बंधन शांत करने हेतु अनंत, वासुकि व शेषनाग आदि अष्टनागों की विधिपूर्वक शांति पूजा।',
    significance: 'रुके हुए अवसर खोलता है, बुरे स्वप्न शांत करता है और करियर प्रगति में सहायक है।',
  },
  mangal_dosh_shanti: {
    duration: '40 मिनट',
    tag: 'मांगलिक शांति',
    mantraTradition: 'ऋषि मांडव्य मंगल स्तोत्रम्',
    description: 'जन्म कुंडली के 1, 4, 7, 8 या 12वें भाव के उग्र मंगल प्रभाव की शांति हेतु भौम मंगल स्तोत्र अनुष्ठान।',
    significance: 'विवाह में आ रही देरी को दूर करता है और पारिवारिक सौहार्द बढ़ाता है।',
  },
  rahu_ketu_peeda: {
    duration: '45 मिनट',
    tag: 'छाया ग्रह शांति',
    mantraTradition: 'वैदिक राहु-केतु सूक्तम्',
    description: 'अप्रत्याशित कर्म बाधाओं को शांत करने हेतु सरसों, काले तिल व कुश से राहु-केतु शांति आहुति।',
    significance: 'अनावश्यक चिंता, भय और भ्रमपूर्ण स्थितियों से मन को स्थिर करता है।',
  },
};

export const PANDIT_HI: Record<
  string,
  {
    title: string;
    lineage: string;
    experience: string;
    specialties: string[];
  }
> = {
  '73b080c9-8bfb-41e6-8c5a-dba40c9409c5': {
    title: 'वैवाहिक परामर्शदाता एवं ज्योतिषाचार्य (संस्थापक)',
    lineage: 'पाराशरी वैदिक परंपरा एवं ज्योतिष विशारद, दिल्ली',
    experience: '18 वर्ष सेवा',
    specialties: ['वैवाहिक परामर्श', 'कुंडली मिलान', 'वैदिक ज्योतिष', 'विवाह संस्कार'],
  },
  '8cfb4f7f-f337-4475-8885-d0d91ae0939e': {
    title: 'ज्योतिष एवं वास्तु विशेषज्ञ (सह-संस्थापक)',
    lineage: 'वैदिक वास्तु एवं ज्योतिष परंपरा, दिल्ली',
    experience: '20 वर्ष सेवा',
    specialties: ['वैदिक ज्योतिष', 'वास्तु शास्त्र', 'कुंडली मिलान', 'ग्रह शांति'],
  },
  pandit_ravi_pathak: {
    title: 'कर्मकाण्ड विशेषज्ञ',
    lineage: 'वैदिक कर्मकांड एवं अनुष्ठान परंपरा',
    experience: '12 वर्ष सेवा',
    specialties: ['कर्मकांड', 'महायज्ञ', 'गणेश पूजन', 'वैदिक अनुष्ठान'],
  },
  pandit_nitin_sharma: {
    title: 'कर्मकाण्ड, सुंदरकांड विशेषज्ञ',
    lineage: 'शुक्ल यजुर्वेद एवं सुंदरकांड परंपरा',
    experience: '10 वर्ष सेवा',
    specialties: ['कर्मकांड', 'सुंदरकांड पाठ', 'हनुमान आराधना', 'वैदिक पाठ'],
  },
  pandit_umesh_shastri: {
    title: 'रुद्राभिषेक एवं देवी पूजा',
    lineage: 'शिव-शक्ति आराधना एवं दशाश्वमेध परंपरा',
    experience: '16 वर्ष सेवा',
    specialties: ['रुद्राभिषेक', 'देवी पूजा', 'दुर्गा पाठ', 'महा अभिषेक'],
  },
  acharya_kuber_tripathi: {
    title: 'ज्योतिष कर्मकाण्ड विशेषज्ञ',
    lineage: 'संस्कृत विश्वविद्यालय एवं ज्योतिषाचार्य परंपरा',
    experience: '14 वर्ष सेवा',
    specialties: ['ज्योतिष', 'कर्मकांड', 'भजन संध्या', 'संकल्प सेवा'],
  },
  pandit_subhash_shastri: {
    title: 'सत्यनारायण पूजा, दुर्गा सप्तशती, नवग्रह पूजन, रुद्राभिषेक',
    lineage: 'सनातन वैदिक धर्मार्थ विधि परंपरा',
    experience: '15 वर्ष सेवा',
    specialties: ['सत्यनारायण पूजा', 'दुर्गा सप्तशती', 'नवग्रह पूजन', 'रुद्राभिषेक'],
  },
  pandit_sumit_shastri: {
    title: 'कर्मकांड एवं ज्योतिष विशेषज्ञ',
    lineage: 'वैदिक कर्मकांड एवं ज्योतिष परंपरा',
    experience: '11 वर्ष सेवा',
    specialties: ['कर्मकांड', 'वैदिक ज्योतिष', 'पूजा विधि', 'कुंडली मिलान'],
  },
  pandit_nandkishor_tripathi: {
    title: 'कर्मकांड एवं ज्योतिष विशेषज्ञ',
    lineage: 'शुक्ल यजुर्वेद एवं ज्योतिष परंपरा',
    experience: '13 वर्ष सेवा',
    specialties: ['कर्मकांड', 'वैदिक ज्योतिष', 'ग्रह शांति', 'अनुष्ठान'],
  },
};

export function getLocalizedPooja(pooja: PoojaItem, lang: 'en' | 'hi') {
  if (lang !== 'hi') {
    return {
      ...pooja,
      displayName: pooja.name,
      secondaryName: pooja.hindiName,
    };
  }
  const tr = POOJA_HI[pooja.id];
  return {
    ...pooja,
    displayName: pooja.hindiName || pooja.name,
    secondaryName: pooja.name,
    duration: tr?.duration || pooja.duration,
    description: tr?.description || pooja.description,
    significance: tr?.significance || pooja.significance,
    tag: tr?.tag || pooja.tag,
    mantraTradition: tr?.mantraTradition || pooja.mantraTradition,
  };
}

export function getLocalizedPanditPricing(pandit: PanditPricing, lang: 'en' | 'hi') {
  if (lang !== 'hi') return pandit;
  const tr = PANDIT_HI[pandit.panditId];
  if (!tr) return pandit;
  return {
    ...pandit,
    title: tr.title,
    lineage: tr.lineage,
    experience: tr.experience,
    specialties: tr.specialties,
  };
}
