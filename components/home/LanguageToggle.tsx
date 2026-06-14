"use client";

import { Globe2 } from "lucide-react";
import type { Locale } from "@/lib/types";

type LanguageToggleProps = {
  locale: Locale;
  onChange: (locale: Locale) => void;
};

export default function LanguageToggle({ locale, onChange }: LanguageToggleProps) {
  const nextLocale = locale === "it" ? "en" : "it";

  return (
    <button
      className="language-toggle"
      type="button"
      title={locale === "it" ? "Passa all'inglese" : "Switch to Italian"}
      aria-label={locale === "it" ? "Passa all'inglese" : "Switch to Italian"}
      onClick={() => onChange(nextLocale)}
    >
      <Globe2 aria-hidden="true" size={18} />
      <span className="language-flag" aria-hidden="true">
        {locale === "it" ? "🇮🇹" : "🇬🇧"}
      </span>
      <span>{locale.toUpperCase()}</span>
    </button>
  );
}
