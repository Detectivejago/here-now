import type { EventRecord, EventTemporalStatus, Locale, TimeFilter } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const STARTING_SOON_MS = 90 * 60 * 1000;

export function getModerationStatus(event: EventRecord) {
  return event.moderation_status ?? (event.status === "approved" ? "approved" : event.status);
}

function getEventStartDate(event: EventRecord) {
  return new Date(event.start_time ?? event.start_date);
}

function getEventEndDate(event: EventRecord) {
  if (event.end_time ?? event.end_date) {
    return new Date(event.end_time ?? event.end_date!);
  }

  if (event.event_type === "permanent") {
    return null;
  }

  return new Date(getEventStartDate(event).getTime() + 4 * HOUR_MS);
}

function isMultiDay(start: Date, end: Date | null) {
  if (!end) {
    return false;
  }

  return (
    end.getTime() - start.getTime() >= DAY_MS ||
    start.getFullYear() !== end.getFullYear() ||
    start.getMonth() !== end.getMonth() ||
    start.getDate() !== end.getDate()
  );
}

export function getTemporalStatus(event: EventRecord, now = new Date()): EventTemporalStatus {
  if (event.event_type === "permanent") {
    return "permanent";
  }

  if (event.status === "cancelled" || event.status === "expired") {
    return "ended";
  }

  const start = getEventStartDate(event);
  const end = getEventEndDate(event);

  if (Number.isNaN(start.getTime())) {
    return "upcoming";
  }

  if (end && end < now) {
    return "ended";
  }

  if (start <= now && (!end || end >= now)) {
    return isMultiDay(start, end) ? "ongoing" : "live_now";
  }

  const startsInMs = start.getTime() - now.getTime();

  if (startsInMs >= 0 && startsInMs <= STARTING_SOON_MS) {
    return "starting_soon";
  }

  if (isSameDay(start, now)) {
    return "today_later";
  }

  return "upcoming";
}

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

function isSameDay(date: Date, now: Date) {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function isTomorrow(date: Date, now: Date) {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  return isSameDay(date, tomorrow);
}

export function matchesTimeFilter(event: EventRecord, filter: TimeFilter, now = new Date()) {
  const eventType = event.event_type ?? "temporary";
  const temporalStatus = getTemporalStatus(event, now);
  const start = getEventStartDate(event);
  const end = getEventEndDate(event);

  if (temporalStatus === "ended" || Number.isNaN(start.getTime())) {
    return false;
  }

  if (filter === "private") {
    return isPasswordLocked(event);
  }

  if (filter === "permanent") {
    return temporalStatus === "permanent";
  }

  if (eventType === "permanent") {
    return false;
  }

  if (filter === "now") {
    return (
      temporalStatus === "live_now" ||
      temporalStatus === "ongoing" ||
      temporalStatus === "starting_soon"
    );
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

export function getTemporalStatusLabel(
  event: EventRecord,
  status: EventTemporalStatus,
  locale: Locale,
  now = new Date()
) {
  const start = getEventStartDate(event);
  const end = getEventEndDate(event);
  const formatter = new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-US", {
    weekday: "long"
  });

  if (status === "live_now") {
    return locale === "it" ? "Ora" : "Now";
  }

  if (status === "starting_soon") {
    const minutes = Math.max(1, Math.round((start.getTime() - now.getTime()) / 60000));
    return locale === "it" ? `Tra ${minutes} min` : `In ${minutes} min`;
  }

  if (status === "today_later") {
    return locale === "it" ? "Più tardi oggi" : "Later today";
  }

  if (status === "ongoing" && end) {
    const day = formatter.format(end);
    return locale === "it" ? `Fino a ${day}` : `Until ${day}`;
  }

  if (status === "permanent") {
    return locale === "it" ? "Sempre attivo" : "Always on";
  }

  if (status === "ended") {
    return locale === "it" ? "Terminato" : "Ended";
  }

  if (isTomorrow(start, now)) {
    return locale === "it" ? "Domani" : "Tomorrow";
  }

  const day = formatter.format(start);
  return locale === "it" ? `Prossimi giorni · ${day}` : `Upcoming · ${day}`;
}
