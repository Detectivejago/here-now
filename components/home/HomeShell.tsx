"use client";

import dynamic from "next/dynamic";
import { LocateFixed, Plus, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AddEventModal from "@/components/home/AddEventModal";
import CategoryMenu from "@/components/home/CategoryMenu";
import CitySelect from "@/components/home/CitySelect";
import CreateClubModal from "@/components/home/CreateClubModal";
import LanguageToggle from "@/components/home/LanguageToggle";
import PillButton from "@/components/ui/PillButton";
import { trackAnalytics } from "@/lib/analytics";
import { demoHomeData } from "@/lib/data/demo";
import { getDemoEventsForFilters } from "@/lib/data/filters";
import { filterEventsForMap } from "@/lib/events/filters";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [isLocating, setIsLocating] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const firstFilterRun = useRef(true);

  const selectedCity = useMemo(
    () => cities.find((city) => city.id === selectedCityId) ?? cities[0],
    [cities, selectedCityId]
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
        return;
      }

      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        const demoEvents = getDemoEventsForFilters(city, categoryId, demoHomeData.events);
        setEvents(filterEventsForMap(demoEvents, activeTimeFilter));
        return;
      }

      let query = supabase
        .from("events")
        .select("*, cities(*), categories(*)")
        .eq("city_id", city.id)
        .order("start_date", { ascending: true })
        .limit(120);

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, error } = await query;

      if (error) {
        const demoEvents = getDemoEventsForFilters(city, categoryId, demoHomeData.events);
        setEvents(filterEventsForMap(demoEvents, activeTimeFilter));
        return;
      }

      const scopedEvents = ((data ?? []) as EventRecord[]).filter((event) =>
        isInsideCityBounds(event, city)
      );

      setEvents(limitEventsForViewport(filterEventsForMap(scopedEvents, activeTimeFilter)));
    },
    [cities, selectedCategoryId, selectedCityId, timeFilter]
  );

  useEffect(() => {
    trackAnalytics("page_view", { surface: "home" });
  }, []);

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

  const currentCopy = copy[locale];

  return (
    <main className="home-shell">
      <section className="mobile-stage" aria-label="HereNow">
        <div className="hero-panel">
          <div className="hero-topline">
            <LanguageToggle locale={locale} onChange={setLocale} />
          </div>

          <h1 className="hero-title">{currentCopy.title}</h1>

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
            <div className="map-shell loading">Configura almeno una città.</div>
          )}

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
