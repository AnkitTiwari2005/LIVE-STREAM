import type { Lang } from '@/lib/i18n/context';

export type AdminTabKey =
  | 'kpi'
  | 'pandits'
  | 'categories'
  | 'bookings'
  | 'dakshina'
  | 'deletionRequests'
  | 'kyc'
  | 'streams'
  | 'reports'
  | 'wordFilters'
  | 'users'
  | 'audit'
  | 'banner';

export type ConfirmActionType =
  | 'endStream'
  | 'deleteWord'
  | 'deleteCategory'
  | 'approveDeletion'
  | 'rejectDeletion';

export const ADMIN_STATUS_HI: Record<string, string> = {
  ALL: 'सभी',
  APPROVED: 'स्वीकृत',
  PENDING: 'लंबित',
  MORE_INFO_NEEDED: 'अतिरिक्त जानकारी आवश्यक',
  REJECTED: 'अस्वीकृत',
  SUCCESS: 'सफल',
  FAILED: 'विफल',
  ACTIVE: 'सक्रिय',
  SUSPENDED: 'निलंबित',
  BANNED: 'प्रतिबंधित',
  ADMIN: 'एडमिन',
  STREAMER: 'पंडित जी',
  VIEWER: 'भक्त',
  OPEN: 'खुला',
  ACTION_TAKEN: 'कार्रवाई की गई',
  DISMISSED: 'खारिज',
  BLOCKED: 'अवरुद्ध',
  WARNING: 'चेतावनी',
  FLAG: 'समीक्षा हेतु चिह्नित',
  STREAM: 'प्रसारण',
  USER: 'उपयोगकर्ता',
  CHAT_MESSAGE: 'चैट संदेश',
};

export function translateAdminToken(token: string | undefined | null, lang: Lang): string {
  if (!token) return '';
  if (lang !== 'hi') return token;
  return ADMIN_STATUS_HI[token] || token;
}

export const CONFIRM_COPY: Record<
  ConfirmActionType,
  {
    titleEn: string;
    titleHi: string;
    descEn: (label?: string) => string;
    descHi: (label?: string) => string;
    confirmEn: string;
    confirmHi: string;
    variant: 'danger' | 'warning';
  }
> = {
  endStream: {
    titleEn: 'Emergency Force-End Stream',
    titleHi: 'आपातकालीन लाइव प्रसारण समाप्ति',
    descEn: () =>
      'Emergency Action: Force end this stream immediately on LiveKit SFU? Connected participants will be disconnected right away.',
    descHi: () =>
      'आपातकालीन कार्रवाई: क्या आप LiveKit SFU पर इस प्रसारण को तुरंत समाप्त करना चाहते हैं? जुड़े हुए सभी सहभागी तुरंत डिस्कनेक्ट हो जाएँगे।',
    confirmEn: 'Force End Stream',
    confirmHi: 'प्रसारण तुरंत समाप्त करें',
    variant: 'danger',
  },
  deleteCategory: {
    titleEn: 'Delete Stream Category',
    titleHi: 'प्रसारण श्रेणी हटाएँ',
    descEn: () =>
      'Delete this category? If any streams are assigned to it, the action will be blocked to protect platform integrity.',
    descHi: () =>
      'क्या इस श्रेणी को हटाना है? यदि इससे कोई प्रसारण जुड़ा है, तो प्लेटफ़ॉर्म अखंडता की सुरक्षा के लिए यह कार्रवाई रोक दी जाएगी।',
    confirmEn: 'Delete Category',
    confirmHi: 'श्रेणी हटाएँ',
    variant: 'danger',
  },
  approveDeletion: {
    titleEn: 'Approve & Permanently Erase Pandit Account',
    titleHi: 'पंडित खाता विलोपन स्वीकृत कर स्थायी रूप से मिटाएँ',
    descEn: (label) =>
      `Permanently erase "${label || 'this pandit'}" under DPDP Act 2023? All personal details, KYC files, credentials, and remaining wallet coins will be wiped permanently (no refund). This succeeds only when dueCoins === 0.`,
    descHi: (label) =>
      `क्या DPDP अधिनियम 2023 के तहत "${label || 'इस पंडित'}" का खाता स्थायी रूप से मिटाना है? सभी व्यक्तिगत विवरण, KYC फ़ाइलें व शेष वॉलेट कॉइन स्थायी रूप से मिट जाएँगे (कोई रिफंड नहीं)। यह केवल बकाया कॉइन 0 (dueCoins === 0) होने पर ही सफल होगा।`,
    confirmEn: 'Approve & Erase',
    confirmHi: 'स्वीकृत कर मिटाएँ',
    variant: 'danger',
  },
  rejectDeletion: {
    titleEn: 'Restore Account to Active',
    titleHi: 'खाता पुनः सक्रिय करें',
    descEn: (label) =>
      `Cancel deletion request and restore "${label || 'this user'}" back to ACTIVE status?`,
    descHi: (label) =>
      `क्या विलोपन अनुरोध रद्द करके "${label || 'इस उपयोगकर्ता'}" को पुनः सक्रिय (ACTIVE) स्थिति में बहाल करना है?`,
    confirmEn: 'Restore Account',
    confirmHi: 'खाता बहाल करें',
    variant: 'warning',
  },
  deleteWord: {
    titleEn: 'Remove Chat Filter Word',
    titleHi: 'चैट फ़िल्टर शब्द हटाएँ',
    descEn: () => 'Remove this word from the prohibited chat filter list?',
    descHi: () => 'क्या इस शब्द को प्रतिबंधित चैट फ़िल्टर सूची से हटाना है?',
    confirmEn: 'Remove Word',
    confirmHi: 'शब्द हटाएँ',
    variant: 'danger',
  },
};
