import type { NormalizedEventInput, RawEventEnvelope } from "./types";

type NormalizeEventOptions = {
  citySlug: string;
  categorySlug?: string;
  defaultConfidenceScore?: number;
};

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readNumberString(value: unknown) {
  const text = readString(value);

  if (!text) {
    return null;
  }

  return readNumber(Number(text));
}

function readNumberLike(value: unknown) {
  return readNumber(value) ?? readNumberString(value);
}

function readObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readFirstString(...values: unknown[]) {
  for (const value of values) {
    const text = readString(value);

    if (text) {
      return text;
    }
  }

  return null;
}

function readFirstNumber(...values: unknown[]) {
  for (const value of values) {
    const number = readNumberLike(value);

    if (number !== null) {
      return number;
    }
  }

  return null;
}

function readFirstImage(payload: Record<string, unknown>) {
  const images = payload.images as Array<Record<string, unknown>> | undefined;

  return readFirstString(payload.imageUrl, payload.image_url, images?.[0]?.url);
}

function readTicketmasterVenue(payload: Record<string, unknown>) {
  const embedded = readObject(payload._embedded);
  const venues = embedded?.venues as Array<Record<string, unknown>> | undefined;

  return venues?.[0] ?? null;
}

export function normalizeEvent(
  rawEvent: RawEventEnvelope,
  options: NormalizeEventOptions
): NormalizedEventInput | null {
  const payload = readObject(rawEvent.payload);

  if (!payload) {
    return null;
  }

  const dates = readObject(payload.dates);
  const start = readObject(dates?.start);
  const end = readObject(dates?.end);
  const venue = readObject(payload.venue) ?? readTicketmasterVenue(payload);
  const location = readObject(payload.location) ?? readObject(venue?.location);
  const title = readFirstString(payload.title, payload.name);
  const startDate = readFirstString(
    payload.startDate,
    payload.start_date,
    payload.startTime,
    payload.start_time,
    start?.dateTime
  );
  const endDate = readFirstString(
    payload.endDate,
    payload.end_date,
    payload.endTime,
    payload.end_time,
    end?.dateTime
  );
  const latitude = readFirstNumber(payload.latitude, payload.lat, location?.latitude);
  const longitude = readFirstNumber(payload.longitude, payload.lng, location?.longitude);

  if (!title || !startDate || latitude === null || longitude === null) {
    return null;
  }

  const externalId = readFirstString(payload.externalId, payload.external_id, payload.id) ?? rawEvent.externalId;
  const sourceUrl = readFirstString(payload.sourceUrl, payload.source_url, payload.url, rawEvent.sourceUrl);

  return {
    title,
    description:
      readFirstString(payload.description, payload.summary, payload.info, payload.pleaseNote) ?? title,
    citySlug: options.citySlug,
    categorySlug: options.categorySlug,
    startDate,
    endDate,
    latitude,
    longitude,
    address: readFirstString(payload.address, payload.venueName, payload.venue_name, venue?.name),
    imageUrl: readFirstImage(payload),
    externalId,
    eventType: "temporary",
    visibility: "public",
    sourceType: "api",
    sourceId: `${rawEvent.source}:${externalId}`,
    sourceUrl,
    confidenceScore: options.defaultConfidenceScore ?? 0.7
  };
}
