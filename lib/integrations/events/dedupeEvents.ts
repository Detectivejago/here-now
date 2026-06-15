import type { NormalizedEventInput } from "./types";

function eventKey(event: NormalizedEventInput) {
  if (event.sourceId) {
    return `source:${event.sourceId}`;
  }

  if (event.sourceType && event.externalId) {
    return `external:${event.sourceType}:${event.externalId}`;
  }

  const day = event.startDate.slice(0, 10);
  const title = event.title.toLowerCase().replace(/\s+/g, " ").trim();
  const lat = event.latitude.toFixed(3);
  const lng = event.longitude.toFixed(3);

  return `${title}|${day}|${lat}|${lng}`;
}

export function dedupeEvents(events: NormalizedEventInput[]) {
  const seen = new Set<string>();

  return events.filter((event) => {
    const key = eventKey(event);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
