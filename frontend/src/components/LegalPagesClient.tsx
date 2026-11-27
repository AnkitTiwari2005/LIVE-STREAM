'use client';

import React from 'react';
import {
  Eye,
  Trash2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Mail,
  MapPin,
  ShieldCheck,
  ExternalLink,
  BookOpen,
  AlertOctagon,
} from 'lucide-react';
import { CoinIcon, VerifiedPanditBadge } from '@/components/icons/SpiritualIcons';
import { GrievanceForm } from '@/components/GrievanceForm';
import { LegalPageFrame } from '@/components/LegalPageFrame';
import { useLang } from '@/lib/i18n/context';

export function PrivacyContent() {
  const { lang, t: L } = useLang();
  return (
    <LegalPageFrame
      badgeEn="DPDP Act 2023 Compliant"
      badgeHi="DPDP अधिनियम 2023 के अनुरूप"
      badgeColorClass="text-emerald-400"
      titleEn="Privacy Policy"
      titleHi="गोपनीयता नीति"
      subtitleEn="Last Revised: November 2026 • Governing Statute: Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023)"
      subtitleHi="अंतिम संशोधन: नवंबर 2026 • प्रभावी कानून: डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023 (2023 का अधिनियम सं. 22)"
    >
      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">1.</span> {L('Data Fiduciary Identification', 'डेटा न्यासी (Data Fiduciary) की पहचान')}
        </h2>
        <p>
          {lang === 'hi' ? (
            <>
              DPDP अधिनियम 2023 के अंतर्गत, <strong>परम दर्शन (Param Darshan)</strong> आपके व्यक्तिगत डेटा के प्रसंस्करण के उद्देश्य और माध्यम निर्धारित करने वाले <strong>डेटा न्यासी</strong> के रूप में कार्य करता है।
            </>
          ) : (
            <>
              Under the DPDP Act 2023, <strong>Param Darshan</strong> acts as the <strong>Data Fiduciary</strong> responsible for determining the purpose and means of processing your personal data.
            </>
          )}
        </p>
        <div className="mt-3 p-3 bg-stone-950 border border-stone-800 rounded-xl text-xs space-y-1">
          <div>
            <strong>{L('Registered Office:', 'पंजीकृत कार्यालय:')}</strong>{' '}
            {L('Rohini Sector 15, Rohini, Delhi 110089, India', 'रोहिणी सेक्टर 15, रोहिणी, दिल्ली 110089, भारत')}
          </div>
          <div>
            <strong>{L('Leadership & Data Protection Officers (DPO):', 'नेतृत्व व डेटा संरक्षण अधिकारी (DPO):')}</strong>{' '}
            {L(
              'Pt. Rohit Tiwari (Founder) & Pt. Santosh Kumar Shastri (Co-Founder)',
              'पंडित रोहित तिवारी (संस्थापक) व पंडित संतोष कुमार शास्त्री (सह-संस्थापक)',
            )}
          </div>
          <div>
            <strong>{L('Dedicated DPO Email:', 'समर्पित DPO ईमेल:')}</strong> paramdarshan.com@gmail.com
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">2.</span> {L('Personal Data Collected', 'एकत्रित व्यक्तिगत डेटा')}
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>{L('Account & Profile Data:', 'खाता व प्रोफ़ाइल डेटा:')}</strong>{' '}
            {L(
              'Full Name, verified Email Address, hashed password credentials (bcrypt), and optional Profile Avatar.',
              'पूरा नाम, सत्यापित ईमेल पता, हैश्ड पासवर्ड (bcrypt) और वैकल्पिक प्रोफ़ाइल चित्र।',
            )}
          </li>
          <li>
            <strong>{L('Spiritual & Ritual Data:', 'आध्यात्मिक व अनुष्ठान विवरण:')}</strong>{' '}
            {L(
              'Gotra, Sankalp prayer intentions, and Vedic birth coordinates submitted strictly for customized pooja recitations and Kundli consultations.',
              'गोत्र, संकल्प प्रार्थना उद्देश्य और जन्म विवरण — केवल व्यक्तिगत पूजा पाठ और कुंडली परामर्श के लिए उपयोग किए जाते हैं।',
            )}
          </li>
          <li>
            <strong>{L('Financial Transaction Identifiers:', 'वित्तीय लेन-देन पहचानकर्ता:')}</strong>{' '}
            {lang === 'hi' ? (
              <>
                Razorpay/UPI ऑर्डर ID और लेन-देन समय। हम अपने सर्वर पर कभी भी क्रेडिट/डेबिट कार्ड नंबर या UPI PIN संग्रहीत <em>नहीं</em> करते।
              </>
            ) : (
              <>
                Razorpay/UPI Order IDs and transaction status timestamps. We <em>never</em> store credit/debit card numbers or UPI PINs on our servers.
              </>
            )}
          </li>
          <li>
            <strong>{L('Technical Telemetry:', 'तकनीकी टेलीमेट्री:')}</strong>{' '}
            {L(
              'Anonymized IP address, browser user-agent, and LiveKit WebRTC connection metrics to guarantee broadcast streaming quality.',
              'प्रसारण गुणवत्ता सुनिश्चित करने हेतु अनाम IP पता, ब्राउज़र विवरण और LiveKit WebRTC कनेक्शन मेट्रिक्स।',
            )}
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">3.</span> {L('Purpose of Processing & Explicit Consent', 'प्रसंस्करण का उद्देश्य व स्पष्ट सहमति')}
        </h2>
        <p>
          {L(
            'We process personal data strictly pursuant to Section 6 of the DPDP Act 2023 on the basis of your explicit, informed, and unambiguous consent:',
            'हम DPDP अधिनियम 2023 की धारा 6 के अनुसार आपकी स्पष्ट, सूचित और असंदिग्ध सहमति के आधार पर ही व्यक्तिगत डेटा का प्रसंस्करण करते हैं:',
          )}
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1.5 text-xs text-stone-400">
          <li>{L('Facilitating WebRTC video delivery of temple ceremonies and astrologer interactions.', 'मंदिर अनुष्ठानों और ज्योतिष संवाद के लिए WebRTC वीडियो प्रसारण उपलब्ध कराना।')}</li>
          <li>{L('Accrediting and debiting your 5 coins/min public darshan meter sessions.', 'आपके 5 कॉइन/मिनट सार्वजनिक दर्शन मीटर सत्रों का हिसाब रखना।')}</li>
          <li>{L('Notifying you of upcoming pooja broadcasts you scheduled reminders for.', 'जिन आगामी पूजा प्रसारणों का आपने रिमाइंडर सेट किया है उनकी सूचना देना।')}</li>
          <li>{L('Complying with statutory reporting obligations under the IT Act, 2000.', 'सूचना प्रौद्योगिकी अधिनियम, 2000 के अंतर्गत वैधानिक दायित्वों का पालन करना।')}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">4.</span> {L('Rights of the Data Principal', 'डेटा स्वामी (Data Principal) के अधिकार')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-xl">
            <div className="flex items-center gap-2 font-bold text-white text-xs mb-1">
              <Eye className="w-4 h-4 text-amber-400" /> {L('Right to Access', 'पहुँच का अधिकार')}
            </div>
            <p className="text-[11px] text-stone-400">
              {L('Request a summary of personal data held and processed by Param Darshan.', 'परम दर्शन द्वारा रखे व प्रसंस्कृत किए गए व्यक्तिगत डेटा का सारांश मांगने का अधिकार।')}
            </p>
          </div>
          <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-xl">
            <div className="flex items-center gap-2 font-bold text-white text-xs mb-1">
              <Trash2 className="w-4 h-4 text-red-400" /> {L('Right to Erasure / Forgotten', 'डेटा मिटाने / विलोपन का अधिकार')}
            </div>
            <p className="text-[11px] text-stone-400">
              {L('Request permanent deletion of your profile, email, and live records at any time.', 'किसी भी समय अपनी प्रोफ़ाइल, ईमेल और लाइव रिकॉर्ड को स्थायी रूप से हटाने का अनुरोध करने का अधिकार।')}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">5.</span> {L('Data Retention & Auto-Purge Policy', 'डेटा संग्रहण व स्वतः विलोपन नीति')}
        </h2>
        <p>
          {lang === 'hi' ? (
            <>
              भक्ति लाइव चैट संदेश सामुदायिक मॉडरेशन के लिए अधिकतम <strong>30 दिनों</strong> तक सुरक्षित रखे जाते हैं, जिसके बाद वे स्वतः अनाम या हटा दिए जाते हैं। इच्छुक पंडितों द्वारा जमा KYC दस्तावेज़ (मास्क्ड आधार/प्रमाणपत्र) सत्यापन निर्णय के 30 दिनों के भीतर सुरक्षित रूप से हटा दिए जाते हैं।
            </>
          ) : (
            <>
              Devotional live chat messages are retained for a maximum of <strong>30 days</strong> for community moderation purposes, after which they are automatically anonymized or purged. KYC records submitted by aspiring Pandits (masked Aadhaar/certificates) are reviewed and securely deleted within 30 days of verification decision.
            </>
          )}
        </p>
      </section>
    </LegalPageFrame>
  );
}

export function TermsContent() {
  const { lang, t: L } = useLang();
  return (
    <LegalPageFrame
      badgeEn="Legal Compliance"
      badgeHi="विधिक अनुपालन"
      badgeColorClass="text-orange-400"
      titleEn="Terms of Service"
      titleHi="सेवा की शर्तें"
      subtitleEn="Last Updated: November 2026 • Effective under the Information Technology Act, 2000 & Indian Contract Act, 1872"
      subtitleHi="अंतिम अद्यतन: नवंबर 2026 • सूचना प्रौद्योगिकी अधिनियम, 2000 व भारतीय संविदा अधिनियम, 1872 के अंतर्गत प्रभावी"
    >
      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">1.</span> {L('Acceptance of Terms & Eligibility', 'शर्तों की स्वीकृति व पात्रता')}
        </h2>
        <p>
          {lang === 'hi' ? (
            <>
              <strong>परम दर्शन (Param Darshan)</strong> (&ldquo;प्लेटफ़ॉर्म&rdquo;, &ldquo;हम&rdquo;) पर प्रवेश करने, ब्राउज़ करने या पंजीकरण करने से आप (&ldquo;उपयोगकर्ता&rdquo;, &ldquo;भक्त&rdquo;, या &ldquo;प्रसारक&rdquo;) इन सेवा शर्तों से विधिक रूप से बाध्य होने की सहमति देते हैं। DPDP अधिनियम, 2023 के अनुपालन में, पंजीकरण के लिए उपयोगकर्ता की आयु कम से कम 18 वर्ष होनी चाहिए या प्रमाणित अभिभावक की सहमति होनी चाहिए।
            </>
          ) : (
            <>
              By accessing, browsing, or registering on <strong>Param Darshan</strong> (&ldquo;Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;), you (&ldquo;User&rdquo;, &ldquo;Devotee&rdquo;, or &ldquo;Streamer&rdquo;) agree to be legally bound by these Terms of Service. In compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act), users must be at least 18 years of age or possess verified guardian consent to register.
            </>
          )}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">2.</span> {L('Intermediary Status & Platform Role', 'मध्यस्थ (Intermediary) की स्थिति व भूमिका')}
        </h2>
        <p>
          {lang === 'hi' ? (
            <>
              परम दर्शन सूचना प्रौद्योगिकी अधिनियम, 2000 की धारा 2(1)(w) और धारा 79 तथा सूचना प्रौद्योगिकी नियम, 2021 के अंतर्गत पूर्णतः एक <strong>मध्यस्थ (Intermediary)</strong> के रूप में कार्य करता है। यह प्लेटफ़ॉर्म स्वतंत्र वैदिक पुरोहितों, मंदिरों व ज्योतिषियों को लाइव पूजा, आरती और प्रवचन प्रसारित करने हेतु रीयल-टाइम WebRTC डिजिटल बुनियादी ढाँचा प्रदान करता है।
            </>
          ) : (
            <>
              Param Darshan operates strictly as an <strong>intermediary</strong> as defined under Section 2(1)(w) and Section 79 of the Information Technology Act, 2000, and the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021. The platform provides real-time WebRTC digital transmission infrastructure for independent Vedic priests, temples, and astrologers to broadcast sacred poojas, aartis, and discourses.
            </>
          )}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">3.</span> {L('Spiritual & Astrological Disclaimer', 'आध्यात्मिक व ज्योतिषीय अस्वीकरण')}
        </h2>
        <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl text-amber-200/90 text-xs sm:text-sm">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              {lang === 'hi' ? (
                <>
                  <strong>महत्वपूर्ण आस्था व परामर्श सूचना:</strong> परम दर्शन पर किए जाने वाले सभी धार्मिक अनुष्ठान, पूजा संकल्प, ज्योतिष विश्लेषण, कुंडली मिलान और उपाय सनातन धर्म की आस्था पर आधारित आध्यात्मिक परामर्श हैं। हम भौतिक धन, शारीरिक रोगों के इलाज या निश्चित सांसारिक परिणामों की <strong>कोई गारंटी या दावा नहीं</strong> करते। ज्योतिष व पूजा परामर्श किसी प्रमाणित चिकित्सा, मानसिक या कानूनी सलाह का विकल्प नहीं हैं।
                </>
              ) : (
                <>
                  <strong>Important Faith & Advisory Notice:</strong> All religious rituals, pooja sankalps, astrological analyses, Kundli matchmaking, and remedial measures conducted on Param Darshan are spiritual counseling practices rooted in Sanatana Dharma traditions. We make <strong>no warranties, guarantees, or claims</strong> regarding material wealth, physical cures, medical treatment, or guaranteed worldly outcomes. Astrology and pooja consultations must not substitute certified medical, psychiatric, or legal advice.
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">4.</span> {L('Sacred Coins & Wallet System', 'पावन कॉइन व वॉलेट प्रणाली')}
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>{L('Closed-Loop Digital System:', 'क्लोज़्ड-लूप डिजिटल प्रणाली:')}</strong>{' '}
            {L(
              'Param Darshan Coins are closed-loop prepaid digital tokens issued solely to access live darshan and pooja services on our platform under RBI Master Direction on Prepaid Payment Instruments.',
              'परम दर्शन कॉइन भारतीय रिज़र्व बैंक (RBI) के प्रीपेड पेमेंट इंस्ट्रूमेंट दिशानिर्देशों के तहत केवल हमारे प्लेटफ़ॉर्म पर लाइव दर्शन और पूजा सेवाओं के लिए जारी क्लोज़्ड-लूप डिजिटल टोकन हैं।',
            )}
          </li>
          <li>
            <strong>{L('Consumption Rate:', 'उपयोग दर:')}</strong>{' '}
            {lang === 'hi' ? (
              <>
                सार्वजनिक लाइव प्रसारण में निर्धारित दर से <strong>5 कॉइन प्रति मिनट</strong> उपयोग होते हैं।
              </>
            ) : (
              <>
                Public live streams consume coins at the published rate of <strong>5 coins per minute</strong>.
              </>
            )}
          </li>
          <li>
            <strong>{L('Non-Transferable & Non-Withdrawable:', 'अहस्तांतरणीय व नॉन-विदड्रॉएबल:')}</strong>{' '}
            {L(
              'Coins cannot be redeemed for fiat cash, transferred between users, or used for third-party commerce. Pandits may only redeem coins earned from live broadcasts and Dakshina, never initial free/welcome or bonus wallet coins.',
              'भक्त कॉइन को नकद में नहीं बदला जा सकता, न ही अन्य उपयोगकर्ताओं को भेजा जा सकता है। पंडित केवल लाइव प्रसारण और दक्षिणा से अर्जित कॉइन ही भुना सकते हैं, शुरुआती निःशुल्क या बोनस वॉलेट कॉइन नहीं।',
            )}
          </li>
          <li>
            <strong>{L('No Refunds on Top-Up Coins:', 'टॉप-अप कॉइन पर कोई रिफंड नहीं:')}</strong>{' '}
            {L(
              'Purchased/top-up coin packs are strictly non-refundable under all normal circumstances and upon account deletion. Automatic reversals apply only if a payment gateway fails to capture or deliver coins for a debited bank transaction.',
              'खरीदे गए टॉप-अप कॉइन पैक सामान्य परिस्थितियों और खाता विलोपन पर भी पूर्णतः नॉन-रिफंडेबल हैं। स्वचालित वापसी केवल तभी लागू होती है जब बैंक से राशि कटने के बावजूद पेमेंट गेटवे कॉइन क्रेडिट करने में विफल रहे।',
            )}
          </li>
          <li>
            <strong>{L('Complimentary Bonus:', 'स्वागत बोनस:')}</strong>{' '}
            {L(
              'The 100 free joining bonus coins carry a 30-day promotional validity.',
              '100 निःशुल्क स्वागत बोनस कॉइन 30 दिनों की प्रचार वैधता के साथ आते हैं।',
            )}
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">5.</span> {L('Code of Conduct & Sanctity Protection', 'आचार संहिता व पवित्रता संरक्षण')}
        </h2>
        <p>
          {L(
            'Users must preserve the sanctity of devotional live broadcasts. Any user engaging in hate speech, blasphemy, obscenity, defamation, harassment, or fraudulent solicitation will face immediate account termination and permanent ban from live chat without refund.',
            'उपयोगकर्ताओं को लाइव भक्ति प्रसारणों की पवित्रता बनाए रखनी होगी। घृणास्पद भाषा, अभद्रता, मानहानि, उत्पीड़न या धोखाधड़ी करने वाले किसी भी उपयोगकर्ता का खाता तुरंत समाप्त कर दिया जाएगा और बिना रिफंड लाइव चैट से स्थायी प्रतिबंध लगा दिया जाएगा।',
          )}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">6.</span> {L('Jurisdiction & Dispute Resolution', 'न्यायिक क्षेत्राधिकार व विवाद निपटान')}
        </h2>
        <p>
          {L(
            'These Terms are governed by and construed in accordance with the laws of the Republic of India. Any legal dispute arising under these terms shall be subject to the exclusive jurisdiction of the competent courts in Mumbai, Maharashtra, India.',
            'ये शर्तें भारत गणराज्य के कानूनों द्वारा शासित हैं। इनके अंतर्गत उत्पन्न किसी भी कानूनी विवाद का न्यायिक क्षेत्राधिकार मुंबई, महाराष्ट्र, भारत के सक्षम न्यायालयों के अधीन होगा।',
          )}
        </p>
      </section>
    </LegalPageFrame>
  );
}

export function RefundContent() {
  const { lang, t: L } = useLang();
  return (
    <LegalPageFrame
      badgeEn="Consumer Protection 2020"
      badgeHi="उपभोक्ता संरक्षण नियम 2020"
      badgeColorClass="text-amber-400"
      titleEn="Refund & Cancellation Policy"
      titleHi="रिफंड व रद्दीकरण नीति"
      subtitleEn="Last Updated: November 2026 • Compliant with Consumer Protection (E-Commerce) Rules, 2020 & RBI PPI Regulations"
      subtitleHi="अंतिम अद्यतन: नवंबर 2026 • उपभोक्ता संरक्षण (ई-कॉमर्स) नियम, 2020 व RBI PPI विनियमों के अनुरूप"
    >
      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">1.</span> {L('Sacred Coins & Pre-Paid Packages', 'पावन कॉइन व प्री-पेड पैक')}
        </h2>
        <div className="p-4 bg-stone-950 border border-stone-800 rounded-2xl flex items-start gap-3">
          <CoinIcon size={28} className="mt-0.5" />
          <div>
            <p className="text-xs sm:text-sm text-stone-300">
              {lang === 'hi' ? (
                <>
                  परम दर्शन कॉइन (जैसे ₹100 में 150 कॉइन स्टार्टर पैक) क्लोज़्ड-लूप डिजिटल क्रेडिट हैं जो विशेष रूप से लाइव वीडियो दर्शन और पावन दक्षिणा अर्पण के लिए हैं। <strong>सभी टॉप-अप कॉइन खरीदारी अंतिम और पूर्णतः नॉन-रिफंडेबल हैं</strong> — सामान्य स्थिति में (भले ही उपयोग न किए गए हों) और खाता विलोपन पर भी, जहाँ शेष वॉलेट कॉइन स्थायी रूप से समाप्त हो जाते हैं। पंडित केवल लाइव प्रसारण और दक्षिणा से अर्जित कॉइन ही भुना सकते हैं, व्यक्तिगत वॉलेट के शुरुआती निःशुल्क या बोनस कॉइन नहीं।
                </>
              ) : (
                <>
                  Param Darshan Coins (such as the 150 Coins for ₹100 starter pack) represent closed-loop, non-monetary digital redemption credits used exclusively for public/private live video darshans and live Sacred Dakshina offerings. <strong>All top-up coin purchases are final and strictly non-refundable</strong> — both normally (even if unused) and after account deletion, where remaining wallet coins are permanently forfeited. Pandits may redeem only coins actually earned from live broadcasts and Dakshina, never initial welcome, free, or bonus coins from a personal wallet.
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">2.</span> {L('Automatic Reconciliation for Failed Top-Ups', 'विफल टॉप-अप का स्वतः मिलान')}
        </h2>
        <p>
          {L(
            'In situations where funds are debited from your bank account or UPI application, but a technical network drop prevents coin balance accretion:',
            'यदि आपके बैंक खाते या UPI ऐप से राशि कट जाती है, लेकिन तकनीकी त्रुटि के कारण वॉलेट में कॉइन नहीं जुड़ पाते हैं:',
          )}
        </p>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-xl">
            <div className="flex items-center gap-2 font-bold text-emerald-400 text-xs mb-1">
              <Clock className="w-4 h-4" /> {L('6-Hour Automated Re-check', '6 घंटे में स्वचालित पुनः जाँच')}
            </div>
            <p className="text-[11px] text-stone-400">
              {L(
                'Our background payment gateway webhooks poll pending orders and credit your coins automatically.',
                'हमारे पेमेंट गेटवे वेबहुक लंबित ऑर्डर की जाँच कर स्वतः आपके कॉइन जोड़ देते हैं।',
              )}
            </p>
          </div>
          <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-xl">
            <div className="flex items-center gap-2 font-bold text-amber-400 text-xs mb-1">
              <RefreshCw className="w-4 h-4" /> {L('48-72h Bank Reversal', '48–72 घंटे में बैंक वापसी')}
            </div>
            <p className="text-[11px] text-stone-400">
              {L(
                'If the payment gateway reports uncaptured funds, the full amount is auto-refunded to your source bank.',
                'यदि पेमेंट गेटवे अपूर्ण (uncaptured) भुगतान रिपोर्ट करता है, तो पूरी राशि स्वतः आपके स्रोत बैंक में लौट आती है।',
              )}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">3.</span> {L('Pandit Pooja Cancellations & Rescheduling', 'पंडित जी द्वारा पूजा रद्दीकरण व पुनर्निर्धारण')}
        </h2>
        <p>
          {L(
            'If a verified Pandit cancels an announced public broadcast or private one-on-one astrological consultation due to technical breakdown or emergency:',
            'यदि कोई सत्यापित पंडित किसी तकनीकी समस्या या आपात स्थिति के कारण घोषित प्रसारण या निजी 1-ऑन-1 परामर्श रद्द करते हैं:',
          )}
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1.5 text-xs text-stone-400">
          <li>{L('100% of any pre-booked coins or dakshina offerings are returned to your Sacred Wallet immediately.', 'किसी भी पूर्व-बुक किए गए कॉइन या दक्षिणा अर्पण का 100% तुरंत आपके वॉलेट में वापस कर दिया जाता है।')}</li>
          <li>{L('You may reschedule the consultation with the same or an alternate verified Pandit without any penalty fee.', 'आप बिना किसी अतिरिक्त शुल्क के उसी या किसी अन्य सत्यापित पंडित जी के साथ सत्र पुनर्निर्धारित कर सकते हैं।')}</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">4.</span> {L('How to Request Assistance', 'सहायता कैसे प्राप्त करें')}
        </h2>
        <p>
          {L(
            'For any payment or billing discrepancies, please reach out to our Devotee Support Desk with your Order ID:',
            'किसी भी भुगतान या बिलिंग विसंगति के लिए कृपया अपने ऑर्डर ID के साथ हमारी भक्त सहायता टीम से संपर्क करें:',
          )}
        </p>
        <div className="mt-2 text-xs text-stone-400 bg-stone-950 p-3 rounded-xl border border-stone-800">
          <strong>{L('Billing Helpdesk:', 'बिलिंग सहायता केंद्र:')}</strong> paramdarshan.com@gmail.com • {L('Average Response Time: Under 2 hours.', 'औसत प्रतिक्रिया समय: 2 घंटे से कम।')}
        </div>
      </section>
    </LegalPageFrame>
  );
}

export function GrievanceContent() {
  const { lang, t: L } = useLang();
  return (
    <LegalPageFrame
      badgeEn="IT Rules 2021 Compliance"
      badgeHi="IT नियम 2021 अनुपालन"
      badgeColorClass="text-amber-400"
      titleEn="Grievance Redressal Mechanism"
      titleHi="शिकायत निवारण तंत्र"
      subtitleEn="Published pursuant to Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021."
      subtitleHi="सूचना प्रौद्योगिकी (मध्यवर्ती दिशानिर्देश और डिजिटल मीडिया आचार संहिता) नियम, 2021 के नियम 3(2) के अंतर्गत प्रकाशित।"
    >
      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">1.</span> {L('Designated Resident Grievance Officer', 'नामित निवासी शिकायत अधिकारी')}
        </h2>
        <p>
          {L(
            'In accordance with the Information Technology Rules, 2021 and DPDP Act 2023, the details of our designated Resident Grievance Officer and Data Protection Officer are as follows:',
            'सूचना प्रौद्योगिकी नियम, 2021 और DPDP अधिनियम 2023 के अनुरूप हमारे नामित निवासी शिकायत अधिकारी एवं डेटा संरक्षण अधिकारी का विवरण निम्नलिखित है:',
          )}
        </p>
        <div className="mt-4 p-5 bg-stone-950 border border-stone-800 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-800 pb-3 gap-2">
            <div>
              <span className="text-white font-bold text-base block">
                {L(
                  'Pt. Rohit Tiwari (Founder) & Pt. Santosh Kumar Shastri (Co-Founder)',
                  'पंडित रोहित तिवारी (संस्थापक) व पंडित संतोष कुमार शास्त्री (सह-संस्थापक)',
                )}
              </span>
              <span className="text-xs text-stone-400">
                {L('Designated Resident Grievance Officers', 'नामित निवासी शिकायत अधिकारी')}
              </span>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-orange-600/20 text-orange-400 border border-orange-500/30 w-fit">
              {L('Resident Grievance Officers', 'निवासी शिकायत अधिकारी')}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-stone-400 block font-medium">{L('Official Grievance Email', 'आधिकारिक शिकायत ईमेल')}</span>
                <a href="mailto:paramdarshan.com@gmail.com" className="text-orange-400 hover:underline font-semibold">
                  paramdarshan.com@gmail.com
                </a>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-stone-400 block font-medium">{L('Physical Postal Address', 'डाक पता')}</span>
                <span>{L('Rohini Sector 15, Rohini, Delhi 110089, India', 'रोहिणी सेक्टर 15, रोहिणी, दिल्ली 110089, भारत')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">2.</span> {L('Mandatory Resolution Timelines', 'अनिवार्य निवारण समय-सीमा')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
              <Clock className="w-4 h-4" /> {L('24 Hours Acknowledgment', '24 घंटे में पावती')}
            </div>
            <p className="text-[11px] text-stone-400">
              {L(
                'Every user complaint or report of objectionable content received will be formally acknowledged with a unique ticket reference number within 24 hours.',
                'प्रत्येक उपयोगकर्ता शिकायत या आपत्तिजनक सामग्री की रिपोर्ट को 24 घंटे के भीतर अद्वितीय टिकट संदर्भ संख्या के साथ पावती दी जाएगी।',
              )}
            </p>
          </div>
          <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
              <ShieldCheck className="w-4 h-4" /> {L('15 Days Complete Redressal', '15 दिनों में पूर्ण निवारण')}
            </div>
            <p className="text-[11px] text-stone-400">
              {L(
                'The Grievance Officer will investigate and dispose of the complaint within 15 calendar days from the date of receipt, issuing a reasoned determination.',
                'शिकायत अधिकारी प्राप्ति की तिथि से 15 कैलेंडर दिनों के भीतर जाँच कर तर्कसंगत निर्णय के साथ शिकायत का निस्तारण करेंगे।',
              )}
            </p>
          </div>
        </div>
      </section>

      <section className="pt-2">
        <GrievanceForm />
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">3.</span> {L('Grievance Appellate Committee (GAC)', 'शिकायत अपीलीय समिति (GAC)')}
        </h2>
        <p>
          {lang === 'hi' ? (
            <>
              यदि कोई उपयोगकर्ता हमारे शिकायत अधिकारी के निर्णय से संतुष्ट नहीं है, तो वे सूचना प्रौद्योगिकी नियम, 2021 के नियम 3A के तहत केंद्र सरकार द्वारा स्थापित <strong>शिकायत अपीलीय समिति (GAC)</strong> के समक्ष अपील दायर कर सकते हैं:
            </>
          ) : (
            <>
              If a user is dissatisfied with the decision of our Grievance Officer, they may prefer an appeal before the central <strong>Grievance Appellate Committee (GAC)</strong> established by the Central Government under Rule 3A of the Information Technology Rules, 2021 via their portal:
            </>
          )}
        </p>
        <div className="mt-2 text-xs">
          <a
            href="https://gac.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-orange-400 hover:text-orange-300 font-semibold"
          >
            <span>{L('Visit MeitY Grievance Appellate Committee (gac.gov.in)', 'MeitY शिकायत अपीलीय समिति पोर्टल देखें (gac.gov.in)')}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>
    </LegalPageFrame>
  );
}

export function PanditGuidelinesContent() {
  const { lang, t: L } = useLang();
  return (
    <LegalPageFrame
      badgeEn="Priesthood Accreditation"
      badgeHi="पुरोहित मान्यता एवं दिशानिर्देश"
      badgeColorClass="text-amber-400"
      titleEn="Pandit Verification & Code of Ethics"
      titleHi="पंडित सत्यापन व आचार संहिता"
      subtitleEn="Upholding Sanatana Dharma authenticity, Vedic scriptural accuracy, and zero exploitation on Param Darshan."
      subtitleHi="परम दर्शन पर सनातन धर्म की प्रामाणिकता, वैदिक शास्त्रीय शुद्धता और शून्य शोषण सुनिश्चित करना।"
    >
      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">1.</span> {L('Mandatory Verification Criteria', 'अनिवार्य सत्यापन मानदंड')}
        </h2>
        <p>
          {lang === 'hi' ? (
            <>
              किसी भी आध्यात्मिक प्रसारक को प्रसारण अधिकार और पावन{' '}
              <VerifiedPanditBadge size={16} className="inline ml-1 mr-1 align-text-bottom" />{' '}
              <strong>सत्यापित पंडित बैज</strong> प्रदान करने से पहले, प्लेटफ़ॉर्म व्यवस्थापक निम्न की जाँच करते हैं:
            </>
          ) : (
            <>
              Before any spiritual streamer is granted broadcasting privileges and awarded the sacred{' '}
              <VerifiedPanditBadge size={16} className="inline ml-1 mr-1 align-text-bottom" />{' '}
              <strong>Verified Pandit Badge</strong>, platform administrators review:
            </>
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="p-4 bg-obsidian-deep border border-gold/15 rounded-xl">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
              <BookOpen className="w-4 h-4" /> {L('Scriptural Background', 'शास्त्रीय पृष्ठभूमि')}
            </div>
            <p className="text-[11px] text-stone-400">
              {L(
                'Declared training from recognized Sanskrit Pathshalas, Vidyapeeths, Jyotish academies, or established temple traditions.',
                'मान्यता प्राप्त संस्कृत पाठशालाओं, विद्यापीठों, ज्योतिष संस्थानों या स्थापित मंदिर परंपराओं से प्राप्त प्रशिक्षण का विवरण।',
              )}
            </p>
          </div>
          <div className="p-4 bg-obsidian-deep border border-gold/15 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs mb-1">
              <ShieldCheck className="w-4 h-4" /> {L('Government Identity KYC', 'सरकारी पहचान KYC')}
            </div>
            <p className="text-[11px] text-stone-400">
              {L(
                'Government photo identification verification (masked Aadhaar/PAN) to prevent impersonation and fraud.',
                'प्रतिरूपण और धोखाधड़ी रोकने के लिए सरकारी फ़ोटो पहचान सत्यापन (मास्क्ड आधार/PAN)।',
              )}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">2.</span> {L('Strict Anti-Superstition Code', 'कठोर अंधविश्वास-विरोधी संहिता')}
        </h2>
        <div className="p-4 bg-red-950/30 border border-red-800/40 rounded-2xl text-xs sm:text-sm text-red-200">
          <div className="flex items-start gap-2.5">
            <AlertOctagon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong>{L('Prohibited Practices:', 'प्रतिबंधित आचरण:')}</strong>{' '}
              {L('Verified Pandits are strictly prohibited from:', 'सत्यापित पंडितों के लिए निम्नलिखित गतिविधियाँ पूर्णतः वर्जित हैं:')}
              <ul className="list-disc pl-5 mt-2 space-y-1 text-red-300">
                <li>{L('Making guarantees of winning lotteries, legal verdicts, or miraculous physical illness cures.', 'लॉटरी जीतने, कानूनी मुकदमों या चमत्कारिक शारीरिक रोग उपचार की झूठी गारंटी देना।')}</li>
                <li>{L('Promoting fear-based or coercive rituals (e.g. Kaal Sarp / Pitra Dosh terror tactics).', 'भय-आधारित या दबाव वाले अनुष्ठानों (जैसे कालसर्प / पितृ दोष का भय दिखाना) को बढ़ावा देना।')}</li>
                <li>{L('Claiming practice of black magic, Vashikaran, or destructive tantric rituals.', 'काला जादू, वशीकरण या अहितकर तांत्रिक अनुष्ठानों का दावा या प्रचार करना।')}</li>
                <li>{L('Demanding cash transfers outside the platform.', 'प्लेटफ़ॉर्म के बाहर सीधे नकद या बैंक ट्रांसफर की मांग करना।')}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <span className="text-amber-400 font-mono">3.</span> {L('Broadcasting Technical Standards', 'प्रसारण तकनीकी मानक')}
        </h2>
        <p>
          {L(
            'Broadcasting Pandits must maintain a dignified, serene sacred altar, adequate acoustic clarity for Vedic mantras, and a stable internet connection supporting at least 720p HD transmission.',
            'प्रसारण करने वाले पंडितों को एक गरिमामय व शांत पूजा वेदी, वैदिक मंत्रों की स्पष्ट ध्वनि और न्यूनतम 720p HD प्रसारण में सक्षम स्थिर इंटरनेट कनेक्शन बनाए रखना होगा।',
          )}
        </p>
      </section>
    </LegalPageFrame>
  );
}
