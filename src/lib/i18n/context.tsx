import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import enLocale from "./locales/en.json";
import hiLocale from "./locales/hi.json";
import mrLocale from "./locales/mr.json";
import {
  LANGUAGE_CONFIG,
  SUPPORTED_INDIC_LANGUAGES,
  isRtlLanguage,
  type LanguageCode,
  type LanguageConfig,
} from "@/lib/languages";

export type SupportedLanguage = LanguageCode;

export const SUPPORTED_LANGUAGES: Array<{ code: SupportedLanguage; label: string; nativeLabel: string; direction: "ltr" | "rtl" }> =
  SUPPORTED_INDIC_LANGUAGES.map((l) => ({
    code: l.code,
    label: l.name,
    nativeLabel: l.nativeName,
    direction: l.direction,
  }));

const LOCAL_STORAGE_KEY = "civicfix_language";

// Static dictionaries available
const staticLocaleDictionaries: Record<string, Record<string, unknown>> = {
  en: enLocale,
  hi: hiLocale,
  mr: mrLocale,
};

function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const parts = path.split(".");
  let current: any = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return key in params ? String(params[key]) : `{{${key}}}`;
  });
}

type I18nContextType = {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  languages: typeof SUPPORTED_LANGUAGES;
  direction: "ltr" | "rtl";
  isRtl: boolean;
};

const I18nContext = createContext<I18nContextType | null>(null);

function getInitialLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY) as SupportedLanguage | null;
    if (saved && saved in LANGUAGE_CONFIG) {
      return saved;
    }
  } catch {
    // ignore storage access errors
  }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(getInitialLanguage);

  const direction: "ltr" | "rtl" = useMemo(() => (isRtlLanguage(language) ? "rtl" : "ltr"), [language]);
  const isRtl = direction === "rtl";

  const setLanguage = (nextLang: SupportedLanguage) => {
    setLanguageState(nextLang);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, nextLang);
    } catch {
      // ignore storage access errors
    }
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.dir = direction;
    }
  }, [language, direction]);

  const t = useMemo(() => {
    return (key: string, params?: Record<string, string | number>): string => {
      const currentDict = staticLocaleDictionaries[language];
      const enDict = staticLocaleDictionaries.en;

      let rawVal = currentDict ? getNestedValue(currentDict, key) : undefined;
      if (typeof rawVal !== "string") {
        rawVal = getNestedValue(enDict, key);
      }

      if (typeof rawVal === "string") {
        return interpolate(rawVal, params);
      }

      // Return the key itself as a graceful fallback if missing
      return key;
    };
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      languages: SUPPORTED_LANGUAGES,
      direction,
      isRtl,
    }),
    [language, direction, isRtl, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    return {
      language: "en" as SupportedLanguage,
      setLanguage: () => {},
      t: (key: string, params?: Record<string, string | number>) => {
        const rawVal = getNestedValue(enLocale, key);
        if (typeof rawVal === "string") {
          return interpolate(rawVal, params);
        }
        return key;
      },
      languages: SUPPORTED_LANGUAGES,
      direction: "ltr" as const,
      isRtl: false,
    };
  }
  return context;
}

export function useLanguage() {
  const { language, setLanguage, languages, direction, isRtl } = useTranslation();
  return { language, setLanguage, languages, direction, isRtl };
}
