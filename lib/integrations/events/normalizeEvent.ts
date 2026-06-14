import type { NormalizedEventInput, RawEventEnvelope } from "./types";

type NormalizeEventOptions = {
  citySlug: string;
  categorySlug?: string;
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

export function normalizeEvent(
  rawEvent: RawEventEnvelope,
  options: NormalizeEventOptions
): NormalizedEventInput | null {
  const payload = rawEvent.payload as Record<string, unknown>;
  const dates = payload.dates as Record<string, unknown> | undefined;
  const start = dates?.start as Record<string, unknown> | undefined;
  const embedded = payload._embedded as Record<string, unknown> | undefined;
  const venues = embedded?.venues as Array<Record<string, unknown>> | undefined;
  const venue = venues?.[0];
  const location = venue?.location as Record<string, unknown> | undefined;
  const images = payload.images as Array<Record<string, unknown>> | undefined;
  const title = readString(payload.name);
  const startDate = readString(start?.dateTime);
  const latitude = readNumberString(location?.latitude);
  const longitude = readNumberString(location?.longitude);

  if (!title || !startDate || latitude === null || longitude === null) {
    return null;
  }

  return {
    title,
    description: readString(payload.info) ?? readString(payload.pleaseNote) ?? title,
    citySlug: options.citySlug,
    categorySlug: options.categorySlug,
    startDate,
    endDate: null,
    latitude,
    longitude,
    address: readString(venue?.name),
    imageUrl: readString(images?.[0]?.url),
    eventType: "temporary",
    visibility: "public",
    sourceType: "api",
    sourceId: `${rawEvent.source}:${rawEvent.externalId}`,
    confidenceScore: 0.8
  };
}
