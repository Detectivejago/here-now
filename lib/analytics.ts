"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AnalyticsEventName } from "@/lib/types";

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

function getSessionId() {
  const key = "herenow_session_id";
  const existing = window.localStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const sessionId = crypto.randomUUID();
  window.localStorage.setItem(key, sessionId);
  return sessionId;
}

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
    session_id: getSessionId(),
    page_path: window.location.pathname,
    payload
  });
}
