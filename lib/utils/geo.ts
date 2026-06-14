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

export function getDistanceKm(
  pointA: { latitude: number; longitude: number },
  pointB: { latitude: number; longitude: number }
) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRadians(pointB.latitude - pointA.latitude);
  const deltaLng = toRadians(pointB.longitude - pointA.longitude);
  const latA = toRadians(pointA.latitude);
  const latB = toRadians(pointB.latitude);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function findNearestSupportedCity(
  cities: City[],
  coordinates: { latitude: number; longitude: number }
) {
  return cities
    .map((city) => ({
      city,
      distanceKm: getDistanceKm(coordinates, {
        latitude: city.latitude,
        longitude: city.longitude
      })
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];
}
