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
  gurukul: string;
  experience: string;
  rating: string;
  reviewsCount: string;
  avatar: string;
  specialties: string[];
  dakshinaCoins: number; // custom price for this pooja
  isAvailableToday: boolean;
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
    panditId: '73b080c9-8bfb-41e6-8c5a-dba40c9409c5',
    name: 'Pandit Aarav Sharma',
    title: 'Head Archak, Kashi Vishwanath Parampara',
    gurukul: 'Sampurnanand Sanskrit Vishwavidyalaya, Varanasi',
    experience: '22 Years Seva',
    rating: '4.98',
    reviewsCount: '1,420',
    avatar: '/images/photo-1543934776-32d1cc654abb.webp',
    specialties: ['Rudrabhishek', 'Mahamrityunjaya Jaap', 'Ganga Aarti', 'Satyanarayan Katha'],
    dakshinaCoins: 150,
    isAvailableToday: true,
  },
  {
    panditId: '8cfb4f7f-f337-4475-8885-d0d91ae0939e',
    name: 'Acharya Devrat Sharma',
    title: 'Shukla Yajurveda Acharya & Jyotish Visharad',
    gurukul: 'Haridwar Gurukul Kangri Vishwavidyalaya',
    experience: '18 Years Seva',
    rating: '4.94',
    reviewsCount: '920',
    avatar: '/images/photo-1762838105804-c3264c29a390.webp',
    specialties: ['Navgrah Shanti', 'Kundli Matching', 'Kaal Sarp Dosh', 'Vastu'],
    dakshinaCoins: 125,
    isAvailableToday: true,
  },
  {
    panditId: 'pandit_vyas',
    name: 'Pandit Hariram Vyas',
    title: 'Senior Purohit, Haridwar Ganga Sabha',
    gurukul: 'Rishikesh Parampara',
    experience: '20 Years Seva',
    rating: '4.95',
    reviewsCount: '980',
    avatar: '/images/photo-1544186196-6908a9d76ab3.webp',
    specialties: ['Sandhya Aarti', 'Family Sankalp', 'Sundarkand', 'Pitru Tarpana'],
    dakshinaCoins: 140,
    isAvailableToday: true,
  },
  {
    panditId: 'pandit_bhatt',
    name: 'Pandit Vishwanath Bhatt',
    title: 'Vedic Scholar, Tirupati Tradition',
    gurukul: 'Tirumala Veda Pathashala',
    experience: '26 Years Seva',
    rating: '5.0',
    reviewsCount: '2,140',
    avatar: '/images/photo-1596604820148-da737958af16.webp',
    specialties: ['Vishnu Sahasranama', 'Satyanarayan Katha', 'Griha Pravesh', 'Chandi Havan'],
    dakshinaCoins: 160,
    isAvailableToday: true,
  },
];

/**
 * Calculates a Pandit's specific dakshina for a chosen pooja
 * based on base pooja complexity and pandit seniority.
 */
export function getPanditDakshinaForPooja(pandit: PanditPricing, pooja: PoojaItem): number {
  const base = pooja.baseDakshina;
  if (pandit.name.includes('Vishwanath Bhatt')) {
    return Math.round(base * 1.15); // Senior scholar
  }
  if (pandit.name.includes('Aarav Sharma')) {
    return Math.round(base * 1.1); // Head Archak
  }
  if (pandit.name.includes('Hariram Vyas')) {
    return Math.round(base * 1.05);
  }
  return base; // Acharya Devrat base rate
}
