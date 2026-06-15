"use client";

import { CalendarDays, Check, ChevronLeft, ChevronRight, Lock, MapPin, X } from "lucide-react";
import { type CSSProperties, type FormEvent, useMemo, useState } from "react";
import PillButton from "@/components/ui/PillButton";
import { trackAnalytics } from "@/lib/analytics";
import {
  filterLocationPresets,
  getLocationPresets,
  type LocationPreset
} from "@/lib/data/locationPresets";
import { calculateEventQualityScore } from "@/lib/events/quality";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Category, City, EventVisibility, Locale } from "@/lib/types";

type AddEventModalProps = {
  cities: City[];
  categories: Category[];
  locale: Locale;
  selectedCityId?: string;
  onClose: () => void;
  onCreated: () => void;
};

type WizardStep = "title" | "place" | "time" | "category" | "visibility" | "password" | "confirm";

const stepOrder: WizardStep[] = [
  "title",
  "place",
  "time",
  "category",
  "visibility",
  "password",
  "confirm"
];

const labels = {
  it: {
    title: "Aggiungi evento",
    steps: {
      title: "Titolo",
      place: "Luogo",
      time: "Data",
      category: "Categoria",
      visibility: "Accesso",
      password: "Password",
      confirm: "Conferma"
    },
    eventTitle: "Titolo evento",
    description: "Descrizione breve",
    city: "Città",
    address: "Luogo o indirizzo",
    placeHelp: "Scegli una zona: compilo io la posizione sulla mappa.",
    placeFallback: "Se non lo trovi, scrivi il luogo: userò il centro città come punto iniziale.",
    startDate: "Inizio",
    endDate: "Fine opzionale",
    today: "Oggi",
    tomorrow: "Domani",
    weekend: "Weekend",
    timeHelp: "Scegli una scorciatoia e poi aggiusta l'orario se serve.",
    category: "Categoria",
    public: "Pubblico",
    password: "Visibile con password",
    linkOnly: "Nascosto, solo link",
    passwordLabel: "Password evento",
    confirmTitle: "Controlla prima di inviare",
    save: "Invia per approvazione",
    next: "Avanti",
    back: "Indietro",
    skip: "Salta",
    missingSupabase: "Configura Supabase per creare eventi reali.",
    authNeeded: "Accedi per proporre un evento.",
    success: "Evento inviato: resterà pending finché un admin lo approva.",
    failed: "Non sono riuscito a salvare l'evento. Controlla i campi e riprova.",
    passwordHelp: "La password viene salvata come hash. Chi la conosce potrà sbloccare i dettagli.",
    linkHelp: "Non comparirà sulla mappa pubblica. La struttura per il link privato è pronta.",
    noPasswordNeeded: "Questo evento non richiede password."
  },
  en: {
    title: "Add event",
    steps: {
      title: "Title",
      place: "Place",
      time: "Time",
      category: "Category",
      visibility: "Access",
      password: "Password",
      confirm: "Confirm"
    },
    eventTitle: "Event title",
    description: "Short description",
    city: "City",
    address: "Place or address",
    placeHelp: "Pick an area: I will fill the map position for you.",
    placeFallback: "If you do not find it, type the place: I will use the city center as a start.",
    startDate: "Start",
    endDate: "Optional end",
    today: "Today",
    tomorrow: "Tomorrow",
    weekend: "Weekend",
    timeHelp: "Pick a shortcut, then adjust the time if needed.",
    category: "Category",
    public: "Public",
    password: "Visible with password",
    linkOnly: "Hidden, link only",
    passwordLabel: "Event password",
    confirmTitle: "Check before sending",
    save: "Send for approval",
    next: "Next",
    back: "Back",
    skip: "Skip",
    missingSupabase: "Configure Supabase to create real events.",
    authNeeded: "Sign in to suggest an event.",
    success: "Event submitted: it stays pending until an admin approves it.",
    failed: "I could not save the event. Check the fields and try again.",
    passwordHelp: "The password is stored as a hash. People who know it can unlock details.",
    linkHelp: "It will not appear on the public map. The private link structure is ready.",
    noPasswordNeeded: "This event does not need a password."
  }
};

function getNextStep(step: WizardStep, visibility: EventVisibility) {
  const index = stepOrder.indexOf(step);

  if (step === "visibility" && visibility !== "password") {
    return "confirm";
  }

  return stepOrder[Math.min(index + 1, stepOrder.length - 1)];
}

function getPreviousStep(step: WizardStep) {
  const index = stepOrder.indexOf(step);
  return stepOrder[Math.max(index - 1, 0)];
}

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isMissingColumnError(error: { message?: string } | null, column: string) {
  return Boolean(error?.message?.toLowerCase().includes(column.toLowerCase()));
}

function toDateTimeLocal(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function getTodayStart() {
  const date = new Date();
  date.setHours(date.getHours() + 2, 0, 0, 0);
  return date;
}

function getDateAt(daysFromNow: number, hour = 19, minute = 30) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date;
}

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
  const [step, setStep] = useState<WizardStep>("title");
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
  const [visibility, setVisibility] = useState<EventVisibility>("public");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const t = labels[locale];
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const locationPresets = useMemo(() => getLocationPresets(selectedCity), [selectedCity]);
  const visibleLocationPresets = useMemo(
    () => filterLocationPresets(locationPresets, address),
    [address, locationPresets]
  );

  const visibleSteps = stepOrder.filter((candidate) => visibility === "password" || candidate !== "password");
  const currentStepIndex = visibleSteps.indexOf(step);

  const handleCityChange = (value: string) => {
    const city = cities.find((candidate) => candidate.id === value);
    setCityId(value);
    if (city) {
      setAddress("");
      setLatitude(String(city.latitude));
      setLongitude(String(city.longitude));
    }
  };

  const handleLocationPreset = (preset: LocationPreset) => {
    setAddress(preset.address);
    setLatitude(String(preset.latitude));
    setLongitude(String(preset.longitude));
  };

  const handleAddressChange = (value: string) => {
    setAddress(value);

    if (selectedCity && !value.trim()) {
      setLatitude(String(selectedCity.latitude));
      setLongitude(String(selectedCity.longitude));
    }
  };

  const applyQuickDate = (value: "today" | "tomorrow" | "weekend") => {
    const nextDate =
      value === "today"
        ? getTodayStart()
        : value === "tomorrow"
          ? getDateAt(1)
          : getDateAt(6 - new Date().getDay(), 18, 0);

    setStartDate(toDateTimeLocal(nextDate));
  };

  const goNext = () => setStep(getNextStep(step, visibility));
  const goBack = () => {
    const index = visibleSteps.indexOf(step);
    setStep(visibleSteps[Math.max(index - 1, 0)] ?? getPreviousStep(step));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (step !== "confirm") {
      goNext();
      return;
    }

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

    const passwordHash = visibility === "password" && password ? await hashPassword(password) : null;
    const basePayload = {
      title,
      description,
      city_id: cityId,
      category_id: categoryId,
      start_date: new Date(startDate).toISOString(),
      end_date: endDate ? new Date(endDate).toISOString() : null,
      latitude: Number(latitude),
      longitude: Number(longitude),
      address: address || null,
      image_url: null,
      created_by: user.id
    };
    const sourceType = "user";
    const confidenceScore = 0.7;
    const nextModelPayload = {
      ...basePayload,
      status: "upcoming",
      moderation_status: "pending",
      event_type: visibility === "public" ? "temporary" : "private",
      visibility,
      password_hash: passwordHash,
      source_type: sourceType,
      confidence_score: confidenceScore,
      quality_score: calculateEventQualityScore({
        ...basePayload,
        source_type: sourceType,
        confidence_score: confidenceScore
      })
    };

    const { error: nextModelError } = await supabase.from("events").insert(nextModelPayload);
    let saved = !nextModelError;

    if (!saved && isMissingColumnError(nextModelError, "quality_score")) {
      const payloadWithoutQualityScore = {
        ...basePayload,
        status: "upcoming",
        moderation_status: "pending",
        event_type: visibility === "public" ? "temporary" : "private",
        visibility,
        password_hash: passwordHash,
        source_type: sourceType,
        confidence_score: confidenceScore
      };
      const retry = await supabase.from("events").insert(payloadWithoutQualityScore);
      saved = !retry.error;
    }

    if (!saved && isMissingColumnError(nextModelError, "moderation_status")) {
      const legacyFallback = await supabase.from("events").insert({
        ...basePayload,
        status: "pending"
      });
      saved = !legacyFallback.error;
    }

    if (!saved) {
      setIsSaving(false);
      setIsError(true);
      setMessage(t.failed);
      return;
    }

    setIsSaving(false);
    trackAnalytics("event_created", { city_id: cityId, category_id: categoryId, visibility });
    setMessage(t.success);
    setTimeout(onCreated, 700);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form className="modal-card wizard-card" onSubmit={handleSubmit}>
        <div className="modal-header">
          <div>
            <p className="wizard-step-count">
              {Math.max(currentStepIndex + 1, 1)} / {visibleSteps.length}
            </p>
            <h2 className="modal-title">{t.title}</h2>
          </div>
          <button className="icon-button" type="button" title="Chiudi" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="wizard-progress" aria-hidden="true">
          {visibleSteps.map((candidate) => (
            <span className={candidate === step ? "active" : ""} key={candidate} />
          ))}
        </div>

        <div className="wizard-body">
          <h3>{t.steps[step]}</h3>

          {step === "title" ? (
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
            </div>
          ) : null}

          {step === "place" ? (
            <div className="form-grid">
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
                <span>
                  <MapPin size={15} aria-hidden="true" /> {t.address}
                </span>
                <input
                  required
                  value={address}
                  placeholder={selectedCity ? `${selectedCity.name}, zona o locale` : ""}
                  onChange={(event) => handleAddressChange(event.target.value)}
                />
              </label>
              <div className="location-suggestions" aria-label={t.placeHelp}>
                <p>{visibleLocationPresets.length > 0 ? t.placeHelp : t.placeFallback}</p>
                {visibleLocationPresets.map((preset) => (
                  <button
                    className={address === preset.address ? "location-suggestion active" : "location-suggestion"}
                    key={`${preset.address}-${preset.latitude}-${preset.longitude}`}
                    type="button"
                    onClick={() => handleLocationPreset(preset)}
                  >
                    <strong>{preset.label}</strong>
                    <span>{preset.address}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {step === "time" ? (
            <div className="form-grid">
              <div className="quick-date-row">
                <button type="button" onClick={() => applyQuickDate("today")}>
                  {t.today}
                </button>
                <button type="button" onClick={() => applyQuickDate("tomorrow")}>
                  {t.tomorrow}
                </button>
                <button type="button" onClick={() => applyQuickDate("weekend")}>
                  {t.weekend}
                </button>
              </div>
              <p className="form-message subtle">{t.timeHelp}</p>
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
          ) : null}

          {step === "category" ? (
            <div className="choice-grid">
              {categories.map((category) => (
                <button
                  className={category.id === categoryId ? "choice-card active" : "choice-card"}
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                >
                  <span
                    className="category-dot"
                    style={{ "--category-color": category.color } as CSSProperties}
                  />
                  {locale === "it" ? category.name_it : category.name_en}
                </button>
              ))}
            </div>
          ) : null}

          {step === "visibility" ? (
            <div className="choice-grid">
              <button
                className={visibility === "public" ? "choice-card active" : "choice-card"}
                type="button"
                onClick={() => setVisibility("public")}
              >
                {t.public}
              </button>
              <button
                className={visibility === "password" ? "choice-card active" : "choice-card"}
                type="button"
                onClick={() => setVisibility("password")}
              >
                <Lock size={16} aria-hidden="true" />
                {t.password}
              </button>
              <button
                className={visibility === "link_only" ? "choice-card active" : "choice-card"}
                type="button"
                onClick={() => setVisibility("link_only")}
              >
                {t.linkOnly}
              </button>
              {visibility === "link_only" ? <p className="form-message">{t.linkHelp}</p> : null}
            </div>
          ) : null}

          {step === "password" ? (
            visibility === "password" ? (
              <div className="form-grid">
                <label className="field">
                  {t.passwordLabel}
                  <input
                    required
                    minLength={4}
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
                <p className="form-message">{t.passwordHelp}</p>
              </div>
            ) : (
              <p className="form-message">{t.noPasswordNeeded}</p>
            )
          ) : null}

          {step === "confirm" ? (
            <div className="confirm-list">
              <h4>{t.confirmTitle}</h4>
              <p>
                <strong>{title}</strong>
              </p>
              <p>{selectedCity?.name} · {address}</p>
              <p>{startDate.replace("T", " ")} {endDate ? `- ${endDate.replace("T", " ")}` : ""}</p>
              <p>{locale === "it" ? selectedCategory?.name_it : selectedCategory?.name_en}</p>
              <p>{visibility}</p>
            </div>
          ) : null}
        </div>

        <p className={`form-message ${isError ? "error" : ""}`}>{message}</p>

        <div className="wizard-actions">
          {step !== "title" ? (
            <button className="small-button pending" type="button" onClick={goBack}>
              <ChevronLeft size={16} aria-hidden="true" /> {t.back}
            </button>
          ) : null}
          <PillButton variant="primary" type="submit" disabled={isSaving}>
            {step === "confirm" ? (
              <>
                <Check size={17} aria-hidden="true" /> {isSaving ? "..." : t.save}
              </>
            ) : (
              <>
                {t.next} <ChevronRight size={17} aria-hidden="true" />
              </>
            )}
          </PillButton>
        </div>
      </form>
    </div>
  );
}
