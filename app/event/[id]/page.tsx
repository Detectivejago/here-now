import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ExternalLink, Lock, MapPin } from "lucide-react";
import LockedEventDetails from "@/components/event/LockedEventDetails";
import ReportEventButton from "@/components/event/ReportEventButton";
import { getTemporalStatus, getTemporalStatusLabel, isPasswordLocked } from "@/lib/events/filters";
import { normalizeEventRecord } from "@/lib/events/records";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { legacyPublicEventSelect, publicEventSelect } from "@/lib/supabase/selects";
import { formatEventDate } from "@/lib/utils/date";

type EventPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ token?: string | string[] }>;
};

export const dynamic = "force-dynamic";

function readToken(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function EventPage({ params, searchParams }: EventPageProps) {
  const { id } = await params;
  const token = readToken((await searchParams)?.token);
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    notFound();
  }

  let event: unknown | null = null;

  if (token) {
    const linkResult = await supabase
      .rpc("get_link_only_event", {
        event_id_input: id,
        secret_token_input: token
      })
      .single();

    event = linkResult.data;
  } else {
    const shellResult = await supabase
      .rpc("get_event_detail_shell", {
        event_id_input: id
      })
      .single();

    event = shellResult.data;

    if (!event) {
      let eventResult = await supabase
        .from("events")
        .select(publicEventSelect)
        .eq("id", id)
        .single();

      if (eventResult.error) {
        eventResult = await supabase
          .from("events")
          .select(legacyPublicEventSelect)
          .eq("id", id)
          .single();
      }

      event = eventResult.data;
    }
  }

  if (!event) {
    notFound();
  }

  const typedEvent = normalizeEventRecord(event);
  const locked = isPasswordLocked(typedEvent);
  const temporalStatus = getTemporalStatus(typedEvent);
  const mapsQuery = typedEvent.address
    ? `${typedEvent.address} ${typedEvent.latitude},${typedEvent.longitude}`
    : `${typedEvent.latitude},${typedEvent.longitude}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

  return (
    <main className="event-page">
      <article className="event-detail-card">
        {typedEvent.image_url && !locked ? (
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
            {typedEvent.address && !locked ? (
              <span>
                <MapPin size={14} aria-hidden="true" /> {typedEvent.address}
              </span>
            ) : null}
          </div>
          {locked ? (
            <LockedEventDetails eventId={typedEvent.id} />
          ) : (
            <>
              <p className="event-popup-description">{typedEvent.description}</p>
              <a className="maps-button detail-map-link" href={mapsUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={14} aria-hidden="true" />
                Apri in Maps
              </a>
            </>
          )}
          <ReportEventButton eventId={typedEvent.id} />
        </div>
      </article>
    </main>
  );
}
