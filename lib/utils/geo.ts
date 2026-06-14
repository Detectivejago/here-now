import type { City, EventRecord } from "@/lib/types";

export function isInsideCityBounds(event: Pick<EventRecord, "latitude" | "longitude">, city: City) {
  return (
    event.latitude >= city.bbox.south &&
    event.latitude <= city.bbox.north &&
    event.longitude >= city.bbox.west &&
    event.longitude <= city.bbox.east
  );
}

export function getCityBoundsTuple(city: City): [[number, number], [number, number]] {
  return [
    [city.bbox.south, city.bbox.west],
    [city.bbox.north, city.bbox.east]
  ];
}

export function limitEventsForViewport(events: EventRecord[], limit = 80) {
  return events
    .slice()
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .slice(0, limit);
}
