"use client";

import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { trackAnalytics } from "@/lib/analytics";
import type { Locale } from "@/lib/types";

type OnboardingCardProps = {
  locale: Locale;
};

const storageKey = "herenow.onboarding.seen.v1";

const copy = {
  it: {
    title: "Scopri cosa succede intorno a te",
    points: [
      "Vedi eventi live, imminenti, permanenti e privati",
      "Aggiungi un evento in pochi passaggi"
    ],
    done: "Iniziamo",
    skip: "Salta"
  },
  en: {
    title: "Discover what is happening around you",
    points: ["See live, upcoming, permanent and private events", "Add an event in a few steps"],
    done: "Start",
    skip: "Skip"
  }
};

export default function OnboardingCard({ locale }: OnboardingCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const t = copy[locale];

  useEffect(() => {
    setIsVisible(window.localStorage.getItem(storageKey) !== "true");
  }, []);

  const dismiss = (action: "done" | "skip") => {
    window.localStorage.setItem(storageKey, "true");
    setIsVisible(false);
    trackAnalytics("onboarding_seen", { action });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <aside className="onboarding-card" aria-label={t.title}>
      <div>
        <h2>{t.title}</h2>
        <ul>
          {t.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </div>
      <div className="onboarding-actions">
        <button className="text-button" type="button" onClick={() => dismiss("skip")}>
          <X size={15} aria-hidden="true" />
          {t.skip}
        </button>
        <button className="small-button save" type="button" onClick={() => dismiss("done")}>
          <Check size={15} aria-hidden="true" />
          {t.done}
        </button>
      </div>
    </aside>
  );
}
