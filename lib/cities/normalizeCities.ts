import type { City, CityBounds } from "@/lib/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function deriveBounds(latitude: number, longitude: number, radiusKm: number): CityBounds {
  const safeRadius = Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : 10;
  const latDelta = safeRadius / 111;
  const lngDelta = safeRadius / (111 * Math.max(Math.cos((latitude * Math.PI) / 180), 0.2));

  return {
    south: Math.max(-90, latitude - latDelta),
    west: Math.max(-180, longitude - lngDelta),
    north: Math.min(90, latitude + latDelta),
    east: Math.min(180, longitude + lngDelta)
  };
}

function readBounds(value: unknown, latitude: number, longitude: number, radiusKm: number): CityBounds {
  if (!isRecord(value)) {
    return deriveBounds(latitude, longitude, radiusKm);
  }

  const south = readNumber(value.south);
  const west = readNumber(value.west);
  const north = readNumber(value.north);
  const east = readNumber(value.east);

  if (south === null || west === null || north === null || east === null) {
    return deriveBounds(latitude, longitude, radiusKm);
  }

  return { south, west, north, east };
}

export function normalizeCities(rows: unknown[]): City[] {
  return rows
    .map((row) => {
      if (!isRecord(row)) {
        return null;
      }

      const latitude = readNumber(row.latitude, row.lat);
      const longitude = readNumber(row.longitude, row.lng);

      if (!row.id || !row.name || !row.slug || latitude === null || longitude === null) {
        return null;
      }

      const radiusKm = readNumber(row.radius_km) ?? 10;

      const city: City = {
        id: String(row.id),
        name: readString(row.name),
        slug: readString(row.slug),
        country_code: readString(row.country_code, readString(row.country)),
        country: readNullableString(row.country),
        timezone: readString(row.timezone, "UTC"),
        launch_status:
          row.launch_status === "active" || row.launch_status === "beta" || row.launch_status === "requested"
            ? row.launch_status
            : "active",
        latitude,
        longitude,
        lat: readNumber(row.lat, latitude),
        lng: readNumber(row.lng, longitude),
        radius_km: radiusKm,
        bbox: readBounds(row.bbox, latitude, longitude, radiusKm),
        is_active: row.is_active !== false
      };

      return city;
    })
    .filter((city): city is City => city !== null);
}
