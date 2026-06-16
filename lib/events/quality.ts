import type { EventRecord } from "@/lib/types";

type EventQualityInput = Partial<
  Pick<
    EventRecord,
    | "title"
    | "description"
    | "address"
    | "venue_name"
    | "category_id"
    | "latitude"
    | "longitude"
    | "start_date"
    | "start_time"
    | "moderation_status"
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

function hasCategory(event: EventQualityInput) {
  return hasText(event.category_id);
}

function hasReliableSource(event: EventQualityInput) {
  if (!event.source_type) {
    return false;
  }

  if (event.source_type === "partner" || event.source_type === "manual") {
    return true;
  }

  return (event.source_type === "api" || event.source_type === "imported") && (event.confidence_score ?? 0) >= 0.65;
}

function isVerifiedOrApproved(event: EventQualityInput) {
  return Boolean(event.verified_at) || event.moderation_status === "approved";
}

export function calculateEventQualityScore(event: EventQualityInput) {
  let score = 0;

  if (hasText(event.title)) score += 0.14;
  if (hasText(event.address) || hasText(event.venue_name)) score += 0.13;
  if (hasCoordinates(event)) score += 0.16;
  if (hasClearTime(event)) score += 0.15;
  if (hasText(event.description)) score += 0.13;
  if (hasCategory(event)) score += 0.12;
  if (hasReliableSource(event)) score += 0.09;
  if (isVerifiedOrApproved(event)) score += 0.08;

  return Math.min(1, Number(score.toFixed(2)));
}

export function getEventQualityScore(event: EventRecord) {
  return event.quality_score ?? calculateEventQualityScore(event);
}

export function isLowQualityEvent(event: EventRecord) {
  return getEventQualityScore(event) < 0.45;
}
