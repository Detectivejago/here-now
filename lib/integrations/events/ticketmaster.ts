import { dedupeEvents } from "./dedupeEvents";
import { normalizeEvent } from "./normalizeEvent";
import type { ImportAdapterResult, NormalizedEventInput, RawEventEnvelope } from "./types";

type TicketmasterAdapterOptions = {
  citySlug: string;
  cityName: string;
  categorySlug?: string;
  startDateTime?: string;
  endDateTime?: string;
  size?: number;
};

const ticketmasterBaseUrl = "https://app.ticketmaster.com/discovery/v2/events.json";

export async function fetchTicketmasterEvents({
  citySlug,
  cityName,
  categorySlug,
  startDateTime,
  endDateTime,
  size = 40
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
  url.searchParams.set("size", String(size));
  url.searchParams.set("sort", "date,asc");

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
    next: { revalidate: 60 * 30 }
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
      externalId: String(event.id ?? crypto.randomUUID()),
      payload: event
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
