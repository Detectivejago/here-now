import type { EventRecord, TimeFilter } from "@/lib/types";
import {
  getEventEndDate,
  getEventStartDate,
  getTemporalStatus,
  getTemporalStatusLabel,
  isSameDay
} from "./eventStatus";

const DAY_MS = 24 * 60 * 60 * 1000;

export function getModerationStatus(event: EventRecord) {
  return event.moderation_status ?? (event.status === "approved" ? "approved" : event.status);
}

export { getTemporalStatus, getTemporalStatusLabel };

export function getLifecycleStatus(event: EventRecord, now = new Date()) {
  return getTemporalStatus(event, now);
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
    getTemporalStatus(event, now) !== "ended"
  );
}

export function matchesTimeFilter(event: EventRecord, filter: TimeFilter, now = new Date()) {
  const temporalStatus = getTemporalStatus(event, now);
  const start = getEventStartDate(event);
  const end = getEventEndDate(event);

  if (temporalStatus === "ended") {
    return false;
  }

  if (filter === "private") {
    return isPasswordLocked(event);
  }

  if (filter === "permanent") {
    return temporalStatus === "permanent";
  }

  if (filter === "now") {
    return (
      temporalStatus === "live_now" ||
      temporalStatus === "ongoing" ||
      temporalStatus === "starting_soon" ||
      temporalStatus === "permanent"
    );
  }

  if (temporalStatus === "permanent") {
    return false;
  }

  if (filter === "today") {
    return (
      temporalStatus === "live_now" ||
      temporalStatus === "starting_soon" ||
      temporalStatus === "today_later" ||
      temporalStatus === "ongoing" ||
      Boolean(start && isSameDay(start, now)) ||
      Boolean(end && end >= now && isSameDay(end, now))
    );
  }

  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(now.getTime() + 7 * DAY_MS);
  return (
    temporalStatus === "ongoing" ||
    Boolean(start && start >= weekStart && start <= weekEnd && (!end || end >= now))
  );
}

export function filterEventsForMap(
  events: EventRecord[],
  filter: TimeFilter,
  now = new Date()
) {
  return events.filter((event) => isApprovedForPublicMap(event, now) && matchesTimeFilter(event, filter, now));
}
