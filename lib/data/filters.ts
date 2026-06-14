import { demoHomeData } from "@/lib/data/demo";
import type { City, EventRecord } from "@/lib/types";
import { isInsideCityBounds, limitEventsForViewport } from "@/lib/utils/geo";

export function getDemoEventsForFilters(
  city: City,
  categoryId: string | null,
  events: EventRecord[] = demoHomeData.events
) {
  return limitEventsForViewport(
    events.filter((event) => {
      const matchesCity = event.city_id === city.id && isInsideCityBounds(event, city);
      const matchesCategory = !categoryId || event.category_id === categoryId;
      return event.status === "approved" && matchesCity && matchesCategory;
    })
  );
}
