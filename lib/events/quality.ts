import type { EventRecord } from "@/lib/types";

type EventQualityInput = Partial<
  Pick<
    EventRecord,
    | "title"
    | "description"
    | "address"
    | "venue_name"
    | "latitude"
    | "longitude"
    | "start_date"
    | "start_time"
    | "source_type"
    | "confidence_score"
    | "verified_at"
  >
>;

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function hasCoordinates(event: EventQualityInput) {
  return (
    typeof event.latitude === "number" &&
    Number.isFinite(event.latitude) &&
    typeof event.longitude === "number" &&
    Number.isFinite(event.longitude)
  );
}

function hasClearTime(event: EventQualityInput) {
  const dateValue = event.start_time ?? event.start_date;

  if (!dateValue) {
    return false;
  }

  return !Number.isNaN(new Date(dateValue).getTime());
}

export function calculateEventQualityScore(event: EventQualityInput) {
  let score = 0;

  if (hasText(event.title)) score += 0.16;
  if (hasText(event.address) || hasText(event.venue_name)) score += 0.15;
  if (hasCoordinates(event)) score += 0.18;
  if (hasClearTime(event)) score += 0.16;
  if (hasText(event.description)) score += 0.15;

  if (event.source_type === "partner" || event.source_type === "manual") {
    score += 0.1;
  } else if (event.source_type === "api" && (event.confidence_score ?? 0) >= 0.75) {
    score += 0.08;
  } else if ((event.confidence_score ?? 0) >= 0.85) {
    score += 0.05;
  }

  if (event.verified_at) {
    score += 0.1;
  }

  return Math.min(1, Number(score.toFixed(2)));
}

export function getEventQualityScore(event: EventRecord) {
  return event.quality_score ?? calculateEventQualityScore(event);
}

export function isLowQualityEvent(event: EventRecord) {
  return getEventQualityScore(event) < 0.45;
}
