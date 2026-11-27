'use client';

import React from 'react';
import {
  Sparkles,
  Shield,
  Zap,
  Flame,
  CheckCircle2,
  MapPin,
  Award,
  Compass,
  Building2,
} from 'lucide-react';
import {
  OmIcon,
  DiyaIcon,
  VerifiedPanditBadge,
} from '@/components/icons/SpiritualIcons';
import AboutCta from '@/components/AboutCta';
import { useLang } from '@/lib/i18n/context';
import { CORE_PILLARS, KYC_PILLARS } from './about-i18n';

export default function AboutContent() {
  const { lang, t: L } = useLang();

  return (
    <div className="min-h-screen bg-[#fafaf8] dark:bg-obsidian text-stone-900 dark:text-foreground py-12 relative overflow-hidden">
      <div className="mandala-bg absolute inset-0 opacity-20 pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-5 lg:px-8">
        {/* Sacred Hero Header */}
        <div className="text-center mb-16 relative">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/80 dark:border-gold/30 bg-amber-50 dark:bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-amber-900 dark:text-gold-pale mb-5 shadow-sm">
            <Flame className="w-3.5 h-3.5 text-amber-600 dark:text-gold animate-flame" />
            {L('Sanatana Dharma Worldwide', 'विश्वव्यापी सनातन धर्म')}
          </p>
          <h1 className="font-serif text-4xl sm:text-6xl font-bold text-stone-900 dark:text-white tracking-tight leading-tight">
            {L('Ancient ritual, carried by ', 'प्राचीन वैदिक परंपरा, ')}
            <span className="text-amber-700 dark:text-gold italic font-serif">
              {L('modern hands', 'आधुनिक माध्यम के साथ')}
            </span>
          </h1>
          <p className="mt-5 text-stone-600 dark:text-stone-300 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {L(
              'Bridging timeless Vedic traditions with real-time WebRTC technology to bring the sacred darshan of Bharat’s holy sanctums into devotees’ homes around the world.',
              'भारत के पावन मंदिरों और आचार्यों के लाइव दर्शन को विश्वभर के भक्तों के घर तक पहुँचाने के लिए शाश्वत वैदिक परंपरा व रीयल-टाइम WebRTC तकनीक का पावन संगम।',
            )}
          </p>
        </div>

        {/* ======================================================== */}
        {/* FOUNDERS & VEDIC LEADERSHIP SECTION */}
        {/* ======================================================== */}
        <section className="mb-20 relative">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/80 dark:border-gold/30 bg-amber-50 dark:bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-amber-900 dark:text-gold-pale mb-3 shadow-sm">
              <OmIcon size={14} className="text-amber-600 dark:text-gold" />
              {L('Founders & Spiritual Leadership', 'संस्थापक एवं आध्यात्मिक नेतृत्व')}
            </div>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold text-stone-900 dark:text-white tracking-tight leading-tight">
              {L('Guided by Vedic Wisdom, ', 'वैदिक ज्ञान से प्रेरित, ')}
              <span className="text-amber-700 dark:text-gold italic font-serif">
                {L('Rooted in Delhi', 'दिल्ली में स्थापित')}
              </span>
            </h2>
            <div className="mt-3 space-y-1">
              <p className="font-serif text-base sm:text-xl font-bold text-amber-900 dark:text-gold-soft">
                पंडित रोहित तिवारी (ज्योतिषाचार्य) एवं पंडित संतोष कुमार शास्त्री (ज्योतिष एवं वास्तु विशेषज्ञ)
              </p>
              {lang === 'en' && (
                <p className="text-xs sm:text-sm font-semibold tracking-wide text-stone-600 dark:text-stone-300">
                  Pt. Rohit Tiwari (Jyotishacharya) &amp; Pt. Santosh Kumar Shastri (Jyotish &amp; Vastu Specialist)
                </p>
              )}
            </div>
            <p className="mt-4 text-stone-600 dark:text-stone-300 text-xs sm:text-sm max-w-3xl mx-auto leading-relaxed">
              {L(
                'Based in the historic spiritual capital of Delhi (NCR), Param Darshan was founded under the spiritual vision of two revered Vedic masters. Conceived as a sacred bridge between scriptural purity and 21st-century live streaming, our mission is to empower devotees globally with truthful astrological guidance, authentic live rituals, and direct sanctuary darshan.',
                'ऐतिहासिक आध्यात्मिक राजधानी दिल्ली (NCR) में स्थापित, परम दर्शन दो पूज्य वैदिक आचार्यों की आध्यात्मिक दृष्टि से प्रेरित है। शास्त्रीय शुद्धता और 21वीं सदी की लाइव स्ट्रीमिंग के बीच एक पावन सेतु के रूप में, हमारा उद्देश्य विश्वभर के भक्तों को सत्यनिष्ठ ज्योतिष मार्गदर्शन, प्रामाणिक लाइव अनुष्ठान और प्रत्यक्ष दर्शन प्रदान करना है।',
              )}
            </p>
          </div>

          {/* Founders Showcase Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-8">
            {/* Left Column: Duo Hero Portrait Card */}
            <div className="lg:col-span-5 bg-white dark:bg-gradient-to-b dark:from-obsidian-soft dark:via-obsidian-soft/90 dark:to-obsidian border border-stone-200 dark:border-gold/30 rounded-3xl p-4 sm:p-5 shadow-xl dark:shadow-2xl relative flex flex-col justify-between group overflow-hidden">
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-400/10 dark:bg-gold/10 rounded-full blur-3xl pointer-events-none" />

              {/* Photo Container */}
              <div className="on-photo video-overlay relative rounded-2xl overflow-hidden border border-stone-200 dark:border-gold/25 shadow-xl bg-black">
                <img
                  src="/images/founders/founders-upper.webp"
                  alt={L(
                    'Founders of Param Darshan: Pt. Rohit Tiwari & Pt. Santosh Kumar Shastri',
                    'परम दर्शन के संस्थापक: पंडित रोहित तिवारी व पंडित संतोष कुमार शास्त्री',
                  )}
                  className="w-full h-[380px] sm:h-[440px] lg:h-[430px] object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent pointer-events-none" />

                {/* Delhi Badge Overlay (Top Left) */}
                <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold shadow-lg">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span className="!text-white">{L('Delhi, Bharat', 'दिल्ली, भारत')}</span>
                </div>

                {/* Spiritual Emblem (Top Right) */}
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/80 backdrop-blur-md border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-lg">
                  <OmIcon size={16} />
                </div>

                {/* Bottom Overlay Label */}
                <div className="absolute bottom-4 left-4 right-4 z-10 text-left">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300 block mb-0.5 !text-amber-300">
                    {L('Co-Founders', 'संस्थापक द्वय')}
                  </span>
                  <h3 className="font-serif text-lg sm:text-xl font-bold !text-white leading-snug">
                    पंडित रोहित तिवारी एवं पंडित संतोष कुमार शास्त्री
                  </h3>
                  {lang === 'en' && (
                    <p className="text-xs font-serif font-semibold !text-amber-200 mt-0.5">
                      Pt. Rohit Tiwari &amp; Pt. Santosh Kumar Shastri
                    </p>
                  )}
                  <p className="text-[11px] !text-stone-300 mt-1 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>
                      {L('Guardians of Vedic Astrology & Vastu Vidya • New Delhi', 'वैदिक ज्योतिष व वास्तु विद्या के संरक्षक • नई दिल्ली')}
                    </span>
                  </p>
                </div>
              </div>

              {/* Quick Pillars under photo */}
              <div className="mt-4 pt-3 border-t border-stone-200 dark:border-gold/15 grid grid-cols-2 gap-3 text-center">
                <div className="bg-stone-50 dark:bg-obsidian/60 rounded-xl p-2.5 border border-stone-200 dark:border-gold/10">
                  <span className="text-amber-800 dark:text-gold font-serif font-bold text-sm block">
                    {L('Delhi Headquarters', 'दिल्ली मुख्यालय')}
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                    {L('Delhi Operational Helm', 'मुख्य संचालन केंद्र')}
                  </span>
                </div>
                <div className="bg-stone-50 dark:bg-obsidian/60 rounded-xl p-2.5 border border-stone-200 dark:border-gold/10">
                  <span className="text-amber-800 dark:text-gold font-serif font-bold text-sm block">
                    {L('Vedic Purity', 'वैदिक शुचिता')}
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                    {L('100% Shastric Integrity', '100% शास्त्रीय निष्ठा')}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Individual Detailed Dossiers */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-6">
              {/* Founder 1: Pandit Rohit Tiwari */}
              <div className="bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/25 rounded-3xl p-6 sm:p-7 shadow-lg dark:shadow-xl relative overflow-hidden transition-all hover:border-amber-300 dark:hover:border-gold/45">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                  <div className="relative flex-shrink-0">
                    <img
                      src="/images/founders/pandit-rohit-tiwari.webp"
                      alt="पंडित रोहित तिवारी (Pt. Rohit Tiwari) - ज्योतिषाचार्य"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover object-top border-2 border-amber-500/70 dark:border-gold/60 shadow-lg ring-4 ring-amber-400/15 dark:ring-gold/15"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-amber-500 text-stone-950 dark:bg-gold dark:text-obsidian rounded-full p-1 shadow-md">
                      <VerifiedPanditBadge size={14} />
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/80 dark:bg-gold/15 dark:text-gold-pale dark:border-gold/30 text-[10px] font-bold tracking-wider uppercase">
                        {L('Founder', 'संस्थापक')}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                        <MapPin className="w-3 h-3 text-amber-600 dark:text-gold" />
                        {L('Delhi, India', 'दिल्ली, भारत')}
                      </span>
                    </div>
                    <h3 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white tracking-wide">
                      पंडित रोहित तिवारी
                    </h3>
                    {lang === 'en' && (
                      <p className="font-serif text-base sm:text-lg font-bold text-amber-800 dark:text-gold tracking-wide mt-0.5">
                        Pt. Rohit Tiwari
                      </p>
                    )}
                    <p className="text-xs sm:text-sm font-semibold text-stone-700 dark:text-gold-soft flex items-center gap-1.5 mt-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-gold flex-shrink-0" />
                      <span>{L('Jyotishacharya • Matrimonial Advisor & Astrologer', 'ज्योतिषाचार्य • वैवाहिक परामर्शदाता व ज्योतिषी')}</span>
                    </p>
                  </div>
                </div>

                <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm leading-relaxed mb-4">
                  {L(
                    'Distinguished scholar of classical Parashari and Vedic astrology based in Delhi. Pandit Rohit Tiwari serves as Founder, Matrimonial Advisor, and senior Astrologer—empowering devotees with authentic matrimonial guidance, truthful planetary insights, auspicious muhurat selection, and spiritually uplifting remedies rooted in scriptural discipline.',
                    'दिल्ली के प्रतिष्ठित पराशरी और वैदिक ज्योतिष विद्वान। पंडित रोहित तिवारी संस्थापक, वैवाहिक परामर्शदाता व वरिष्ठ ज्योतिषाचार्य के रूप में भक्तों को प्रामाणिक विवाह मिलान, सत्य ग्रह-विवेचन, शुभ मुहूर्त निर्णय और शास्त्रसम्मत वैदिक उपायों से मार्गदर्शन प्रदान करते हैं।',
                  )}
                </p>

                {/* Specialties Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    L('Matrimonial Advisor', 'वैवाहिक परामर्श'),
                    L('Vedic Astrology', 'वैदिक ज्योतिष'),
                    L('Horoscope Analysis', 'कुंडली विश्लेषण'),
                    L('Auspicious Muhurat', 'शुभ मुहूर्त निर्णय'),
                    L('Planetary Remedies', 'ग्रह शांति एवं उपाय'),
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-obsidian border border-stone-200 dark:border-gold/15 text-[11px] text-stone-700 dark:text-stone-300 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Founder 2: Pandit Santosh Kumar Shastri */}
              <div className="bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/25 rounded-3xl p-6 sm:p-7 shadow-lg dark:shadow-xl relative overflow-hidden transition-all hover:border-amber-300 dark:hover:border-gold/45">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                  <div className="relative flex-shrink-0">
                    <img
                      src="/images/founders/pandit-santosh-shastri.webp"
                      alt="पंडित संतोष कुमार शास्त्री (Pt. Santosh Kumar Shastri) - ज्योतिष एवं वास्तु विशेषज्ञ"
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover object-top border-2 border-amber-500/70 dark:border-gold/60 shadow-lg ring-4 ring-amber-400/15 dark:ring-gold/15"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-amber-500 text-stone-950 dark:bg-gold dark:text-obsidian rounded-full p-1 shadow-md">
                      <VerifiedPanditBadge size={14} />
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/80 dark:bg-gold/15 dark:text-gold-pale dark:border-gold/30 text-[10px] font-bold tracking-wider uppercase">
                        {L('Co-Founder', 'सह-संस्थापक')}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                        <MapPin className="w-3 h-3 text-amber-600 dark:text-gold" />
                        {L('Delhi, India', 'दिल्ली, भारत')}
                      </span>
                    </div>
                    <h3 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 dark:text-white tracking-wide">
                      पंडित संतोष कुमार शास्त्री
                    </h3>
                    {lang === 'en' && (
                      <p className="font-serif text-base sm:text-lg font-bold text-amber-800 dark:text-gold tracking-wide mt-0.5">
                        Pt. Santosh Kumar Shastri
                      </p>
                    )}
                    <p className="text-xs sm:text-sm font-semibold text-stone-700 dark:text-gold-soft flex items-center gap-1.5 mt-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-gold flex-shrink-0" />
                      <span>{L('Jyotish & Vastu Specialist', 'ज्योतिष एवं वास्तु विशेषज्ञ')}</span>
                    </p>
                  </div>
                </div>

                <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm leading-relaxed mb-4">
                  {L(
                    'Revered master of spatial cosmic alignment (Vastu Shastra) and classical Karmakand rituals in Delhi. Shastri ji specializes in balancing residential and commercial energy fields, presiding over sacred Maha Yagyas, and sanctifying pivotal life transitions through shastric puja vidhis.',
                    'दिल्ली में वास्तु शास्त्र और वैदिक कर्मकांड अनुष्ठानों के पूज्य आचार्य। शास्त्री जी आवासीय व व्यावसायिक परिसरों में ऊर्जा संतुलन, महायज्ञों के संचालन और जीवन के प्रमुख संस्कारों को शास्त्रीय पूजा विधि से संपन्न कराने में विशेषज्ञ हैं।',
                  )}
                </p>

                {/* Specialties Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    L('Vastu Shastra', 'वास्तु शास्त्र'),
                    L('Predictive Astrology', 'फलित ज्योतिष'),
                    L('Energy Cleansing & Griha Pravesh', 'गृह प्रवेश एवं वास्तु शुद्धि'),
                    L('Ritual Havans & Maha Yagya', 'वैदिक कर्मकांड एवं महायज्ञ'),
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-obsidian border border-stone-200 dark:border-gold/15 text-[11px] text-stone-700 dark:text-stone-300 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Delhi Operational Helm Strip */}
          <div className="rounded-2xl bg-white dark:bg-gradient-to-r dark:from-obsidian-soft dark:via-obsidian dark:to-obsidian-soft border border-stone-200 dark:border-gold/20 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg dark:shadow-xl">
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-gold/10 border border-amber-300/80 dark:border-gold/30 flex items-center justify-center text-amber-700 dark:text-gold flex-shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-serif font-bold text-stone-900 dark:text-white text-sm block">
                  {L('Headquartered in Delhi (NCR)', 'दिल्ली स्थित मुख्यालय (NCR)')}
                </span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">
                  {L(
                    'Coordinating authenticated live temple broadcasts, priest verifications, and astrological consultations across India.',
                    'संपूर्ण भारत में प्रमाणित लाइव मंदिर प्रसारण, पुरोहित सत्यापन और ज्योतिष परामर्श का समन्वय।',
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="px-3 py-1 rounded-full bg-amber-50 dark:bg-gold/10 border border-amber-300 dark:border-gold/30 text-[11px] font-bold text-amber-900 dark:text-gold-pale flex items-center gap-1.5 shadow-sm">
                <Compass className="w-3 h-3 text-amber-700 dark:text-gold" />
                {L('Capital of Bharat • Delhi', 'भारत की राजधानी • दिल्ली')}
              </span>
            </div>
          </div>
        </section>

        {/* Hero Temple Image Banner */}
        <div className="on-photo video-overlay relative rounded-3xl overflow-hidden border border-stone-200 dark:border-gold/25 mb-16 shadow-2xl">
          <img
            src="/images/photo-1561361058-c24cecae35ca.webp"
            alt={L('Morning bathers at the sacred ghats of Varanasi', 'काशी के पावन घाटों पर प्रातःकालीन स्नान व दर्शन')}
            className="w-full h-72 sm:h-96 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                {L('Kashi Mokshadayini', 'काशी मोक्षदायिनी')}
              </span>
              <h3 className="font-serif text-2xl font-bold !text-white">
                {L('Varanasi Ghats & Kashi Vishwanath', 'वाराणसी के घाट व काशी विश्वनाथ')}
              </h3>
            </div>
            <span className="text-xs !text-white bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/25">
              {L('Live WebRTC broadcast point', 'लाइव WebRTC प्रसारण केंद्र')}
            </span>
          </div>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {CORE_PILLARS.map((pillar) => {
            const Icon =
              pillar.id === 'lineage' ? (
                <DiyaIcon size={28} />
              ) : pillar.id === 'livekit' ? (
                <Zap className="w-6 h-6 text-amber-600 dark:text-gold" />
              ) : (
                <Shield className="w-6 h-6" />
              );
            const iconWrapClass =
              pillar.id === 'dpdp'
                ? 'w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-gold/10 border border-emerald-200 dark:border-gold/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 mb-4'
                : 'w-12 h-12 rounded-2xl bg-amber-50 dark:bg-gold/10 border border-amber-200 dark:border-gold/30 flex items-center justify-center text-amber-600 dark:text-gold mb-4';
            return (
              <div
                key={pillar.id}
                className="bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/15 rounded-3xl p-6 shadow-lg dark:shadow-xl relative"
              >
                <div className={iconWrapClass}>{Icon}</div>
                <h3 className="font-serif text-xl font-bold text-stone-900 dark:text-white mb-2">
                  {L(pillar.titleEn, pillar.titleHi)}
                </h3>
                <p className="text-stone-600 dark:text-stone-400 text-xs sm:text-sm leading-relaxed">
                  {L(pillar.descEn, pillar.descHi)}
                </p>
              </div>
            );
          })}
        </div>

        {/* KYC & Compliance Verification Section */}
        <div className="bg-white dark:bg-obsidian-soft border border-stone-200 dark:border-gold/25 rounded-3xl p-8 sm:p-12 mb-16 shadow-xl dark:shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-700 dark:text-gold-soft">
              {L('Priesthood Integrity', 'पुरोहित प्रामाणिकता')}
            </p>
            <h2 className="mt-1 font-serif text-3xl font-bold text-stone-900 dark:text-white">
              {L('KYC & platform verification before going live', 'लाइव होने से पहले KYC व प्लेटफ़ॉर्म सत्यापन')}
            </h2>
            <p className="mt-2 text-stone-600 dark:text-stone-300 text-xs sm:text-sm leading-relaxed">
              {L(
                'Every broadcaster passes administrator identity review before receiving streaming privileges on Param Darshan.',
                'परम दर्शन पर प्रसारण अधिकार प्राप्त करने से पहले प्रत्येक प्रसारक व्यवस्थापक द्वारा पहचान समीक्षा से गुज़रता है।',
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {KYC_PILLARS.map((item) => (
              <div
                key={item.titleEn}
                className="flex items-start gap-3 p-3.5 rounded-2xl bg-stone-50 dark:bg-obsidian border border-stone-200 dark:border-gold/10"
              >
                <CheckCircle2 className="w-5 h-5 text-amber-600 dark:text-gold flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-stone-900 dark:text-white text-xs sm:text-sm block">
                    {L(item.titleEn, item.titleHi)}
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    {L(item.descEn, item.descHi)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic CTA Box */}
        <AboutCta />
      </div>
    </div>
  );
}
