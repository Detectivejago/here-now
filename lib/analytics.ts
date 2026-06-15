"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getBrowserSessionId } from "@/lib/session";
import type { AnalyticsEventName } from "@/lib/types";

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

export async function trackAnalytics(
  eventName: AnalyticsEventName,
  payload: AnalyticsPayload = {}
) {
  if (typeof window === "undefined") {
    return;
  }

  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  await supabase.from("analytics_events").insert({
    event_name: eventName,
    session_id: getBrowserSessionId(),
    page_path: window.location.pathname,
    payload
  });
}
