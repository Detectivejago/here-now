"use client";

import { MapPinned, MessageCircle, Send } from "lucide-react";
import { type FormEvent, useState } from "react";
import { trackAnalytics } from "@/lib/analytics";
import { getBrowserSessionId } from "@/lib/session";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { City, Locale } from "@/lib/types";

type BetaPanelProps = {
  locale: Locale;
  selectedCity?: City;
};

type BetaMode = "feedback" | "city";

const copy = {
  it: {
    badge: "Beta",
    feedback: "Feedback",
    city: "Richiedi città",
    feedbackPlaceholder: "Cosa miglioriamo prima della beta pubblica?",
    cityPlaceholder: "Nome città",
    countryPlaceholder: "Paese opzionale",
    send: "Invia",
    saved: "Grazie, salvato.",
    failed: "Non sono riuscito a salvare. Riprova tra poco.",
    missing: "Scrivi qualcosa prima di inviare."
  },
  en: {
    badge: "Beta",
    feedback: "Feedback",
    city: "Request city",
    feedbackPlaceholder: "What should we improve before public beta?",
    cityPlaceholder: "City name",
    countryPlaceholder: "Optional country",
    send: "Send",
    saved: "Thanks, saved.",
    failed: "I could not save it. Try again soon.",
    missing: "Write something before sending."
  }
};

export default function BetaPanel({ locale, selectedCity }: BetaPanelProps) {
  const [mode, setMode] = useState<BetaMode>("feedback");
  const [feedback, setFeedback] = useState("");
  const [cityName, setCityName] = useState("");
  const [country, setCountry] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const t = copy[locale];

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (mode === "feedback" && !feedback.trim()) {
      setMessage(t.missing);
      return;
    }

    if (mode === "city" && !cityName.trim()) {
      setMessage(t.missing);
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage(t.failed);
      return;
    }

    setIsSaving(true);

    const sessionId = getBrowserSessionId();
    const payload =
      mode === "feedback"
        ? supabase.from("beta_feedback").insert({
            message: feedback.trim(),
            city_id: selectedCity?.id ?? null,
            session_id: sessionId,
            page_path: window.location.pathname
          })
        : supabase.from("city_requests").insert({
            city_name: cityName.trim(),
            country: country.trim() || null,
            session_id: sessionId
          });

    const { error } = await payload;
    setIsSaving(false);

    if (error) {
      setMessage(t.failed);
      return;
    }

    if (mode === "feedback") {
      setFeedback("");
      trackAnalytics("feedback_submitted", { city_id: selectedCity?.id ?? null });
    } else {
      setCityName("");
      setCountry("");
      trackAnalytics("city_requested", { city: cityName.trim() });
    }

    setMessage(t.saved);
  };

  return (
    <section className="beta-panel" aria-label="HereNow beta">
      <div className="beta-panel-heading">
        <span className="beta-badge">{t.badge}</span>
        <div className="beta-mode-switch" aria-label="Beta actions">
          <button
            className={mode === "feedback" ? "active" : ""}
            type="button"
            onClick={() => setMode("feedback")}
          >
            <MessageCircle size={15} aria-hidden="true" />
            {t.feedback}
          </button>
          <button
            className={mode === "city" ? "active" : ""}
            type="button"
            onClick={() => setMode("city")}
          >
            <MapPinned size={15} aria-hidden="true" />
            {t.city}
          </button>
        </div>
      </div>

      <form className="beta-form" onSubmit={submit}>
        {mode === "feedback" ? (
          <textarea
            value={feedback}
            placeholder={t.feedbackPlaceholder}
            onChange={(event) => setFeedback(event.target.value)}
          />
        ) : (
          <div className="beta-city-fields">
            <input
              value={cityName}
              placeholder={t.cityPlaceholder}
              onChange={(event) => setCityName(event.target.value)}
            />
            <input
              value={country}
              placeholder={t.countryPlaceholder}
              onChange={(event) => setCountry(event.target.value)}
            />
          </div>
        )}

        <button className="small-button save" type="submit" disabled={isSaving}>
          <Send size={15} aria-hidden="true" />
          {isSaving ? "..." : t.send}
        </button>
      </form>

      {message ? <p className="beta-message">{message}</p> : null}
    </section>
  );
}
