"use client";

import { Flag, Send, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { trackAnalytics } from "@/lib/analytics";
import { getBrowserSessionId } from "@/lib/session";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { EventReportReason } from "@/lib/types";

type ReportEventButtonProps = {
  eventId: string;
  compact?: boolean;
};

const reasons: { value: EventReportReason; label: string }[] = [
  { value: "not_existing", label: "Evento non esiste" },
  { value: "wrong_time", label: "Orario sbagliato" },
  { value: "wrong_place", label: "Luogo sbagliato" },
  { value: "inappropriate", label: "Contenuto inappropriato" },
  { value: "duplicate", label: "Duplicato" },
  { value: "other", label: "Altro" }
];

export default function ReportEventButton({ eventId, compact = false }: ReportEventButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<EventReportReason>("wrong_time");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("Segnalazione non salvata. Riprova tra poco.");
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.from("event_reports").insert({
      event_id: eventId,
      reason,
      details: details.trim() || null,
      reporter_session_id: getBrowserSessionId()
    });
    setIsSaving(false);

    if (error) {
      setMessage("Segnalazione non salvata. Riprova tra poco.");
      return;
    }

    trackAnalytics("event_reported", { event_id: eventId, reason });
    setDetails("");
    setMessage("Grazie, controlleremo questo evento.");
    setTimeout(() => setIsOpen(false), 1200);
  };

  if (!isOpen) {
    return (
      <button
        className={compact ? "report-trigger compact" : "report-trigger"}
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <Flag size={15} aria-hidden="true" />
        Segnala
      </button>
    );
  }

  return (
    <form className="report-card" onSubmit={submit}>
      <div className="report-heading">
        <strong>Segnala evento</strong>
        <button className="icon-button tiny" type="button" title="Chiudi" onClick={() => setIsOpen(false)}>
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      <div className="choice-grid compact">
        {reasons.map((item) => (
          <button
            className={reason === item.value ? "choice-card active" : "choice-card"}
            key={item.value}
            type="button"
            onClick={() => setReason(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <label className="field">
        Messaggio opzionale
        <textarea value={details} onChange={(event) => setDetails(event.target.value)} />
      </label>
      <button className="small-button save" type="submit" disabled={isSaving}>
        <Send size={15} aria-hidden="true" />
        {isSaving ? "..." : "Invia"}
      </button>
      {message ? <p className="form-message">{message}</p> : null}
    </form>
  );
}
