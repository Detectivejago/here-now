import type { Category, City, EventRecord } from "@/lib/types";

type EventRecordRow = Omit<EventRecord, "cities" | "categories"> & {
  cities?: City | City[] | null;
  categories?: Category | Category[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function normalizeEventRecord(row: unknown): EventRecord {
  const event = row as EventRecordRow;

  return {
    ...event,
    description: event.description ?? "",
    address: event.address ?? null,
    image_url: event.image_url ?? null,
    cities: firstRelation(event.cities),
    categories: firstRelation(event.categories)
  };
}

export function normalizeEventRecords(rows: unknown[] | null | undefined) {
  return (rows ?? []).map(normalizeEventRecord);
}
