"use client";

import dynamic from "next/dynamic";
import { Plus, Search, Users } from "lucide-react";
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
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { EventRecord, HomeData, Locale } from "@/lib/types";
import { isInsideCityBounds, limitEventsForViewport } from "@/lib/utils/geo";

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
    addEvent: "Aggiungi Evento",
    createClub: "Crea Club",
    events: "eventi",
    noEvents: "Nessun evento qui: prova un'altra categoria."
  },
  en: {
    title: "Hi adventurer, find your perfect event!",
    search: "Search",
    addEvent: "Add Event",
    createClub: "Create Club",
    events: "events",
    noEvents: "No events here: try another category."
  }
};

export default function HomeShell({ initialData }: HomeShellProps) {
  const [locale, setLocale] = useState<Locale>("it");
  const cities = initialData.cities;
  const categories = initialData.categories;
  const [selectedCityId, setSelectedCityId] = useState(
    initialData.cities.find((city) => city.slug === "milano")?.id ?? initialData.cities[0]?.id
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventRecord[]>(initialData.events);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isCreateClubOpen, setIsCreateClubOpen] = useState(false);
  const [focusKey, setFocusKey] = useState(0);
  const firstFilterRun = useRef(true);

  const selectedCity = useMemo(
    () => cities.find((city) => city.id === selectedCityId) ?? cities[0],
    [cities, selectedCityId]
  );

  const loadEvents = useCallback(
    async (cityId = selectedCityId, categoryId = selectedCategoryId) => {
      const city = cities.find((candidate) => candidate.id === cityId) ?? cities[0];

      if (!city) {
        setEvents([]);
        return;
      }

      const supabase = createSupabaseBrowserClient();

      if (!supabase) {
        setEvents(getDemoEventsForFilters(city, categoryId, demoHomeData.events));
        return;
      }

      let query = supabase
        .from("events")
        .select("*, cities(*), categories(*)")
        .eq("status", "approved")
        .eq("city_id", city.id)
        .gte("start_date", new Date().toISOString())
        .order("start_date", { ascending: true })
        .limit(80);

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      const { data, error } = await query;

      if (error) {
        setEvents(getDemoEventsForFilters(city, categoryId, demoHomeData.events));
        return;
      }

      const scopedEvents = ((data ?? []) as EventRecord[]).filter((event) =>
        isInsideCityBounds(event, city)
      );

      setEvents(limitEventsForViewport(scopedEvents));
    },
    [cities, selectedCategoryId, selectedCityId]
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

  const handleSearch = async () => {
    await loadEvents();
    setFocusKey((value) => value + 1);
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
          <PillButton
            variant="primary"
            icon={<Search aria-hidden="true" />}
            onClick={handleSearch}
          >
            {currentCopy.search}
          </PillButton>

          <CitySelect cities={cities} value={selectedCity?.id ?? ""} onChange={handleCityChange} />
        </div>

        <section className="map-section" aria-label="Mappa eventi">
          {selectedCity ? (
            <EventMap
              city={selectedCity}
              categories={categories}
              events={events}
              locale={locale}
              focusKey={focusKey}
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
