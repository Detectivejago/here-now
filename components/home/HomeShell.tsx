"use client";

import dynamic from "next/dynamic";
import { LocateFixed, Plus, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AddEventModal from "@/components/home/AddEventModal";
import BetaPanel from "@/components/home/BetaPanel";
import CategoryMenu from "@/components/home/CategoryMenu";
import CitySelect from "@/components/home/CitySelect";
import CreateClubModal from "@/components/home/CreateClubModal";
import LanguageToggle from "@/components/home/LanguageToggle";
import OnboardingCard from "@/components/home/OnboardingCard";
import PillButton from "@/components/ui/PillButton";
import { trackAnalytics } from "@/lib/analytics";
import { demoHomeData } from "@/lib/data/demo";
import { getDemoEventsForFilters } from "@/lib/data/filters";
import { filterEventsForMap, getTemporalStatus } from "@/lib/events/filters";
import { normalizeEventRecords } from "@/lib/events/records";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { legacyMapEventSelect, mapEventSelect } from "@/lib/supabase/selects";
import type { EventRecord, HomeData, Locale, TimeFilter } from "@/lib/types";
import { findNearestSupportedCity, isInsideCityBounds, limitEventsForViewport } from "@/lib/utils/geo";

const EventMap = dynamic(() => import("@/components/map/EventMap"), {
  ssr: false,
  loading: () => <div className="map-shell loading">Caricamento mappa...</div>
});

type HomeShellProps = {
  initialData: HomeData;
};

const copy = {
  it: {
    title: "Ciao avventuriero, trova il tuo evento perfetto!",
    search: "Cerca",
    locate: "Vicino a me",
    addEvent: "Aggiungi Evento",
    createClub: "Crea Club",
    events: "eventi",
    noEvents: "Nessun evento qui: prova un altro filtro.",
    noLiveTitle: "Non c'è niente live ora",
    noLiveBody: "Ma qualcosa sta per iniziare. Dai un'occhiata a Oggi.",
    noCityEventsTitle: "HereNow non è ancora pienamente attivo qui",
    noCityEventsBody: "Vuoi aggiungere il primo evento?",
    noFilteredTitle: "Nessun evento con questi filtri",
    noFilteredBody: "Prova un'altra categoria o un altro momento.",
    addFirst: "Aggiungi il primo evento",
    supabaseError: "Connessione instabile. Riprova tra poco.",
    offline: "Sembra che tu sia offline. La mappa torna appena c'è connessione.",
    noCity: "Configura almeno una città.",
    locating: "Cerco la città supportata più vicina...",
    geoDenied: "Posizione non disponibile. Puoi scegliere una città manualmente.",
    geoUnsupported: "Non copriamo ancora la tua zona. Ti mostro la città supportata più vicina.",
    geoMatched: "Città selezionata dalla tua posizione.",
    filters: {
      now: "Adesso",
      today: "Oggi",
      week: "Questa settimana",
      permanent: "Permanenti",
      private: "Privati"
    }
  },
  en: {
    title: "Hi adventurer, find your perfect event!",
    search: "Search",
    locate: "Near me",
    addEvent: "Add Event",
    createClub: "Create Club",
    events: "events",
    noEvents: "No events here: try another filter.",
    noLiveTitle: "Nothing live right now",
    noLiveBody: "But something is about to start. Try Today.",
    noCityEventsTitle: "HereNow is not fully active here yet",
    noCityEventsBody: "Want to add the first event?",
    noFilteredTitle: "No events for these filters",
    noFilteredBody: "Try another category or time.",
    addFirst: "Add the first event",
    supabaseError: "Connection is unstable. Try again soon.",
    offline: "You seem offline. The map comes back when the connection does.",
    noCity: "Configure at least one city.",
    locating: "Finding the closest supported city...",
    geoDenied: "Location unavailable. You can choose a city manually.",
    geoUnsupported: "We do not cover your area yet. Showing the closest supported city.",
    geoMatched: "City selected from your location.",
    filters: {
      now: "Now",
      today: "Today",
      week: "This week",
      permanent: "Permanent",
      private: "Private"
    }
  }
};

const timeFilters: TimeFilter[] = ["now", "today", "week", "permanent", "private"];
const supportedCityDistanceKm = 75;
const defaultCityStorageKey = "herenow.defaultCityId";

function getEmptyStateCopy(
  localeCopy: (typeof copy)["it"],
  timeFilter: TimeFilter,
  hasCategoryFilter: boolean
) {
  if (timeFilter === "now") {
    return {
      title: localeCopy.noLiveTitle,
      body: localeCopy.noLiveBody,
      action: localeCopy.addFirst
    };
  }

  if (!hasCategoryFilter && timeFilter === "week") {
    return {
      title: localeCopy.noCityEventsTitle,
      body: localeCopy.noCityEventsBody,
      action: localeCopy.addFirst
    };
  }

  return {
    title: localeCopy.noFilteredTitle,
    body: localeCopy.noFilteredBody,
    action: localeCopy.addFirst
  };
}

function getCityEnergy(
  events: EventRecord[],
  cityName: string | undefined,
  locale: Locale,
  activeTimeFilter: TimeFilter
) {
  const liveCount = events.filter((event) => getTemporalStatus(event) === "live_now").length;
  const soonCount = events.filter((event) => getTemporalStatus(event) === "starting_soon").length;

  if (!cityName) {
    return "";
  }

  if (events.length === 0) {
    if (activeTimeFilter === "now") {
      return locale === "it"
        ? `${cityName} si sta preparando`
        : `${cityName} is getting ready`;
    }

    return locale === "it"
      ? `${cityName} aspetta il prossimo evento`
      : `${cityName} is waiting for the next event`;
  }

  if (liveCount > 0 || soonCount > 0) {
    return locale === "it"
      ? `${cityName} è attiva · ${liveCount} ora · ${soonCount} entro 90 min`
      : `${cityName} is active · ${liveCount} now · ${soonCount} within 90 min`;
  }

  return locale === "it"
    ? `${cityName} si sta preparando · ${events.length} eventi in vista`
    : `${cityName} is warming up · ${events.length} events ahead`;
}

export default function HomeShell({ initialData }: HomeShellProps) {
  const [locale, setLocale] = useState<Locale>("it");
  const cities = initialData.cities;
  const categories = initialData.categories;
  const [selectedCityId, setSelectedCityId] = useState(
    initialData.cities.find((city) => city.slug === "milano")?.id ?? initialData.cities[0]?.id
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("week");
  const [events, setEvents] = useState<EventRecord[]>(initialData.events);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isCreateClubOpen, setIsCreateClubOpen] = useState(false);
  const [geoMessage, setGeoMessage] = useState("");
  const [appMessage, setAppMessage] = useState("");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [isLocating, setIsLocating] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const firstFilterRun = useRef(true);
  const restoredDefaultCity = useRef(false);
  const currentCopy = copy[locale];

  const selectedCity = useMemo(
    () => cities.find((city) => city.id === selectedCityId) ?? cities[0],
    [cities, selectedCityId]
  );
  const cityEnergy = useMemo(
    () => getCityEnergy(events, selectedCity?.name, locale, timeFilter),
    [events, locale, selectedCity?.name, timeFilter]
  );
  const emptyState = useMemo(
    () => getEmptyStateCopy(currentCopy, timeFilter, Boolean(selectedCategoryId)),
    [currentCopy, selectedCategoryId, timeFilter]
  );

  const loadEvents = useCallback(
    async (
      cityId = selectedCityId,
      categoryId = selectedCategoryId,
      activeTimeFilter = timeFilter
    ) => {
      const city = cities.find((candidate) => candidate.id === cityId) ?? cities[0];

      if (!city) {
        setEvents([]);
        setAppMessage(copy[locale].noCity);
        return;
      }

      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        const demoEvents = getDemoEventsForFilters(city, categoryId, demoHomeData.events);
        setAppMessage("");
        setEvents(filterEventsForMap(demoEvents, activeTimeFilter));
        return;
      }

      let query = supabase
        .from("events")
        .select(mapEventSelect)
        .eq("city_id", city.id)
        .order("start_date", { ascending: true })
        .limit(180);

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const result = await query;
      let resultData: unknown[] | null = result.data;
      let resultError = result.error;

      if (resultError) {
        let fallbackQuery = supabase
          .from("events")
          .select(legacyMapEventSelect)
          .eq("city_id", city.id)
          .order("start_date", { ascending: true })
          .limit(180);

        if (categoryId) {
          fallbackQuery = fallbackQuery.eq("category_id", categoryId);
        }

        const fallbackResult = await fallbackQuery;
        resultData = fallbackResult.data;
        resultError = fallbackResult.error;
      }

      if (resultError) {
        setEvents([]);
        setAppMessage(copy[locale].supabaseError);
        return;
      }

      const scopedEvents = normalizeEventRecords(resultData).filter((event) =>
        isInsideCityBounds(event, city)
      );

      setAppMessage("");
      setEvents(limitEventsForViewport(filterEventsForMap(scopedEvents, activeTimeFilter)));
    },
    [cities, locale, selectedCategoryId, selectedCityId, timeFilter]
  );

  useEffect(() => {
    trackAnalytics("page_view", { surface: "home" });
  }, []);

  useEffect(() => {
    const handleOffline = () => setAppMessage(copy[locale].offline);
    const handleOnline = () => setAppMessage("");

    if (!navigator.onLine) {
      handleOffline();
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [locale]);

  useEffect(() => {
    if (restoredDefaultCity.current) {
      return;
    }

    restoredDefaultCity.current = true;
    const storedCityId = window.localStorage.getItem(defaultCityStorageKey);

    if (storedCityId && cities.some((city) => city.id === storedCityId)) {
      setSelectedCityId(storedCityId);
      setFocusKey((value) => value + 1);
      void loadEvents(storedCityId, selectedCategoryId, timeFilter);
    }
  }, [cities, loadEvents, selectedCategoryId, timeFilter]);

  useEffect(() => {
    if (firstFilterRun.current) {
      firstFilterRun.current = false;
      return;
    }

    loadEvents();
  }, [loadEvents]);

  const handleCityChange = (cityId: string) => {
    const city = cities.find((candidate) => candidate.id === cityId);
    setSelectedCityId(cityId);
    window.localStorage.setItem(defaultCityStorageKey, cityId);
    setFocusKey((value) => value + 1);
    trackAnalytics("city_selected", { city_id: cityId, city: city?.name ?? null });
  };

  const handleCategorySelect = (categoryId: string | null) => {
    const category = categories.find((candidate) => candidate.id === categoryId);
    setSelectedCategoryId(categoryId);
    setIsCategoryOpen(false);
    trackAnalytics("category_selected", {
      category_id: categoryId,
      category: category?.slug ?? "all"
    });
  };

  const handleTimeFilterSelect = async (value: TimeFilter) => {
    setTimeFilter(value);
    await loadEvents(selectedCityId, selectedCategoryId, value);
    setFocusKey((value) => value + 1);
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setGeoMessage(currentCopy.geoDenied);
      return;
    }

    setIsLocating(true);
    setGeoMessage(currentCopy.locating);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        const nearest = findNearestSupportedCity(cities, {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude
        });

        setIsLocating(false);
        setUserLocation(coordinates);

        if (!nearest) {
          setGeoMessage(currentCopy.geoDenied);
          return;
        }

        setSelectedCityId(nearest.city.id);
        window.localStorage.setItem(defaultCityStorageKey, nearest.city.id);
        setGeoMessage(
          nearest.distanceKm <= supportedCityDistanceKm
            ? currentCopy.geoMatched
            : currentCopy.geoUnsupported
        );
        setFocusKey((value) => value + 1);
        await loadEvents(nearest.city.id, selectedCategoryId, timeFilter);
        trackAnalytics("city_selected", {
          city_id: nearest.city.id,
          city: nearest.city.name,
          source: "geolocation",
          distance_km: Math.round(nearest.distanceKm)
        });
      },
      () => {
        setIsLocating(false);
        setGeoMessage(currentCopy.geoDenied);
      },
      { enableHighAccuracy: false, maximumAge: 5 * 60 * 1000, timeout: 8000 }
    );
  };

  const handleEventCreated = async () => {
    await loadEvents();
    setIsAddEventOpen(false);
  };

  const handleClubCreated = () => {
    setIsCreateClubOpen(false);
  };

  return (
    <main className="home-shell">
      <section className="mobile-stage" aria-label="HereNow">
        <div className="hero-panel">
          <div className="hero-topline">
            <LanguageToggle locale={locale} onChange={setLocale} />
          </div>

          <h1 className="hero-title">{currentCopy.title}</h1>
          {cityEnergy ? <p className="city-energy">{cityEnergy}</p> : null}
          <OnboardingCard locale={locale} />

          <div className="hero-actions">
            <div className="hero-actions-row">
              <PillButton
                variant="coral"
                icon={<Plus aria-hidden="true" />}
                onClick={() => setIsAddEventOpen(true)}
              >
                {currentCopy.addEvent}
              </PillButton>
              <PillButton
                variant="coral"
                icon={<Users aria-hidden="true" />}
                onClick={() => setIsCreateClubOpen(true)}
              >
                {currentCopy.createClub}
              </PillButton>
            </div>
          </div>
        </div>

        <div className="primary-controls">
          <div className="location-controls">
            <CitySelect cities={cities} value={selectedCity?.id ?? ""} onChange={handleCityChange} />
            <button className="locate-button" type="button" onClick={handleLocate} disabled={isLocating}>
              <LocateFixed size={18} aria-hidden="true" />
              <span>{isLocating ? "..." : currentCopy.locate}</span>
            </button>
          </div>

          <div className="time-filter" aria-label="Filtra eventi per tempo">
            {timeFilters.map((filter) => (
              <button
                className={filter === timeFilter ? "active" : ""}
                key={filter}
                type="button"
                onClick={() => handleTimeFilterSelect(filter)}
              >
                {currentCopy.filters[filter]}
              </button>
            ))}
          </div>

          {geoMessage ? <p className="geo-message">{geoMessage}</p> : null}
          {appMessage ? <p className="geo-message app-message">{appMessage}</p> : null}
        </div>

        <section className="map-section" aria-label="Mappa eventi">
          {selectedCity ? (
            <EventMap
              city={selectedCity}
              categories={categories}
              events={events}
              locale={locale}
              focusKey={focusKey}
              userLocation={userLocation}
            />
          ) : (
            <div className="map-shell loading">{currentCopy.noCity}</div>
          )}

          {events.length === 0 ? (
            <div className="map-empty-panel">
              <strong>{emptyState.title}</strong>
              <p>{emptyState.body}</p>
              <button type="button" onClick={() => setIsAddEventOpen(true)}>
                <Plus size={16} aria-hidden="true" />
                {emptyState.action}
              </button>
            </div>
          ) : null}

          <div className="map-badge" aria-live="polite">
            <span>{events.length}</span>
            <span>{events.length === 0 ? currentCopy.noEvents : currentCopy.events}</span>
          </div>
        </section>

        <div className="bottom-controls">
          <CategoryMenu
            categories={categories}
            locale={locale}
            selectedCategoryId={selectedCategoryId}
            isOpen={isCategoryOpen}
            onToggle={() => setIsCategoryOpen((value) => !value)}
            onSelect={handleCategorySelect}
          />
        </div>

        <BetaPanel locale={locale} selectedCity={selectedCity} />
      </section>

      {isAddEventOpen ? (
        <AddEventModal
          cities={cities}
          categories={categories}
          locale={locale}
          selectedCityId={selectedCity?.id}
          onClose={() => setIsAddEventOpen(false)}
          onCreated={handleEventCreated}
        />
      ) : null}

      {isCreateClubOpen ? (
        <CreateClubModal
          cities={cities}
          locale={locale}
          selectedCityId={selectedCity?.id}
          onClose={() => setIsCreateClubOpen(false)}
          onCreated={handleClubCreated}
        />
      ) : null}
    </main>
  );
}
