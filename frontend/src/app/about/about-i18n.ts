export interface FounderTag {
  bilingual: string;
}

export interface VerificationPillar {
  titleEn: string;
  titleHi: string;
  descEn: string;
  descHi: string;
}

export interface CorePillar {
  id: 'lineage' | 'livekit' | 'dpdp';
  titleEn: string;
  titleHi: string;
  descEn: string;
  descHi: string;
}

export const CORE_PILLARS: CorePillar[] = [
  {
    id: 'lineage',
    titleEn: 'Authentic Vedic Lineage',
    titleHi: 'प्रामाणिक वैदिक परंपरा',
    descEn:
      'Every ritual, aarti, and sankalp is led by verified Acharyas and Purohits trained in authentic Sanskrit scriptures, maintaining scriptural fidelity under our founders’ guidance.',
    descHi:
      'प्रत्येक अनुष्ठान, आरती और संकल्प संस्कृत शास्त्रों में प्रशिक्षित सत्यापित आचार्यों व पुरोहितों द्वारा हमारे संस्थापकों के मार्गदर्शन में पूर्ण शास्त्रीय शुचिता के साथ संपन्न होता है।',
  },
  {
    id: 'livekit',
    titleEn: 'Real-Time LiveKit SFU',
    titleHi: 'रीयल-टाइम LiveKit SFU प्रसारण',
    descEn:
      'Unlike buffered social media video feeds, our dedicated WebRTC SFU delivers real-time video and clear acoustic chanting so devotees can participate along with the ritual.',
    descHi:
      'सामान्य सोशल मीडिया वीडियो के विपरीत, हमारा समर्पित WebRTC और LiveKit SFU सिस्टम बिना किसी देरी के स्पष्ट लाइव दर्शन व मंत्रोच्चार पहुँचाता है ताकि भक्त साथ-साथ सहभागी हो सकें।',
  },
  {
    id: 'dpdp',
    titleEn: 'DPDP Act 2023 Compliant',
    titleHi: 'DPDP अधिनियम 2023 के अनुरूप',
    descEn:
      'Engineered with strict adherence to the Digital Personal Data Protection Act 2023, closed-loop wallet security, zero tracker leakage, and end-to-end respect for devotee privacy.',
    descHi:
      'डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम 2023 के पूर्ण अनुपालन, सुरक्षित क्लोज़्ड-लूप वॉलेट, शून्य ट्रैकर लीकेज और भक्त गोपनीयता के सर्वोच्च सम्मान के साथ निर्मित।',
  },
];

export const KYC_PILLARS: VerificationPillar[] = [
  {
    titleEn: '1. Government Identity KYC',
    titleHi: '1. सरकारी पहचान पत्र KYC',
    descEn: 'Submitted government photo identification documents reviewed by administrators.',
    descHi: 'प्रशासकों द्वारा प्रस्तुत सरकारी फ़ोटो पहचान दस्तावेज़ों की गहन समीक्षा।',
  },
  {
    titleEn: '2. Lineage & Temple Background',
    titleHi: '2. परंपरा एवं मंदिर पृष्ठभूमि',
    descEn: 'Applicants declare ritual specialties, years of experience, and temple affiliation.',
    descHi: 'आवेदक अपनी पूजा विशेषज्ञता, अनुभव के वर्षों और मंदिर संबद्धता का विवरण प्रस्तुत करते हैं।',
  },
  {
    titleEn: '3. Anti-Superstition & Ethics Pledge',
    titleHi: '3. अंधविश्वास-विरोधी एवं नैतिकता संकल्प',
    descEn: 'Strict adherence to our policy prohibiting fear-based coercions and false guarantees.',
    descHi: 'भय-आधारित दबाव और झूठे दावों पर पूर्ण प्रतिबंध वाली हमारी आचार संहिता का कड़ाई से पालन।',
  },
  {
    titleEn: '4. Active Moderation & Emergency Controls',
    titleHi: '4. सक्रिय मॉडरेशन एवं आपातकालीन नियंत्रण',
    descEn: 'Ongoing safety reporting, chat word filters, and admin broadcast controls.',
    descHi: 'निरंतर सुरक्षा रिपोर्टिंग, चैट शब्द फ़िल्टर और एडमिन प्रसारण नियंत्रण प्रणाली।',
  },
];
