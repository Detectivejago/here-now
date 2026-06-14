"use client";

import Image from "next/image";
import L from "leaflet";
import { CalendarDays, MapPin } from "lucide-react";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { trackAnalytics } from "@/lib/analytics";
import type { Category, City, EventRecord, Locale } from "@/lib/types";
import { formatEventDate } from "@/lib/utils/date";
import { getCityBoundsTuple } from "@/lib/utils/geo";

type EventMapProps = {
  city: City;
  categories: Category[];
  events: EventRecord[];
  locale: Locale;
  focusKey: number;
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

function createMarkerIcon(color: string) {
  return L.divIcon({
    className: "event-dot-marker",
    html: `<div class="event-dot" style="--marker-color:${color}"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -12]
  });
}

export default function EventMap({ city, categories, events, locale, focusKey }: EventMapProps) {
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

          return (
            <Marker
              key={event.id}
              position={[event.latitude, event.longitude]}
              icon={createMarkerIcon(markerColor)}
              eventHandlers={{
                click: () =>
                  trackAnalytics("event_clicked", {
                    event_id: event.id,
                    city_id: event.city_id,
                    category_id: event.category_id
                  })
              }}
            >
              <Popup closeButton>
                <article className="event-popup">
                  {event.image_url ? (
                    <div className="event-popup-image">
                      <Image
                        src={event.image_url}
                        alt=""
                        fill
                        sizes="250px"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                  ) : null}

                  <div className="event-popup-body">
                    <h2 className="event-popup-title">{event.title}</h2>
                    <div className="event-popup-meta">
                      <span style={{ color: markerColor, fontWeight: 900 }}>
                        {categoryName(category, locale)}
                      </span>
                      <span>
                        <CalendarDays size={14} aria-hidden="true" />{" "}
                        {formatEventDate(event.start_date, locale)}
                      </span>
                      {event.address ? (
                        <span>
                          <MapPin size={14} aria-hidden="true" /> {event.address}
                        </span>
                      ) : null}
                    </div>
                    <p className="event-popup-description">{event.description}</p>
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
