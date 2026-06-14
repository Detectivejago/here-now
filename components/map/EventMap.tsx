"use client";

import Link from "next/link";
import L from "leaflet";
import { Lock, MapPin } from "lucide-react";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { trackAnalytics } from "@/lib/analytics";
import {
  getTemporalStatus,
  getTemporalStatusLabel,
  isPasswordLocked
} from "@/lib/events/filters";
import type { Category, City, EventRecord, EventTemporalStatus, Locale } from "@/lib/types";
import { getCityBoundsTuple, getDistanceKm } from "@/lib/utils/geo";

type EventMapProps = {
  city: City;
  categories: Category[];
  events: EventRecord[];
  locale: Locale;
  focusKey: number;
  userLocation: { latitude: number; longitude: number } | null;
};

function MapUpdater({ city, focusKey }: { city: City; focusKey: number }) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.latLngBounds(getCityBoundsTuple(city));
    map.setMaxBounds(bounds.pad(0.28));
    map.fitBounds(bounds, { padding: [28, 28], animate: true });
  }, [city, focusKey, map]);

  return null;
}

function categoryName(category: Category | null | undefined, locale: Locale) {
  if (!category) {
    return locale === "it" ? "Evento" : "Event";
  }

  return locale === "it" ? category.name_it : category.name_en;
}

function createMarkerIcon(color: string, status: EventTemporalStatus, isLocked: boolean) {
  return L.divIcon({
    className: `event-dot-marker marker-${status}${isLocked ? " marker-private" : ""}`,
    html: `<div class="event-dot status-${status}${isLocked ? " is-private" : ""}" style="--marker-color:${color}"><span class="event-lock"></span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -12]
  });
}

function formatDistance(distanceKm: number, locale: Locale) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toLocaleString(locale === "it" ? "it-IT" : "en-US", {
    maximumFractionDigits: distanceKm < 10 ? 1 : 0
  })} km`;
}

function sourceLabel(event: EventRecord, locale: Locale) {
  const source = event.source_type ?? "manual";
  const confidence = Math.round((event.confidence_score ?? 1) * 100);

  return locale === "it" ? `Fonte ${source} · ${confidence}%` : `Source ${source} · ${confidence}%`;
}

export default function EventMap({
  city,
  categories,
  events,
  locale,
  focusKey,
  userLocation
}: EventMapProps) {
  const cityBounds = getCityBoundsTuple(city);
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  return (
    <div className="map-shell">
      <MapContainer
        className="map-inner"
        center={[city.latitude, city.longitude]}
        zoom={13}
        minZoom={11}
        maxZoom={18}
        maxBounds={cityBounds}
        maxBoundsViscosity={0.82}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <MapUpdater city={city} focusKey={focusKey} />

        {events.map((event) => {
          const category = event.categories ?? categoryById.get(event.category_id);
          const markerColor = category?.color ?? "#FF6B61";
          const isLocked = isPasswordLocked(event);
          const temporalStatus = getTemporalStatus(event);
          const temporalLabel = getTemporalStatusLabel(event, temporalStatus, locale);
          const distance = userLocation
            ? getDistanceKm(userLocation, {
                latitude: event.latitude,
                longitude: event.longitude
              })
            : null;

          return (
            <Marker
              key={event.id}
              position={[event.latitude, event.longitude]}
              icon={createMarkerIcon(markerColor, temporalStatus, isLocked)}
              eventHandlers={{
                click: () =>
                  trackAnalytics("event_clicked", {
                    event_id: event.id,
                    city_id: event.city_id,
                    category_id: event.category_id,
                    temporal_status: temporalStatus
                  })
              }}
            >
              <Popup closeButton>
                <article className="event-popup mini-event-card">
                  <div className="event-popup-body">
                    <div className="event-popup-heading">
                      <h2 className="event-popup-title">{event.title}</h2>
                      {isLocked ? (
                        <span className="locked-badge">
                          <Lock size={13} aria-hidden="true" />
                          {locale === "it" ? "Privato" : "Private"}
                        </span>
                      ) : null}
                    </div>
                    <div className="event-popup-meta">
                      <span style={{ color: markerColor, fontWeight: 900 }}>
                        {categoryName(category, locale)}
                      </span>
                      <span>{temporalLabel}</span>
                      {event.address ? (
                        <span>
                          <MapPin size={14} aria-hidden="true" /> {event.address}
                        </span>
                      ) : null}
                      {distance !== null ? <span>{formatDistance(distance, locale)}</span> : null}
                      <span>{sourceLabel(event, locale)}</span>
                    </div>
                    <Link className="detail-button" href={`/event/${event.id}`}>
                      {locale === "it" ? "Apri dettagli" : "Open details"}
                    </Link>
                  </div>
                </article>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
