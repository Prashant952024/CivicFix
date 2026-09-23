import { useState, useRef, useEffect } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useTranslation, type SupportedLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

type LanguageSelectorProps = {
  className?: string;
  variant?: "navbar" | "compact" | "card";
};

export function LanguageSelector({ className = "", variant = "navbar" }: LanguageSelectorProps) {
  const { language, setLanguage, languages, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const currentLang = languages.find((l) => l.code === language) ?? languages[0];

  if (variant === "card") {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-surface-elevated border border-border/80 ${className}`}>
        {languages.map((l) => {
          const isActive = l.code === language;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => setLanguage(l.code as SupportedLanguage)}
              className={[
                "flex-1 min-w-[80px] py-1.5 px-3 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5",
                isActive
                  ? "bg-primary text-white shadow-sm shadow-teal-950/20 font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/80",
              ].join(" ")}
            >
              <span>{l.nativeLabel}</span>
              {isActive ? <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 h-9 rounded-xl border-border/80 bg-white/90 px-2.5 sm:px-3 text-xs font-semibold text-foreground shadow-sm hover:bg-teal-50/70"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={t("languages.selectLanguage")}
      >
        <Globe className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
        <span className="font-medium">{currentLang.nativeLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200" aria-hidden="true" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-44 origin-top-right rounded-2xl border border-border/80 bg-surface-elevated/95 p-1.5 shadow-xl shadow-teal-950/10 backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">
            {t("languages.selectLanguage")}
          </div>
          {languages.map((l) => {
            const isActive = l.code === language;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setLanguage(l.code as SupportedLanguage);
                  setIsOpen(false);
                }}
                className={[
                  "w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition cursor-pointer text-left",
                  isActive
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-foreground hover:bg-muted/60",
                ].join(" ")}
              >
                <div className="flex flex-col">
                  <span>{l.nativeLabel}</span>
                  <span className="text-[10px] text-muted-foreground">{l.label}</span>
                </div>
                {isActive ? <Check className="h-4 w-4 text-primary shrink-0" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
