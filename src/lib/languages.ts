export type LanguageCode =
  | "en"
  | "hi"
  | "mr"
  | "bn"
  | "gu"
  | "pa"
  | "ta"
  | "te"
  | "kn"
  | "ml"
  | "or"
  | "as"
  | "ur"
  | "sa"
  | "ne"
  | "kok"
  | "ks"
  | "sd"
  | "mai"
  | "mni";

export type LanguageDirection = "ltr" | "rtl";

export type LanguageConfig = {
  code: LanguageCode;
  name: string;
  nativeName: string;
  locale: string;
  script: string;
  direction: LanguageDirection;
  voiceSupported: boolean;
  uiTranslationAvailable: boolean;
  dynamicTranslationAvailable: boolean;
};

export const LANGUAGE_CONFIG: Record<LanguageCode, LanguageConfig> = {
  en: {
    code: "en",
    name: "English",
    nativeName: "English",
    locale: "en-IN",
    script: "Latin",
    direction: "ltr",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
  hi: {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    locale: "hi-IN",
    script: "Devanagari",
    direction: "ltr",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
  mr: {
    code: "mr",
    name: "Marathi",
    nativeName: "मराठी",
    locale: "mr-IN",
    script: "Devanagari",
    direction: "ltr",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
  bn: {
    code: "bn",
    name: "Bengali",
    nativeName: "বাংলা",
    locale: "bn-IN",
    script: "Bengali",
    direction: "ltr",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
  gu: {
    code: "gu",
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    locale: "gu-IN",
    script: "Gujarati",
    direction: "ltr",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
  pa: {
    code: "pa",
    name: "Punjabi",
    nativeName: "ਪੰਜਾਬੀ",
    locale: "pa-IN",
    script: "Gurmukhi",
    direction: "ltr",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
  ta: {
    code: "ta",
    name: "Tamil",
    nativeName: "தமிழ்",
    locale: "ta-IN",
    script: "Tamil",
    direction: "ltr",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
  te: {
    code: "te",
    name: "Telugu",
    nativeName: "తెలుగు",
    locale: "te-IN",
    script: "Telugu",
    direction: "ltr",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
  kn: {
    code: "kn",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    locale: "kn-IN",
    script: "Kannada",
    direction: "ltr",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
  ml: {
    code: "ml",
    name: "Malayalam",
    nativeName: "മലയാളം",
    locale: "ml-IN",
    script: "Malayalam",
    direction: "ltr",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
  or: {
    code: "or",
    name: "Odia",
    nativeName: "ଓଡ଼ିଆ",
    locale: "or-IN",
    script: "Odia",
    direction: "ltr",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
  as: {
    code: "as",
    name: "Assamese",
    nativeName: "অসমীয়া",
    locale: "as-IN",
    script: "Assamese",
    direction: "ltr",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
  ur: {
    code: "ur",
    name: "Urdu",
    nativeName: "اردو",
    locale: "ur-IN",
    script: "Arabic",
    direction: "rtl",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
  sa: {
    code: "sa",
    name: "Sanskrit",
    nativeName: "संस्कृतम्",
    locale: "sa-IN",
    script: "Devanagari",
    direction: "ltr",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
  ne: {
    code: "ne",
    name: "Nepali",
    nativeName: "नेपाली",
    locale: "ne-NP",
    script: "Devanagari",
    direction: "ltr",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
  kok: {
    code: "kok",
    name: "Konkani",
    nativeName: "कोंकणी",
    locale: "kok-IN",
    script: "Devanagari",
    direction: "ltr",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
  ks: {
    code: "ks",
    name: "Kashmiri",
    nativeName: "कॉशुर / کٲشُر",
    locale: "ks-IN",
    script: "Arabic/Devanagari",
    direction: "rtl",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
  sd: {
    code: "sd",
    name: "Sindhi",
    nativeName: "سنڌي / सिन्धी",
    locale: "sd-IN",
    script: "Arabic/Devanagari",
    direction: "rtl",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
  mai: {
    code: "mai",
    name: "Maithili",
    nativeName: "मैथिली",
    locale: "mai-IN",
    script: "Devanagari",
    direction: "ltr",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
  mni: {
    code: "mni",
    name: "Manipuri",
    nativeName: "মৈতৈলোন্ / Meitei",
    locale: "mni-IN",
    script: "Meetei Mayek",
    direction: "ltr",
    voiceSupported: true,
    uiTranslationAvailable: true,
    dynamicTranslationAvailable: true,
  },
};

export const SUPPORTED_INDIC_LANGUAGES: LanguageConfig[] = Object.values(LANGUAGE_CONFIG);

export const SUPPORTED_LANGUAGE_CODES: LanguageCode[] = Object.keys(LANGUAGE_CONFIG) as LanguageCode[];

export function getLanguageConfig(code?: string | null): LanguageConfig {
  if (!code) return LANGUAGE_CONFIG.en;
  const normalized = code.trim().toLowerCase() as LanguageCode;
  return LANGUAGE_CONFIG[normalized] || LANGUAGE_CONFIG.en;
}

export function isRtlLanguage(code?: string | null): boolean {
  if (!code) return false;
  return getLanguageConfig(code).direction === "rtl";
}

export function getLanguageDisplayName(code?: string | null, fallback = "English"): string {
  if (!code) return fallback;
  const config = getLanguageConfig(code);
  return `${config.nativeName} — ${config.name}`;
}

export function getLanguageNativeLabel(code?: string | null, fallback = "English"): string {
  if (!code) return fallback;
  return getLanguageConfig(code).nativeName;
}
