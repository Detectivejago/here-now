import type { EventSourceType, EventType, EventVisibility } from "@/lib/types";

export type RawEventEnvelope = {
  source: string;
  externalId: string;
  payload: unknown;
  sourceUrl?: string | null;
  receivedAt?: string;
};

export type NormalizedEventInput = {
  title: string;
  description: string;
  citySlug: string;
  categorySlug?: string;
  startDate: string;
  endDate?: string | null;
  timezone?: string | null;
  latitude: number;
  longitude: number;
  venueName?: string | null;
  address?: string | null;
  imageUrl?: string | null;
  externalId?: string | null;
  eventType?: EventType;
  visibility?: EventVisibility;
  sourceType?: EventSourceType;
  sourceId?: string | null;
  sourceUrl?: string | null;
  confidenceScore?: number;
};

export type ImportAdapterResult = {
  source: string;
  rawEvents: RawEventEnvelope[];
  normalizedEvents: NormalizedEventInput[];
  disabled?: boolean;
  reason?: string;
};
