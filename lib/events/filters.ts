import type { EventRecord, TimeFilter } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function getModerationStatus(event: EventRecord) {
  return event.moderation_status ?? (event.status === "approved" ? "approved" : event.status);
}

export function getLifecycleStatus(event: EventRecord, now = new Date()) {
  if (event.status === "cancelled") {
    return "cancelled";
  }

  if (event.status === "live_now" || event.status === "ongoing" || event.status === "expired") {
    return event.status;
  }

  const start = new Date(event.start_date);
  const end = event.end_date ? new Date(event.end_date) : null;

  if (Number.isNaN(start.getTime())) {
    return "upcoming";
  }

  if (end && end < now) {
    return "expired";
  }

  if (!end && event.event_type !== "permanent" && start.getTime() + 4 * 60 * 60 * 1000 < now.getTime()) {
    return "expired";
  }

  if (start <= now && (!end || end >= now)) {
    return "live_now";
  }

  return "upcoming";
}

export function isMapVisible(event: EventRecord) {
  const visibility = event.visibility ?? "public";

  return visibility === "public" || visibility === "password";
}

export function isPasswordLocked(event: EventRecord) {
  return (event.visibility ?? "public") === "password";
}

export function isApprovedForPublicMap(event: EventRecord, now = new Date()) {
  return (
    getModerationStatus(event) === "approved" &&
    isMapVisible(event) &&
    getLifecycleStatus(event, now) !== "expired" &&
    getLifecycleStatus(event, now) !== "cancelled"
  );
}

function isSameDay(date: Date, now: Date) {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function matchesTimeFilter(event: EventRecord, filter: TimeFilter, now = new Date()) {
  const eventType = event.event_type ?? "temporary";
  const lifecycle = getLifecycleStatus(event, now);
  const start = new Date(event.start_date);
  const end = event.end_date ? new Date(event.end_date) : null;

  if (filter === "permanent") {
    return eventType === "permanent";
  }

  if (eventType === "permanent") {
    return false;
  }

  if (lifecycle === "expired" || lifecycle === "cancelled" || Number.isNaN(start.getTime())) {
    return false;
  }

  if (filter === "now") {
    return start <= now && (!end || end >= now);
  }

  if (filter === "today") {
    return isSameDay(start, now) || Boolean(end && start <= now && isSameDay(end, now));
  }

  const weekEnd = new Date(now.getTime() + 7 * DAY_MS);
  return start <= weekEnd && (!end || end >= now);
}

export function filterEventsForMap(
  events: EventRecord[],
  filter: TimeFilter,
  now = new Date()
) {
  return events.filter((event) => isApprovedForPublicMap(event, now) && matchesTimeFilter(event, filter, now));
}
