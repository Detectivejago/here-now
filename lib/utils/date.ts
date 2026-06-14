import { format } from "date-fns";
import { enUS, it } from "date-fns/locale";
import type { Locale } from "@/lib/types";

export function formatEventDate(value: string, locale: Locale) {
  return format(new Date(value), "EEE d MMM, HH:mm", {
    locale: locale === "it" ? it : enUS
  });
}
