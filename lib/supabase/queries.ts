import { demoHomeData } from "@/lib/data/demo";
import { getDemoEventsForFilters } from "@/lib/data/filters";
import { filterEventsForMap } from "@/lib/events/filters";
import { normalizeEventRecords } from "@/lib/events/records";
import type { Category, City, HomeData } from "@/lib/types";
import { isInsideCityBounds, limitEventsForViewport } from "@/lib/utils/geo";
import { legacyMapEventSelect, mapEventSelect } from "./selects";
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

  const [{ data: cities, error: citiesError }, { data: categories, error: categoriesError }] =
    await Promise.all([
      supabase
        .from("cities")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
    ]);

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
      cities: cities as City[],
      categories: categories as Category[],
      events: []
    };
  }

  const scopedEvents = normalizeEventRecords(eventsData).filter((event) =>
    isInsideCityBounds(event, initialCity)
  );

  return {
    cities: cities as City[],
    categories: categories as Category[],
    events: limitEventsForViewport(filterEventsForMap(scopedEvents, "week"))
  };
}
