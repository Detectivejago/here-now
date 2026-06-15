"use server";

import { createHash } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type UnlockResult =
  | {
      ok: true;
      details: {
        description: string;
        address: string | null;
        latitude: number;
        longitude: number;
        image_url: string | null;
      };
    }
  | { ok: false; message: string };

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

export async function unlockEventDetails(eventId: string, password: string): Promise<UnlockResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return { ok: false, message: "Servizio non disponibile. Riprova tra poco." };
  }

  if (!password.trim()) {
    return { ok: false, message: "Inserisci la password evento." };
  }

  const passwordHash = hashPassword(password);
  const rpcResult = await supabase.rpc("unlock_private_event", {
    event_id_input: eventId,
    password_hash_input: passwordHash
  });

  if (!rpcResult.error && rpcResult.data?.[0]) {
    const details = rpcResult.data[0];

    return {
      ok: true,
      details: {
        description: details.description,
        address: details.address,
        latitude: details.latitude,
        longitude: details.longitude,
        image_url: details.image_url
      }
    };
  }

  const { data: event } = await supabase
    .from("events")
    .select("password_hash, description, address, latitude, longitude, image_url")
    .eq("id", eventId)
    .eq("visibility", "password")
    .single();

  if (!event || event.password_hash !== passwordHash) {
    return { ok: false, message: "Password non corretta." };
  }

  return {
    ok: true,
    details: {
      description: event.description,
      address: event.address,
      latitude: event.latitude,
      longitude: event.longitude,
      image_url: event.image_url
    }
  };
}
