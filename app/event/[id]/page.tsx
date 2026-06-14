import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Lock, MapPin } from "lucide-react";
import { getTemporalStatus, getTemporalStatusLabel, isPasswordLocked } from "@/lib/events/filters";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventRecord } from "@/lib/types";
import { formatEventDate } from "@/lib/utils/date";

type EventPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    notFound();
  }

  const { data: event } = await supabase
    .from("events")
    .select("*, cities(*), categories(*)")
    .eq("id", id)
    .single();

  if (!event) {
    notFound();
  }

  const typedEvent = event as EventRecord;
  const locked = isPasswordLocked(typedEvent);
  const temporalStatus = getTemporalStatus(typedEvent);

  return (
    <main className="event-page">
      <article className="event-detail-card">
        {typedEvent.image_url ? (
          <div className="event-detail-image">
            <Image src={typedEvent.image_url} alt="" fill sizes="520px" style={{ objectFit: "cover" }} />
          </div>
        ) : null}

        <div className="event-detail-body">
          <Link href="/" className="event-back-link">
            Torna alla mappa
          </Link>
          <div className="event-popup-heading">
            <h1>{typedEvent.title}</h1>
            {locked ? (
              <span className="locked-badge">
                <Lock size={13} aria-hidden="true" />
                Privato
              </span>
            ) : null}
          </div>
          <div className="event-popup-meta">
            <span>{typedEvent.categories?.name_it ?? "Evento"}</span>
            <span>{getTemporalStatusLabel(typedEvent, temporalStatus, "it")}</span>
            <span>
              <CalendarDays size={14} aria-hidden="true" /> {formatEventDate(typedEvent.start_date, "it")}
            </span>
            {typedEvent.address ? (
              <span>
                <MapPin size={14} aria-hidden="true" /> {typedEvent.address}
              </span>
            ) : null}
          </div>
          <p className="event-popup-description">
            {locked ? "Questo evento e protetto da password." : typedEvent.description}
          </p>
        </div>
      </article>
    </main>
  );
}
