"use client";

const sessionStorageKey = "herenow_session_id";

export function getBrowserSessionId() {
  const existing = window.localStorage.getItem(sessionStorageKey);

  if (existing) {
    return existing;
  }

  const sessionId = crypto.randomUUID();
  window.localStorage.setItem(sessionStorageKey, sessionId);
  return sessionId;
}
