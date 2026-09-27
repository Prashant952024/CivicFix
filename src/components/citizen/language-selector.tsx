import { useState, useRef, useEffect, useMemo } from "react";
import { Globe, Check, ChevronDown, Search } from "lucide-react";
import { useAppSession } from "@/auth/app-session";
import { useTranslation, type SupportedLanguage } from "@/lib/i18n";
import { syncUserProfileLanguage } from "@/lib/translation";
import { Button } from "@/components/ui/button";

type LanguageSelectorProps = {
  className?: string;
  variant?: "navbar" | "compact" | "card" | "pill";
};

// Popular fast-toggle languages for pill view
const POPULAR_PILL_LANGUAGES: SupportedLanguage[] = ["en", "hi", "mr", "ta", "te", "bn", "ur"];

export function LanguageSelector({ className = "", variant = "navbar" }: LanguageSelectorProps) {
  const { language, setLanguage, languages, t } = useTranslation();
  const { profile } = useAppSession();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Focus search input on open
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const currentLang = languages.find((l) => l.code === language) ?? languages[0];

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return languages;
    const q = searchQuery.toLowerCase().trim();
    return languages.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.nativeLabel.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [languages, searchQuery]);

  function handleLanguageChange(nextLang: SupportedLanguage) {
    setLanguage(nextLang);
    if (profile?.id) {
      void syncUserProfileLanguage(profile.id, nextLang);
    }
    setIsOpen(false);
    setSearchQuery("");
  }

  // Pill view for dashboard hero
  if (variant === "pill" || variant === "card") {
    const isCurrentInPills = POPULAR_PILL_LANGUAGES.includes(language);

    return (
      <div className={`relative inline-flex items-center flex-wrap gap-1.5 p-1 rounded-2xl bg-surface-elevated/90 border border-border/80 shadow-xs ${className}`} ref={containerRef}>
        {POPULAR_PILL_LANGUAGES.map((code) => {
          const l = languages.find((item) => item.code === code);
          if (!l) return null;
          const isActive = l.code === language;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => handleLanguageChange(l.code as SupportedLanguage)}
              className={[
                "py-1.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                isActive
                  ? "bg-primary text-white shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/80",
              ].join(" ")}
            >
              <span>{l.nativeLabel}</span>
              {isActive ? <Check className="h-3 w-3 shrink-0" aria-hidden="true" /> : null}
            </button>
          );
        })}

        {/* More Languages Dropdown Trigger */}
        <div className="relative">
          <Button
            type="button"
            variant={!isCurrentInPills ? "default" : "outline"}
            size="xs"
            onClick={() => setIsOpen((prev) => !prev)}
            className={[
              "h-8 px-2.5 rounded-xl text-xs font-medium cursor-pointer flex items-center gap-1",
              !isCurrentInPills ? "bg-primary text-white font-bold" : "bg-white hover:bg-teal-50",
            ].join(" ")}
            aria-label="More Indic Languages"
          >
            <span>{!isCurrentInPills ? currentLang.nativeLabel : t("languages.more") || "More (20+)"}</span>
            <ChevronDown className="h-3 w-3 shrink-0" aria-hidden="true" />
          </Button>

          {isOpen && (
            <div className="absolute right-0 mt-1.5 w-64 max-h-80 overflow-hidden rounded-2xl border border-border/80 bg-surface-elevated/95 shadow-xl shadow-teal-950/15 backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col">
              <div className="p-2 border-b border-border/60 bg-muted/30">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Indic language..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-background border border-border/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="overflow-y-auto max-h-60 p-1 divide-y divide-border/20">
                {filteredLanguages.map((l) => {
                  const isActive = l.code === language;
                  return (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => handleLanguageChange(l.code as SupportedLanguage)}
                      className={[
                        "w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition cursor-pointer text-left",
                        isActive ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted/60",
                      ].join(" ")}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{l.nativeLabel}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {l.label} {l.direction === "rtl" ? "• RTL" : ""}
                        </span>
                      </div>
                      {isActive ? <Check className="h-4 w-4 text-primary shrink-0" aria-hidden="true" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Navbar / Compact Dropdown variant
  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 h-9 rounded-xl border-border/80 bg-white/90 px-2.5 sm:px-3 text-xs font-semibold text-foreground shadow-xs hover:bg-teal-50/70"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={t("languages.selectLanguage")}
      >
        <Globe className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
        <span className="font-medium">{currentLang.nativeLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200" aria-hidden="true" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 max-h-88 overflow-hidden rounded-2xl border border-border/80 bg-surface-elevated/95 shadow-xl shadow-teal-950/15 backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col">
          <div className="p-2 border-b border-border/60 bg-muted/30">
            <div className="px-1 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              {t("languages.selectLanguage")} (20 Indic Languages)
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search language..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-background border border-border/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-64 p-1 divide-y divide-border/20">
            {filteredLanguages.map((l) => {
              const isActive = l.code === language;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => handleLanguageChange(l.code as SupportedLanguage)}
                  className={[
                    "w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition cursor-pointer text-left",
                    isActive ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted/60",
                  ].join(" ")}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{l.nativeLabel}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {l.label} {l.direction === "rtl" ? "• RTL" : ""}
                    </span>
                  </div>
                  {isActive ? <Check className="h-4 w-4 text-primary shrink-0" aria-hidden="true" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
