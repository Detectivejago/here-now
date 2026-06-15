"use client";

import { ExternalLink, Lock, MapPin } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { unlockEventDetails } from "@/app/event/[id]/actions";

type LockedEventDetailsProps = {
  eventId: string;
};

type UnlockedDetails = {
  description: string;
  address: string | null;
  latitude: number;
  longitude: number;
  image_url: string | null;
};

function mapsUrl(details: UnlockedDetails) {
  const query = details.address
    ? `${details.address} ${details.latitude},${details.longitude}`
    : `${details.latitude},${details.longitude}`;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function getUnlockStorageKey(eventId: string) {
  return `herenow.unlockedEvent.${eventId}`;
}

export default function LockedEventDetails({ eventId }: LockedEventDetailsProps) {
  const [password, setPassword] = useState("");
  const [details, setDetails] = useState<UnlockedDetails | null>(null);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(getUnlockStorageKey(eventId));

    if (!stored) {
      return;
    }

    try {
      setDetails(JSON.parse(stored) as UnlockedDetails);
    } catch {
      window.sessionStorage.removeItem(getUnlockStorageKey(eventId));
    }
  }, [eventId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    const result = await unlockEventDetails(eventId, password);
    setIsSaving(false);

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setDetails(result.details);
    window.sessionStorage.setItem(getUnlockStorageKey(eventId), JSON.stringify(result.details));
    setPassword("");
  };

  if (details) {
    return (
      <div className="unlocked-event-details">
        <p className="event-popup-description">{details.description}</p>
        {details.address ? (
          <p className="event-private-meta">
            <MapPin size={14} aria-hidden="true" /> {details.address}
          </p>
        ) : null}
        <a className="maps-button detail-map-link" href={mapsUrl(details)} target="_blank" rel="noreferrer">
          <ExternalLink size={14} aria-hidden="true" />
          Apri in Maps
        </a>
      </div>
    );
  }

  return (
    <form className="unlock-card" onSubmit={submit}>
      <div className="unlock-heading">
        <Lock size={17} aria-hidden="true" />
        <strong>Dettagli protetti</strong>
      </div>
      <p>Inserisci la password per vedere descrizione completa e luogo preciso.</p>
      <label className="field">
        Password evento
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <button className="small-button save" type="submit" disabled={isSaving}>
        {isSaving ? "..." : "Sblocca"}
      </button>
      {message ? <p className="form-message error">{message}</p> : null}
    </form>
  );
}
