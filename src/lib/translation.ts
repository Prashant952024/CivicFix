import { supabase } from "@/lib/supabase";
import {
  LANGUAGE_CONFIG,
  SUPPORTED_INDIC_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  getLanguageConfig,
  getLanguageDisplayName,
  getLanguageNativeLabel,
  isRtlLanguage,
  type LanguageCode,
} from "@/lib/languages";

export {
  LANGUAGE_CONFIG,
  SUPPORTED_INDIC_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  getLanguageConfig,
  getLanguageDisplayName,
  getLanguageNativeLabel,
  isRtlLanguage,
  type LanguageCode,
};

/**
 * Syncs the user's preferred language to their profile in Supabase.
 * Fails silently if user is unauthenticated or network is unavailable.
 */
export async function syncUserProfileLanguage(
  profileId: string | null | undefined,
  language: string,
): Promise<void> {
  if (!profileId) return;
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ preferred_language: language })
      .eq("id", profileId);

    if (error && import.meta.env.DEV) {
      console.warn("[i18n] Could not sync preferred_language to profile:", error.message);
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("[i18n] Error syncing language to profile:", err);
    }
  }
}

/**
 * Localized department names for dynamic citizen messages
 */
const DEPARTMENT_LOCALIZATIONS: Record<string, Record<string, string>> = {
  "roads": {
    en: "Roads & Infrastructure Department",
    hi: "सड़क एवं अवसंरचना विभाग",
    mr: "रस्ते व पायाभूत सुविधा विभाग",
    ta: "சாலைகள் மற்றும் உள்கட்டமைப்பு துறை",
    te: "రోడ్లు మరియు మౌలిక సదుపాయాల విభాగం",
    bn: "সড়ক ও অবকাঠামো বিভাগ",
    gu: "માર્ગ અને ઇન્ફ્રાસ્ટ્રક્ચર વિભાગ",
    pa: "ਸੜਕਾਂ ਅਤੇ ਬੁਨਿਆਦੀ ਢਾਂਚਾ ਵਿਭਾਗ",
    kn: "ರಸ್ತೆಗಳು ಮತ್ತು ಮೂಲಸೌಕರ್ಯ ಇಲಾಖೆ",
    ml: "റോഡുകളും അടിസ്ഥാന സൗകര്യങ്ങളും വകുപ്പ്",
    ur: "شعبہ سڑکیں اور بنیادی ڈھانچہ",
  },
  "water supply": {
    en: "Water Supply Department",
    hi: "जल आपूर्ति विभाग",
    mr: "पाणी पुरवठा विभाग",
    ta: "குடிநீர் வழங்கல் துறை",
    te: "నీటి సరఫరా విభాగం",
    bn: "পানি সরবরাহ বিভাগ",
    gu: "પાણી પુરવઠા વિભાગ",
    pa: "ਪਾਣੀ ਸਪਲਾਈ ਵਿਭਾਗ",
    kn: "ನೀರು ಸರಬರಾಜು ಇಲಾಖೆ",
    ml: "ജലവിതരണ വകുപ്പ്",
    ur: "شعبہ فراہمی آب",
  },
  "electricity": {
    en: "Electrical & Street Lighting Department",
    hi: "विद्युत एवं प्रकाश व्यवस्था विभाग",
    mr: "विद्युत व पथदिवे विभाग",
    ta: "மின்சாரம் மற்றும் தெருவிளக்குகள் துறை",
    te: "విద్యుత్ మరియు వీధి దీపాల విభాగం",
    bn: "বিদ্যুৎ ও সড়ক বাতি বিভাগ",
    gu: "વીજળી અને સ્ટ્રીટ લાઇટિંગ વિભાગ",
    pa: "ਬਿਜਲੀ ਅਤੇ ਸਟ੍ਰੀਟ ਲਾਈਟਿੰਗ ਵਿਭਾਗ",
    kn: "ವಿದ್ಯುತ್ ಮತ್ತು ಬೀದಿ ದೀಪಗಳ ಇಲಾಖೆ",
    ml: "വൈദ്യുതി, തെരുവ് വിളക്ക് വകുപ്പ്",
    ur: "شعبہ بجلی و اسٹریٹ لائٹس",
  },
  "waste management": {
    en: "Solid Waste Management Department",
    hi: "ठोस अपशिष्ट प्रबंधन विभाग",
    mr: "घनकचरा व्यवस्थापन विभाग",
    ta: "திடக்கழிவு மேலாண்மை துறை",
    te: "ఘన వ్యర్థాల నిర్వహణ విభాగం",
    bn: "কঠিন বর্জ্য ব্যবস্থাপনা বিভাগ",
    gu: "ઘન કચરા વ્યવસ્થાપન વિભાગ",
    pa: "ਠੋਸ ਰਹਿੰਦ-ਖੂੰਹਦ ਪ੍ਰਬੰਧਨ ਵਿਭਾਗ",
    kn: "ಘನತ್ಯಾಜ್ಯ ನಿರ್ವಹಣೆ ಇಲಾಖೆ",
    ml: "ഖരമാലിന്യ സംസ്കരണ വകുപ്പ്",
    ur: "شعبہ سالڈ ویسٹ مینجمنٹ",
  },
  "drainage": {
    en: "Drainage & Sewerage Department",
    hi: "जल निकासी एवं सीवरेज विभाग",
    mr: "सांडपाणी व गटार विभाग",
    ta: "வடிகால் மற்றும் கழிவுநீர் துறை",
    te: "డ్రైనేజీ మరియు మురుగునీటి విభాగం",
    bn: "নিষ্কাশন ও পয়ঃনিষ্কাশন বিভাগ",
    gu: "ડ્રેનેજ અને ગટર વ્યવસ્થા વિભાગ",
    pa: "ਨਿਕਾਸੀ ਅਤੇ ਸੀਵਰੇਜ ਵਿਭਾਗ",
    kn: "ಒಳಚರಂಡಿ ಮತ್ತು ತ್ಯಾಜ್ಯನೀರು ಇಲಾಖೆ",
    ml: "ഡ്രെയിനേജ്, മലിനജല വകുപ്പ്",
    ur: "شعبہ نکاسی آب و سیوریج",
  },
  "health & sanitation": {
    en: "Public Health & Sanitation Department",
    hi: "सार्वजनिक स्वास्थ्य एवं स्वच्छता विभाग",
    mr: "सार्वजनिक आरोग्य व स्वच्छता विभाग",
    ta: "பொது சுகாதாரம் மற்றும் துப்புரவு துறை",
    te: "ప్రజారోగ్యం మరియు పారిశుధ్య విభాగం",
    bn: "জনস্বাস্থ্য ও স্যানিটেশন বিভাগ",
    gu: "જાહેર આરોગ્ય અને સ્વચ્છતા વિભાગ",
    pa: "ਜਨਤਕ ਸਿਹਤ ਅਤੇ ਸਵੱਛਤਾ ਵਿਭਾਗ",
    kn: "ಸಾರ್ವಜನಿಕ ಆರೋಗ್ಯ ಮತ್ತು ನೈರ್ಮಲ್ಯ ಇಲಾಖೆ",
    ml: "പൊതുജനാരോഗ്യ, ശുചിത്വ വകുപ്പ്",
    ur: "شعبہ پبلک ہیلتھ اور صفائی ستھرائی",
  },
  "traffic": {
    en: "Traffic & Urban Mobility Department",
    hi: "यातायात एवं शहरी गतिशीलता विभाग",
    mr: "वाहतूक व नागरी गतिशीलता विभाग",
    ta: "போக்குவரத்து மற்றும் நகர்ப்புற நடமாட்டத் துறை",
    te: "ట్రాఫిక్ మరియు అర్బన్ మొబిలిటీ విభాగం",
    bn: "ট্র্যাফিক ও নগর গতিশীলতা বিভাগ",
    gu: "ટ્રાફિક અને શહેરી ગતિશીલતા વિભાગ",
    pa: "ਟ੍ਰੈਫਿਕ ਅਤੇ ਸ਼ਹਿਰੀ ਗਤੀਸ਼ੀਲਤਾ ਵਿਭਾਗ",
    kn: "ಸಂಚಾರ ಮತ್ತು ನಗರ ಚಲನಶೀಲತೆ ಇಲಾಖೆ",
    ml: "ട്രാഫിക്, അർബൻ മൊബിലിറ്റി വകുപ്പ്",
    ur: "شعبہ ٹریفک اور شہری نقل و حرکت",
  },
  "environment": {
    en: "Environment & Horticulture Department",
    hi: "पर्यावरण एवं उद्यानिकी विभाग",
    mr: "पर्यावरण व उद्यान विभाग",
    ta: "சுற்றுச்சூழல் மற்றும் தோட்டக்கலைத் துறை",
    te: "పర్యావరణం మరియు ఉద్యానవన విభాగం",
    bn: "পরিবেশ ও উদ্যানতত্ত্ব বিভাগ",
    gu: "પર્યાવરણ અને બાગાયત વિભાગ",
    pa: "ਵਾਤਾਵਰਣ ਅਤੇ ਬਾਗਬਾਨੀ ਵਿਭਾਗ",
    kn: "ಪರಿಸರ ಮತ್ತು ತೋಟಗಾರಿಕೆ ಇಲಾಖೆ",
    ml: "പരിസ്ഥിതി, ഹോർട്ടികൾച്ചർ വകുപ്പ്",
    ur: "شعبہ ماحولیات اور باغبانی",
  },
};

export function getLocalizedDepartmentName(name: string | null | undefined, lang: string): string {
  if (!name) return "";
  const lower = name.toLowerCase();
  for (const [key, map] of Object.entries(DEPARTMENT_LOCALIZATIONS)) {
    if (lower.includes(key)) {
      return map[lang] || map.en || name;
    }
  }
  return name;
}
