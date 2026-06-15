"use server";

import { createHash } from "node:crypto";

type HashEventPasswordResult =
  | {
      ok: true;
      passwordHash: string;
    }
  | {
      ok: false;
      reason: "empty" | "unavailable";
    };

export async function hashEventPassword(password: string): Promise<HashEventPasswordResult> {
  if (!password.trim()) {
    return { ok: false, reason: "empty" };
  }

  try {
    return {
      ok: true,
      passwordHash: createHash("sha256").update(password).digest("hex")
    };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}
