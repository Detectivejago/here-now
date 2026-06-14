import { demoHomeData } from "@/lib/data/demo";
import { getDemoEventsForFilters } from "@/lib/data/filters";
import type { Category, City, EventRecord, HomeData } from "@/lib/types";
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

  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select("*, cities(*), categories(*)")
    .eq("status", "approved")
    .eq("city_id", initialCity.id)
    .gte("start_date", new Date().toISOString())
    .order("start_date", { ascending: true })
    .limit(80);

  if (eventsError) {
    return {
      cities: cities as City[],
      categories: categories as Category[],
      events: []
    };
  }

  return {
    cities: cities as City[],
    categories: categories as Category[],
    events: (events ?? []) as EventRecord[]
  };
}
