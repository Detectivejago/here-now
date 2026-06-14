"use client";

import { X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import PillButton from "@/components/ui/PillButton";
import { trackAnalytics } from "@/lib/analytics";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { City, Locale } from "@/lib/types";

type CreateClubModalProps = {
  cities: City[];
  locale: Locale;
  selectedCityId?: string;
  onClose: () => void;
  onCreated: () => void;
};

const labels = {
  it: {
    title: "Crea Club",
    name: "Nome club",
    description: "Descrizione",
    city: "Città",
    save: "Invia club",
    missingSupabase: "Configura Supabase per creare club reali.",
    authNeeded: "Accedi per creare un club.",
    success: "Club inviato: resterà pending finché un admin lo approva.",
    failed: "Non sono riuscito a salvare il club."
  },
  en: {
    title: "Create Club",
    name: "Club name",
    description: "Description",
    city: "City",
    save: "Submit club",
    missingSupabase: "Configure Supabase to create real clubs.",
    authNeeded: "Sign in to create a club.",
    success: "Club submitted: it stays pending until an admin approves it.",
    failed: "I could not save the club."
  }
};

export default function CreateClubModal({
  cities,
  locale,
  selectedCityId,
  onClose,
  onCreated
}: CreateClubModalProps) {
  const initialCity = useMemo(
    () => cities.find((city) => city.id === selectedCityId) ?? cities[0],
    [cities, selectedCityId]
  );
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cityId, setCityId] = useState(initialCity?.id ?? "");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const t = labels[locale];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");
    setIsError(false);

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setIsSaving(false);
      setIsError(true);
      setMessage(t.missingSupabase);
      return;
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      setIsSaving(false);
      setIsError(true);
      setMessage(t.authNeeded);
      window.location.href = `/login?next=${encodeURIComponent("/")}`;
      return;
    }

    const { error } = await supabase.from("clubs").insert({
      name,
      description,
      city_id: cityId || null,
      created_by: user.id,
      status: "pending"
    });

    setIsSaving(false);

    if (error) {
      setIsError(true);
      setMessage(t.failed);
      return;
    }

    trackAnalytics("club_created", { city_id: cityId });
    setMessage(t.success);
    setTimeout(onCreated, 700);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal-card" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2 className="modal-title">{t.title}</h2>
          <button className="icon-button" type="button" title="Chiudi" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="form-grid">
          <label className="field">
            {t.name}
            <input required value={name} onChange={(event) => setName(event.target.value)} />
          </label>

          <label className="field">
            {t.description}
            <textarea
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>

          <label className="field">
            {t.city}
            <select required value={cityId} onChange={(event) => setCityId(event.target.value)}>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </label>

          <p className={`form-message ${isError ? "error" : ""}`}>{message}</p>

          <PillButton variant="primary" type="submit" disabled={isSaving}>
            {isSaving ? "..." : t.save}
          </PillButton>
        </div>
      </form>
    </div>
  );
}
