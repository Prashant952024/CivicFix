import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import enLocale from "./locales/en.json";
import hiLocale from "./locales/hi.json";
import mrLocale from "./locales/mr.json";

export type SupportedLanguage = "en" | "hi" | "mr";

export const SUPPORTED_LANGUAGES: Array<{ code: SupportedLanguage; label: string; nativeLabel: string }> = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी" },
];

const LOCAL_STORAGE_KEY = "civicfix_language";

const localeDictionaries: Record<SupportedLanguage, Record<string, unknown>> = {
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
};

const I18nContext = createContext<I18nContextType | null>(null);

function getInitialLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return "en";
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY) as SupportedLanguage | null;
    if (saved && (saved === "en" || saved === "hi" || saved === "mr")) {
      return saved;
    }
  } catch {
    // ignore storage access errors
  }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(getInitialLanguage);

  const setLanguage = (nextLang: SupportedLanguage) => {
    setLanguageState(nextLang);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, nextLang);
      document.documentElement.lang = nextLang;
    } catch {
      // ignore storage access errors
    }
  };

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = useMemo(() => {
    return (key: string, params?: Record<string, string | number>): string => {
      const currentDict = localeDictionaries[language];
      const enDict = localeDictionaries.en;

      let rawVal = getNestedValue(currentDict, key);
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
    }),
    [language, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    // Provide a fallback if rendered outside provider
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
    };
  }
  return context;
}

export function useLanguage() {
  const { language, setLanguage, languages } = useTranslation();
  return { language, setLanguage, languages };
}
