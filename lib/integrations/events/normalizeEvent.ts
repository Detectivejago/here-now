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

function readTicketmasterCategorySlug(payload: Record<string, unknown>) {
  const classifications = payload.classifications as Array<Record<string, unknown>> | undefined;
  const primary = classifications?.find((classification) => classification.primary === true) ?? classifications?.[0];
  const segment = readObject(primary?.segment);
  const genre = readObject(primary?.genre);
  const segmentName = readFirstString(segment?.name, genre?.name)?.toLowerCase();

  if (!segmentName) {
    return undefined;
  }

  if (segmentName.includes("music")) {
    return "musica";
  }

  if (segmentName.includes("sport")) {
    return "sport";
  }

  if (segmentName.includes("art") || segmentName.includes("theatre") || segmentName.includes("arts")) {
    return "arte";
  }

  if (segmentName.includes("food")) {
    return "food";
  }

  return "club";
}

function readTicketmasterVenue(payload: Record<string, unknown>) {
  const embedded = readObject(payload._embedded);
  const venues = embedded?.venues as Array<Record<string, unknown>> | undefined;

  return venues?.[0] ?? null;
}

function readTicketmasterDateTime(value: Record<string, unknown> | null | undefined) {
  const dateTime = readFirstString(value?.dateTime);

  if (dateTime) {
    return dateTime;
  }

  const localDate = readFirstString(value?.localDate);
  const localTime = readFirstString(value?.localTime);

  if (!localDate) {
    return null;
  }

  return `${localDate}T${localTime ?? "19:00:00"}`;
}

function readTicketmasterAddress(venue: Record<string, unknown> | null) {
  const address = readObject(venue?.address);
  const city = readObject(venue?.city);
  const country = readObject(venue?.country);

  return [address?.line1, city?.name, country?.countryCode]
    .map(readString)
    .filter(Boolean)
    .join(", ") || null;
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
    readTicketmasterDateTime(start)
  );
  const endDate = readFirstString(
    payload.endDate,
    payload.end_date,
    payload.endTime,
    payload.end_time,
    readTicketmasterDateTime(end)
  );
  const latitude = readFirstNumber(payload.latitude, payload.lat, location?.latitude);
  const longitude = readFirstNumber(payload.longitude, payload.lng, location?.longitude);

  if (!title || !startDate || latitude === null || longitude === null) {
    return null;
  }

  const externalId = readFirstString(payload.externalId, payload.external_id, payload.id) ?? rawEvent.externalId;
  const sourceUrl = readFirstString(payload.sourceUrl, payload.source_url, payload.url, rawEvent.sourceUrl);
  const venueName = readFirstString(payload.venueName, payload.venue_name, venue?.name);

  return {
    title,
    description:
      readFirstString(payload.description, payload.summary, payload.info, payload.pleaseNote) ?? title,
    citySlug: options.citySlug,
    categorySlug: options.categorySlug ?? readTicketmasterCategorySlug(payload),
    startDate,
    endDate,
    timezone: readFirstString(payload.timezone, venue?.timezone),
    latitude,
    longitude,
    venueName,
    address: readFirstString(payload.address, readTicketmasterAddress(venue), venueName),
    imageUrl: readFirstImage(payload),
    externalId,
    eventType: "temporary",
    visibility: "public",
    sourceType: "imported",
    sourceId: `${rawEvent.source}:${externalId}`,
    sourceUrl,
    confidenceScore: options.defaultConfidenceScore ?? 0.78
  };
}
