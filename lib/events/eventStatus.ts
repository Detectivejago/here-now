import type { EventRecord, EventTemporalStatus, Locale } from "@/lib/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
export const STARTING_SOON_MS = 90 * MINUTE_MS;

export function getEventStartDate(event: EventRecord) {
  return readDate(event.start_time ?? event.start_date);
}

export function getEventEndDate(event: EventRecord) {
  return readDate(event.end_time ?? event.end_date ?? event.expires_at);
}

export function isSameDay(date: Date, now: Date) {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function isTomorrow(date: Date, now: Date) {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  return isSameDay(date, tomorrow);
}

export function isMultiDay(start: Date, end: Date | null) {
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
  if (event.status === "cancelled" || event.status === "expired") {
    return "ended";
  }

  const start = getEventStartDate(event);
  const end = getEventEndDate(event);

  if (end && end < now) {
    return "ended";
  }

  if (event.event_type === "permanent") {
    return "permanent";
  }

  if (!start) {
    return "upcoming";
  }

  if (start <= now) {
    if (end && end >= now) {
      return isMultiDay(start, end) ? "ongoing" : "live_now";
    }

    return isSameDay(start, now) ? "live_now" : "upcoming";
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

  if (status === "starting_soon" && start) {
    const minutes = Math.max(1, Math.round((start.getTime() - now.getTime()) / MINUTE_MS));

    if (minutes >= 60) {
      const hours = Math.max(1, Math.round(minutes / 60));
      return locale === "it" ? `Tra ${hours}h` : `In ${hours}h`;
    }

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
    return locale === "it" ? "Sempre" : "Always";
  }

  if (status === "ended") {
    return locale === "it" ? "Terminato" : "Ended";
  }

  if (!start) {
    return locale === "it" ? "In programma" : "Upcoming";
  }

  if (isTomorrow(start, now)) {
    return locale === "it" ? "Domani" : "Tomorrow";
  }

  const day = formatter.format(start);
  return locale === "it" ? capitalize(day) : capitalize(day);
}

function readDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
