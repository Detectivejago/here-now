"use client";

import { CalendarDays, ImagePlus, MapPin, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import PillButton from "@/components/ui/PillButton";
import { trackAnalytics } from "@/lib/analytics";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Category, City, Locale } from "@/lib/types";

type AddEventModalProps = {
  cities: City[];
  categories: Category[];
  locale: Locale;
  selectedCityId?: string;
  onClose: () => void;
  onCreated: () => void;
};

const labels = {
  it: {
    title: "Aggiungi evento",
    eventTitle: "Titolo",
    description: "Descrizione",
    city: "Città",
    category: "Categoria",
    startDate: "Inizio",
    endDate: "Fine opzionale",
    address: "Indirizzo opzionale",
    latitude: "Latitudine",
    longitude: "Longitudine",
    image: "Immagine opzionale",
    save: "Invia per approvazione",
    missingSupabase: "Configura Supabase per creare eventi reali.",
    authNeeded: "Accedi per proporre un evento.",
    success: "Evento inviato: resterà pending finché un admin lo approva.",
    failed: "Non sono riuscito a salvare l'evento. Controlla i campi e riprova."
  },
  en: {
    title: "Add event",
    eventTitle: "Title",
    description: "Description",
    city: "City",
    category: "Category",
    startDate: "Start",
    endDate: "Optional end",
    address: "Optional address",
    latitude: "Latitude",
    longitude: "Longitude",
    image: "Optional image",
    save: "Send for approval",
    missingSupabase: "Configure Supabase to create real events.",
    authNeeded: "Sign in to suggest an event.",
    success: "Event submitted: it stays pending until an admin approves it.",
    failed: "I could not save the event. Check the fields and try again."
  }
};

export default function AddEventModal({
  cities,
  categories,
  locale,
  selectedCityId,
  onClose,
  onCreated
}: AddEventModalProps) {
  const initialCity = useMemo(
    () => cities.find((city) => city.id === selectedCityId) ?? cities[0],
    [cities, selectedCityId]
  );
  const [cityId, setCityId] = useState(initialCity?.id ?? "");
  const selectedCity = cities.find((city) => city.id === cityId) ?? initialCity;
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState(String(selectedCity?.latitude ?? ""));
  const [longitude, setLongitude] = useState(String(selectedCity?.longitude ?? ""));
  const [image, setImage] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const t = labels[locale];

  const handleCityChange = (value: string) => {
    const city = cities.find((candidate) => candidate.id === value);
    setCityId(value);
    if (city) {
      setLatitude(String(city.latitude));
      setLongitude(String(city.longitude));
    }
  };

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

    let imageUrl: string | null = null;

    if (image) {
      if (!image.type.startsWith("image/") || image.size > 3 * 1024 * 1024) {
        setIsSaving(false);
        setIsError(true);
        setMessage("Immagine massimo 3MB, formato immagine.");
        return;
      }

      const extension = image.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("event-images")
        .upload(path, image, {
          cacheControl: "31536000",
          upsert: false
        });

      if (uploadError) {
        setIsSaving(false);
        setIsError(true);
        setMessage(t.failed);
        return;
      }

      const { data } = supabase.storage.from("event-images").getPublicUrl(path);
      imageUrl = data.publicUrl;
    }

    const { error } = await supabase.from("events").insert({
      title,
      description,
      city_id: cityId,
      category_id: categoryId,
      start_date: new Date(startDate).toISOString(),
      end_date: endDate ? new Date(endDate).toISOString() : null,
      latitude: Number(latitude),
      longitude: Number(longitude),
      address: address || null,
      image_url: imageUrl,
      created_by: user.id,
      status: "pending"
    });

    setIsSaving(false);

    if (error) {
      setIsError(true);
      setMessage(t.failed);
      return;
    }

    trackAnalytics("event_created", { city_id: cityId, category_id: categoryId });
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
            {t.eventTitle}
            <input required value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          <label className="field">
            {t.description}
            <textarea
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>

          <div className="form-row">
            <label className="field">
              {t.city}
              <select required value={cityId} onChange={(event) => handleCityChange(event.target.value)}>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              {t.category}
              <select
                required
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {locale === "it" ? category.name_it : category.name_en}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label className="field">
              <span>
                <CalendarDays size={15} aria-hidden="true" /> {t.startDate}
              </span>
              <input
                required
                type="datetime-local"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>

            <label className="field">
              {t.endDate}
              <input
                type="datetime-local"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
          </div>

          <label className="field">
            <span>
              <MapPin size={15} aria-hidden="true" /> {t.address}
            </span>
            <input value={address} onChange={(event) => setAddress(event.target.value)} />
          </label>

          <div className="form-row">
            <label className="field">
              {t.latitude}
              <input
                required
                inputMode="decimal"
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
              />
            </label>

            <label className="field">
              {t.longitude}
              <input
                required
                inputMode="decimal"
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
              />
            </label>
          </div>

          <label className="field">
            <span>
              <ImagePlus size={15} aria-hidden="true" /> {t.image}
            </span>
            <input type="file" accept="image/*" onChange={(event) => setImage(event.target.files?.[0] ?? null)} />
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
