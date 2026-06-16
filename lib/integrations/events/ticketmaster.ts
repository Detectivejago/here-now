import { dedupeEvents } from "./dedupeEvents";
import { normalizeEvent } from "./normalizeEvent";
import type { ImportAdapterResult, NormalizedEventInput, RawEventEnvelope } from "./types";

type TicketmasterAdapterOptions = {
  citySlug: string;
  cityName: string;
  countryCode?: string;
  categorySlug?: string;
  startDateTime?: string;
  endDateTime?: string;
  size?: number;
};

const ticketmasterBaseUrl = "https://app.ticketmaster.com/discovery/v2/events.json";

function fallbackExternalId(event: Record<string, unknown>, citySlug: string) {
  const name = typeof event.name === "string" ? event.name : "event";
  const dates = event.dates && typeof event.dates === "object" ? event.dates as Record<string, unknown> : null;
  const start = dates?.start && typeof dates.start === "object" ? dates.start as Record<string, unknown> : null;
  const localDate = typeof start?.localDate === "string" ? start.localDate : "unknown-date";

  return `${citySlug}-${name}-${localDate}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 120);
}

export async function fetchTicketmasterEvents({
  citySlug,
  cityName,
  countryCode,
  categorySlug,
  startDateTime,
  endDateTime,
  size = 20
}: TicketmasterAdapterOptions): Promise<ImportAdapterResult> {
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    return {
      source: "ticketmaster",
      rawEvents: [],
      normalizedEvents: [],
      disabled: true,
      reason: "Missing TICKETMASTER_API_KEY"
    };
  }

  const url = new URL(ticketmasterBaseUrl);
  url.searchParams.set("apikey", apiKey);
  url.searchParams.set("city", cityName);
  url.searchParams.set("size", String(Math.min(size, 20)));
  url.searchParams.set("sort", "date,asc");
  url.searchParams.set("source", "ticketmaster");
  url.searchParams.set("includeTBA", "no");
  url.searchParams.set("includeTBD", "no");

  if (countryCode) {
    url.searchParams.set("countryCode", countryCode);
  }

  if (startDateTime) {
    url.searchParams.set("startDateTime", startDateTime);
  }

  if (endDateTime) {
    url.searchParams.set("endDateTime", endDateTime);
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return {
      source: "ticketmaster",
      rawEvents: [],
      normalizedEvents: [],
      disabled: false,
      reason: `Ticketmaster responded with ${response.status}`
    };
  }

  const payload = (await response.json()) as {
    _embedded?: {
      events?: Array<Record<string, unknown>>;
    };
  };
  const rawEvents: RawEventEnvelope[] =
    payload._embedded?.events?.map((event) => ({
      source: "ticketmaster",
      externalId: String(event.id ?? fallbackExternalId(event, citySlug)),
      payload: event,
      sourceUrl: typeof event.url === "string" ? event.url : null,
      receivedAt: new Date().toISOString()
    })) ?? [];
  const normalizedEvents = dedupeEvents(
    rawEvents
      .map((event) => normalizeEvent(event, { citySlug, categorySlug }))
      .filter((event): event is NormalizedEventInput => Boolean(event))
  );

  return {
    source: "ticketmaster",
    rawEvents,
    normalizedEvents
  };
}
