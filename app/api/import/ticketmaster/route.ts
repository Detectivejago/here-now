import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { calculateEventQualityScore } from "@/lib/events/quality";
import { fetchTicketmasterEvents } from "@/lib/integrations/events/ticketmaster";
import type { NormalizedEventInput } from "@/lib/integrations/events/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Category, City, EventRecord } from "@/lib/types";
import { isInsideCityBounds } from "@/lib/utils/geo";

const importLimit = 20;
const ticketmasterProvider = "ticketmaster";
const sourceName = "Ticketmaster Discovery API";
const sourceBaseUrl = "https://app.ticketmaster.com/discovery/v2";
const testCitySlugs = ["milano", "new-york"];

type ImportResponse = {
  ok: boolean;
  disabled?: boolean;
  reason?: string;
  city?: string;
  fetched?: number;
  raw_saved?: number;
  created?: number;
  duplicates?: number;
  skipped?: number;
};

function jsonResponse(payload: ImportResponse, status = 200) {
  return NextResponse.json(payload, { status });
}

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { error: jsonResponse({ ok: false, reason: "Supabase non configurato." }, 503) };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: jsonResponse({ ok: false, reason: "Login admin richiesto." }, 401) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: jsonResponse({ ok: false, reason: "Accesso admin richiesto." }, 403) };
  }

  return { supabase, user };
}

function payloadHash(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenSet(value: string) {
  return new Set(normalizeText(value).split(" ").filter((token) => token.length > 2));
}

function titleSimilarity(a: string, b: string) {
  const aTokens = tokenSet(a);
  const bTokens = tokenSet(b);

  if (aTokens.size === 0 || bTokens.size === 0) {
    return 0;
  }

  const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size;

  return intersection / union;
}

function sameCalendarDay(a: string, b: string) {
  return a.slice(0, 10) === b.slice(0, 10);
}

function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) {
  const radiusKm = 6371;
  const latDelta = ((b.latitude - a.latitude) * Math.PI) / 180;
  const lngDelta = ((b.longitude - a.longitude) * Math.PI) / 180;
  const latA = (a.latitude * Math.PI) / 180;
  const latB = (b.latitude * Math.PI) / 180;
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(lngDelta / 2) ** 2;

  return 2 * radiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function looksDuplicate(candidate: NormalizedEventInput, existing: EventRecord) {
  if (candidate.externalId && existing.external_id === candidate.externalId) {
    return true;
  }

  if (!sameCalendarDay(candidate.startDate, existing.start_date)) {
    return false;
  }

  const titleScore = titleSimilarity(candidate.title, existing.title);
  const venueScore = titleSimilarity(candidate.venueName ?? candidate.address ?? "", existing.venue_name ?? existing.address ?? "");
  const nearby =
    Number.isFinite(existing.latitude) &&
    Number.isFinite(existing.longitude) &&
    distanceKm(
      { latitude: candidate.latitude, longitude: candidate.longitude },
      { latitude: existing.latitude, longitude: existing.longitude }
    ) <= 0.45;

  return titleScore >= 0.74 && (nearby || venueScore >= 0.6);
}

function dayRange(value: string) {
  const day = value.slice(0, 10);

  return {
    start: `${day}T00:00:00`,
    end: `${day}T23:59:59`
  };
}

async function getExistingEventsForCandidate(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  cityId: string,
  candidate: NormalizedEventInput
) {
  const range = dayRange(candidate.startDate);
  const { data } = await supabase
    .from("events")
    .select("id,title,start_date,latitude,longitude,venue_name,address,source_type,source_id,external_id,visibility")
    .eq("city_id", cityId)
    .gte("start_date", range.start)
    .lte("start_date", range.end)
    .limit(80);

  return (data ?? []) as EventRecord[];
}

async function findExistingExternalEvent(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  candidate: NormalizedEventInput
) {
  if (!candidate.externalId) {
    return null;
  }

  const { data } = await supabase
    .from("events")
    .select("id,title,start_date,latitude,longitude,venue_name,address,source_type,source_id,external_id,visibility")
    .eq("source_type", "imported")
    .eq("external_id", candidate.externalId)
    .limit(1);

  return ((data ?? [])[0] ?? null) as EventRecord | null;
}

async function ensureTicketmasterSource(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>
) {
  const sourcePayload = {
    provider: ticketmasterProvider,
    name: sourceName,
    source_type: "imported",
    base_url: sourceBaseUrl,
    api_key_env: "TICKETMASTER_API_KEY",
    enabled: Boolean(process.env.TICKETMASTER_API_KEY),
    is_active: false,
    reliability_score: 0.84,
    config: { adapter: "ticketmaster", mode: "manual-test" }
  };

  const { data, error } = await supabase
    .from("event_sources")
    .upsert(sourcePayload, { onConflict: "provider,name" })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Fonte Ticketmaster non salvata.");
  }

  return data.id as string;
}

async function chooseImportBatch(cities: City[]) {
  const now = new Date();
  const end = new Date(now);
  end.setDate(now.getDate() + 180);

  for (const city of cities) {
    const result = await fetchTicketmasterEvents({
      citySlug: city.slug,
      cityName: city.name,
      countryCode: city.country_code,
      startDateTime: now.toISOString(),
      endDateTime: end.toISOString(),
      size: importLimit
    });

    if (result.disabled || result.reason) {
      return { city, result };
    }

    if (result.normalizedEvents.length > 0) {
      return { city, result };
    }
  }

  const fallbackCity = cities[0];
  const result = fallbackCity
    ? await fetchTicketmasterEvents({
        citySlug: fallbackCity.slug,
        cityName: fallbackCity.name,
        countryCode: fallbackCity.country_code,
        startDateTime: now.toISOString(),
        endDateTime: end.toISOString(),
        size: importLimit
      })
    : null;

  return fallbackCity && result ? { city: fallbackCity, result } : null;
}

export async function POST() {
  const admin = await requireAdmin();

  if ("error" in admin) {
    return admin.error;
  }

  const { supabase } = admin;

  if (!process.env.TICKETMASTER_API_KEY) {
    return jsonResponse({
      ok: true,
      disabled: true,
      reason: "Missing TICKETMASTER_API_KEY",
      fetched: 0,
      raw_saved: 0,
      created: 0,
      duplicates: 0,
      skipped: 0
    });
  }

  const [{ data: cityRows }, { data: categoryRows }] = await Promise.all([
    supabase
      .from("cities")
      .select("*")
      .in("slug", testCitySlugs)
      .eq("is_active", true),
    supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
  ]);
  const cities = testCitySlugs
    .map((slug) => (cityRows ?? []).find((city) => city.slug === slug))
    .filter(Boolean) as City[];
  const categories = (categoryRows ?? []) as Category[];
  const defaultCategory = categories.find((category) => category.slug === "club") ?? categories[0];

  if (!cities.length || !defaultCategory) {
    return jsonResponse({ ok: false, reason: "Città test o categorie non configurate." }, 400);
  }

  const batch = await chooseImportBatch(cities);

  if (!batch) {
    return jsonResponse({ ok: false, reason: "Nessuna città test disponibile." }, 400);
  }

  if (batch.result.disabled) {
    return jsonResponse({
      ok: true,
      disabled: true,
      reason: batch.result.reason,
      city: batch.city.name,
      fetched: 0,
      raw_saved: 0,
      created: 0,
      duplicates: 0,
      skipped: 0
    });
  }

  if (batch.result.reason) {
    return jsonResponse({ ok: false, reason: batch.result.reason, city: batch.city.name }, 502);
  }

  const sourceId = await ensureTicketmasterSource(supabase);
  const rawRows = batch.result.rawEvents.map((event) => ({
    source_id: sourceId,
    external_id: event.externalId,
    raw_payload: event.payload,
    raw_json: event.payload,
    import_status: "pending",
    payload_hash: payloadHash(event.payload),
    imported_at: new Date().toISOString()
  }));

  if (rawRows.length > 0) {
    await supabase.from("raw_events").upsert(rawRows, { onConflict: "source_id,external_id" });
  }

  let created = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const candidate of batch.result.normalizedEvents.slice(0, importLimit)) {
    const category =
      categories.find((item) => item.slug === candidate.categorySlug) ?? defaultCategory;

    if (!isInsideCityBounds({
      latitude: candidate.latitude,
      longitude: candidate.longitude
    }, batch.city)) {
      skipped += 1;
      continue;
    }

    const externalDuplicate = await findExistingExternalEvent(supabase, candidate);
    const existing = externalDuplicate
      ? []
      : await getExistingEventsForCandidate(supabase, batch.city.id, candidate);
    const duplicate = externalDuplicate ?? existing.find((event) => looksDuplicate(candidate, event));

    if (duplicate) {
      duplicates += 1;
      await supabase
        .from("raw_events")
        .update({
          import_status: "duplicate",
          normalized_event_id: duplicate.id
        })
        .eq("source_id", sourceId)
        .eq("external_id", candidate.externalId);
      continue;
    }

    const eventPayload = {
      title: candidate.title,
      description: candidate.description,
      city_id: batch.city.id,
      category_id: category.id,
      start_date: candidate.startDate,
      end_date: candidate.endDate ?? null,
      start_time: candidate.startDate,
      end_time: candidate.endDate ?? null,
      timezone: candidate.timezone ?? batch.city.timezone ?? null,
      latitude: candidate.latitude,
      longitude: candidate.longitude,
      venue_name: candidate.venueName ?? null,
      address: candidate.address ?? candidate.venueName ?? null,
      image_url: candidate.imageUrl ?? null,
      created_by: null,
      moderation_status: "approved" as const,
      status: "upcoming" as const,
      event_type: candidate.eventType ?? "temporary",
      visibility: "public" as const,
      source_type: "imported" as const,
      source_id: candidate.sourceId ?? `${ticketmasterProvider}:${candidate.externalId}`,
      external_id: candidate.externalId,
      source_url: candidate.sourceUrl,
      confidence_score: candidate.confidenceScore ?? 0.78
    };

    const { data: inserted, error } = await supabase
      .from("events")
      .insert({
        ...eventPayload,
        quality_score: calculateEventQualityScore(eventPayload)
      })
      .select("id")
      .single();

    if (error || !inserted?.id) {
      skipped += 1;
      await supabase
        .from("raw_events")
        .update({
          import_status: "failed",
          error_message: error?.message ?? "Evento non inserito."
        })
        .eq("source_id", sourceId)
        .eq("external_id", candidate.externalId);
      continue;
    }

    created += 1;
    await supabase
      .from("raw_events")
      .update({
        import_status: "normalized",
        normalized_event_id: inserted.id
      })
      .eq("source_id", sourceId)
      .eq("external_id", candidate.externalId);
  }

  await supabase
    .from("event_sources")
    .update({ last_imported_at: new Date().toISOString() })
    .eq("id", sourceId);

  revalidatePath("/");

  return jsonResponse({
    ok: true,
    city: batch.city.name,
    fetched: batch.result.rawEvents.length,
    raw_saved: rawRows.length,
    created,
    duplicates,
    skipped
  });
}
