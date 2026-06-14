"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventStatus } from "@/lib/types";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase non configurato.");
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new Error("Accesso admin richiesto.");
  }

  return { supabase, user };
}

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Campo richiesto: ${key}`);
  }

  return value.trim();
}

export async function updateEventStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = requiredString(formData, "id");
  const status = requiredString(formData, "status") as EventStatus;

  if (!["pending", "approved", "rejected"].includes(status)) {
    throw new Error("Status evento non valido.");
  }

  await supabase.from("events").update({ status }).eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function saveEvent(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = requiredString(formData, "id");

  await supabase
    .from("events")
    .update({
      title: requiredString(formData, "title"),
      description: requiredString(formData, "description"),
      city_id: requiredString(formData, "city_id"),
      category_id: requiredString(formData, "category_id"),
      start_date: new Date(requiredString(formData, "start_date")).toISOString(),
      end_date: formData.get("end_date")
        ? new Date(String(formData.get("end_date"))).toISOString()
        : null,
      latitude: Number(requiredString(formData, "latitude")),
      longitude: Number(requiredString(formData, "longitude")),
      address: String(formData.get("address") ?? "") || null
    })
    .eq("id", id);

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function createAdminEvent(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const status = requiredString(formData, "status") as EventStatus;

  if (!["pending", "approved", "rejected"].includes(status)) {
    throw new Error("Status evento non valido.");
  }

  await supabase.from("events").insert({
    title: requiredString(formData, "title"),
    description: requiredString(formData, "description"),
    city_id: requiredString(formData, "city_id"),
    category_id: requiredString(formData, "category_id"),
    start_date: new Date(requiredString(formData, "start_date")).toISOString(),
    end_date: formData.get("end_date")
      ? new Date(String(formData.get("end_date"))).toISOString()
      : null,
    latitude: Number(requiredString(formData, "latitude")),
    longitude: Number(requiredString(formData, "longitude")),
    address: String(formData.get("address") ?? "") || null,
    image_url: String(formData.get("image_url") ?? "") || null,
    created_by: user.id,
    status
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteEvent(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = requiredString(formData, "id");

  await supabase.from("events").delete().eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function saveCategory(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const payload = {
    slug: requiredString(formData, "slug"),
    name_it: requiredString(formData, "name_it"),
    name_en: requiredString(formData, "name_en"),
    color: requiredString(formData, "color"),
    sort_order: Number(formData.get("sort_order") ?? 100),
    is_active: formData.get("is_active") === "on"
  };

  if (id) {
    await supabase.from("categories").update(payload).eq("id", id);
  } else {
    await supabase.from("categories").insert(payload);
  }

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function saveCity(formData: FormData) {
  const { supabase } = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const payload = {
    name: requiredString(formData, "name"),
    slug: requiredString(formData, "slug"),
    country_code: requiredString(formData, "country_code"),
    latitude: Number(requiredString(formData, "latitude")),
    longitude: Number(requiredString(formData, "longitude")),
    radius_km: Number(formData.get("radius_km") ?? 10),
    bbox: {
      south: Number(requiredString(formData, "south")),
      west: Number(requiredString(formData, "west")),
      north: Number(requiredString(formData, "north")),
      east: Number(requiredString(formData, "east"))
    },
    is_active: formData.get("is_active") === "on"
  };

  if (id) {
    await supabase.from("cities").update(payload).eq("id", id);
  } else {
    await supabase.from("cities").insert(payload);
  }

  revalidatePath("/admin");
  revalidatePath("/");
}
