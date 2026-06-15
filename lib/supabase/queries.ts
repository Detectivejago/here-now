import { normalizeCities } from "@/lib/cities/normalizeCities";
import { demoHomeData } from "@/lib/data/demo";
import { getDemoEventsForFilters } from "@/lib/data/filters";
import { filterEventsForMap } from "@/lib/events/filters";
import { normalizeEventRecords } from "@/lib/events/records";
import type { Category, HomeData } from "@/lib/types";
import { isInsideCityBounds, limitEventsForViewport } from "@/lib/utils/geo";
import {
  citySelect,
  legacyCitySelect,
  legacyMapEventSelect,
  mapEventSelect,
  minimalCitySelect
} from "./selects";
import { createSupabaseServerClient } from "./server";

function getInitialDemoHomeData(): HomeData {
  const initialCity =
    demoHomeData.cities.find((city) => city.slug === "milano") ?? demoHomeData.cities[0];

  return {
    ...demoHomeData,
    events: initialCity ? getDemoEventsForFilters(initialCity, null) : []
  };
}

export async function getInitialHomeData(): Promise<HomeData> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return getInitialDemoHomeData();
  }

  const [citiesResult, { data: categories, error: categoriesError }] = await Promise.all([
    supabase
      .from("cities")
      .select(citySelect)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
  ]);

  let citiesData: unknown[] | null = citiesResult.data;
  let citiesError = citiesResult.error;

  if (citiesError) {
    const legacyCitiesResult = await supabase
      .from("cities")
      .select(legacyCitySelect)
      .eq("is_active", true)
      .order("name", { ascending: true });

    citiesData = legacyCitiesResult.data;
    citiesError = legacyCitiesResult.error;
  }

  if (citiesError) {
    const minimalCitiesResult = await supabase
      .from("cities")
      .select(minimalCitySelect)
      .eq("is_active", true)
      .order("name", { ascending: true });

    citiesData = minimalCitiesResult.data;
    citiesError = minimalCitiesResult.error;
  }

  const cities = normalizeCities(citiesData ?? []);

  if (citiesError || categoriesError || !cities?.length || !categories?.length) {
    return getInitialDemoHomeData();
  }

  const initialCity = cities.find((city) => city.slug === "milano") ?? cities[0];

  const eventsResult = await supabase
    .from("events")
    .select(mapEventSelect)
    .eq("city_id", initialCity.id)
    .order("start_date", { ascending: true })
    .limit(120);
  let eventsData: unknown[] | null = eventsResult.data;
  let eventsError = eventsResult.error;

  if (eventsError) {
    const fallbackResult = await supabase
      .from("events")
      .select(legacyMapEventSelect)
      .eq("city_id", initialCity.id)
      .order("start_date", { ascending: true })
      .limit(120);
    eventsData = fallbackResult.data;
    eventsError = fallbackResult.error;
  }

  if (eventsError) {
    return {
      cities,
      categories: categories as Category[],
      events: []
    };
  }

  const scopedEvents = normalizeEventRecords(eventsData).filter((event) =>
    isInsideCityBounds(event, initialCity)
  );

  return {
    cities,
    categories: categories as Category[],
    events: limitEventsForViewport(filterEventsForMap(scopedEvents, "week"))
  };
}
