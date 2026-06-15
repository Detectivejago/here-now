import { getTemporalStatus } from "@/lib/events/filters";
import type { EventRecord, EventTemporalStatus } from "@/lib/types";
import type { NormalizedEventInput } from "./types";

type StatusCandidate = Pick<NormalizedEventInput, "eventType" | "startDate" | "endDate">;

export function updateEventStatus(
  event: EventRecord | StatusCandidate,
  now = new Date()
): EventTemporalStatus {
  if ("startDate" in event) {
    return getTemporalStatus(
      {
        id: "candidate",
        title: "",
        description: "",
        city_id: "",
        category_id: "",
        start_date: event.startDate,
        end_date: event.endDate ?? null,
        latitude: 0,
        longitude: 0,
        address: null,
        image_url: null,
        created_by: null,
        status: "upcoming",
        event_type: event.eventType ?? "temporary",
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      },
      now
    );
  }

  return getTemporalStatus(event, now);
}
