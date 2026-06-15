"use client";

import L from "leaflet";
import { ExternalLink, Lock, MapPin, X } from "lucide-react";
import { type CSSProperties, useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { trackAnalytics } from "@/lib/analytics";
import {
  getTemporalStatus,
  getTemporalStatusLabel,
  isPasswordLocked
} from "@/lib/events/filters";
import { getEventQualityScore, isLowQualityEvent } from "@/lib/events/quality";
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

type MapView = {
  south: number;
  west: number;
  north: number;
  east: number;
  zoom: number;
};

type EventCluster = {
  id: string;
  events: EventRecord[];
  latitude: number;
  longitude: number;
};

type SelectedSheet =
  | {
      type: "event";
      event: EventRecord;
    }
  | {
      type: "cluster";
      cluster: EventCluster;
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

function getMapView(map: L.Map): MapView {
  const bounds = map.getBounds().pad(0.12);

  return {
    south: bounds.getSouth(),
    west: bounds.getWest(),
    north: bounds.getNorth(),
    east: bounds.getEast(),
    zoom: map.getZoom()
  };
}

function MapViewportTracker({
  onChange,
  onMapTap
}: {
  onChange: (view: MapView) => void;
  onMapTap: () => void;
}) {
  const map = useMapEvents({
    click: onMapTap,
    moveend: () => onChange(getMapView(map)),
    zoomend: () => onChange(getMapView(map))
  });

  useEffect(() => {
    onChange(getMapView(map));
  }, [map, onChange]);

  return null;
}

function categoryName(category: Category | null | undefined, locale: Locale) {
  if (!category) {
    return locale === "it" ? "Evento" : "Event";
  }

  return locale === "it" ? category.name_it : category.name_en;
}

function createMarkerIcon(
  color: string,
  status: EventTemporalStatus,
  isLocked: boolean,
  isLowQuality: boolean
) {
  return L.divIcon({
    className: `event-dot-marker marker-${status}${isLocked ? " marker-private" : ""}${isLowQuality ? " marker-low-quality" : ""}`,
    html: `<div class="event-dot status-${status}${isLocked ? " is-private" : ""}${isLowQuality ? " quality-low" : ""}" style="--marker-color:${color}"><span class="event-lock"></span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -12]
  });
}

function createClusterIcon(color: string, count: number, hasLiveNow: boolean) {
  return L.divIcon({
    className: `event-cluster-marker${hasLiveNow ? " live-cluster" : ""}`,
    html: `<div class="event-cluster" style="--marker-color:${color}"><span>${count}</span></div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -14]
  });
}

function clusterEvents(events: EventRecord[], zoom = 13) {
  const gridSize = zoom <= 12 ? 0.006 : zoom <= 14 ? 0.0022 : 0.0012;
  const groups = new Map<string, EventRecord[]>();

  for (const event of events) {
    if (!Number.isFinite(event.latitude) || !Number.isFinite(event.longitude)) {
      continue;
    }

    const key = `${Math.round(event.latitude / gridSize)}:${Math.round(event.longitude / gridSize)}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  return Array.from(groups.entries()).map(([key, groupedEvents]) => {
    const latitude =
      groupedEvents.reduce((total, event) => total + event.latitude, 0) / groupedEvents.length;
    const longitude =
      groupedEvents.reduce((total, event) => total + event.longitude, 0) / groupedEvents.length;

    return {
      id: key,
      events: groupedEvents,
      latitude,
      longitude
    };
  });
}

function isInsideMapView(event: EventRecord, view: MapView) {
  return (
    event.latitude >= view.south &&
    event.latitude <= view.north &&
    event.longitude >= view.west &&
    event.longitude <= view.east
  );
}

function getMarkerLimit(zoom?: number) {
  if (!zoom || zoom <= 12) {
    return 70;
  }

  if (zoom <= 14) {
    return 120;
  }

  return 180;
}

const statusPriority: Record<EventTemporalStatus, number> = {
  live_now: 0,
  starting_soon: 1,
  ongoing: 2,
  today_later: 3,
  permanent: 4,
  upcoming: 5,
  ended: 6
};

function getVisibleEvents(events: EventRecord[], view: MapView | null) {
  const now = new Date();
  const scopedEvents = view ? events.filter((event) => isInsideMapView(event, view)) : events;

  return scopedEvents
    .filter((event) => getTemporalStatus(event, now) !== "ended")
    .slice()
    .sort((a, b) => {
      const statusDelta =
        statusPriority[getTemporalStatus(a, now)] - statusPriority[getTemporalStatus(b, now)];

      if (statusDelta !== 0) {
        return statusDelta;
      }

      const qualityDelta = getEventQualityScore(b) - getEventQualityScore(a);

      if (qualityDelta !== 0) {
        return qualityDelta;
      }

      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    })
    .slice(0, getMarkerLimit(view?.zoom));
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
  const visibility = event.visibility ?? "public";
  const sourceName =
    visibility === "password" || visibility === "private"
      ? "Private"
      : source === "api"
        ? "Imported"
        : source === "partner"
          ? "Verified"
          : source === "user"
            ? "User"
            : "Official";

  return locale === "it" ? `${sourceName} · ${confidence}%` : `${sourceName} · ${confidence}%`;
}

function mapsUrl(event: EventRecord) {
  const query = event.address
    ? `${event.address} ${event.latitude},${event.longitude}`
    : `${event.latitude},${event.longitude}`;

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function EventBottomSheet({
  selected,
  categories,
  locale,
  userLocation,
  onClose
}: {
  selected: SelectedSheet;
  categories: Map<string, Category>;
  locale: Locale;
  userLocation: { latitude: number; longitude: number } | null;
  onClose: () => void;
}) {
  if (selected.type === "cluster") {
    const clusterDistance = userLocation
      ? getDistanceKm(userLocation, {
          latitude: selected.cluster.latitude,
          longitude: selected.cluster.longitude
        })
      : null;

    return (
      <aside className="event-bottom-sheet" aria-live="polite">
        <div className="event-sheet-handle" aria-hidden="true" />
        <div className="event-sheet-heading">
          <div>
            <p className="event-sheet-kicker">{locale === "it" ? "Zona attiva" : "Active area"}</p>
            <h2>{selected.cluster.events.length} eventi qui</h2>
          </div>
          <button className="event-sheet-close" type="button" onClick={onClose} aria-label="Chiudi">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="event-sheet-meta">
          <span>{locale === "it" ? "Eventi vicini" : "Nearby events"}</span>
          {clusterDistance !== null ? <span>{formatDistance(clusterDistance, locale)}</span> : null}
        </div>
        <div className="cluster-list event-sheet-list">
          {selected.cluster.events.slice(0, 4).map((event) => {
            const status = getTemporalStatus(event);

            return (
              <a className="cluster-item" href={`/event/${event.id}`} key={event.id}>
                <strong>{event.title}</strong>
                <span>{getTemporalStatusLabel(event, status, locale)}</span>
              </a>
            );
          })}
        </div>
      </aside>
    );
  }

  const event = selected.event;
  const category = event.categories ?? categories.get(event.category_id);
  const markerColor = category?.color ?? "#FF6B61";
  const isLocked = isPasswordLocked(event);
  const lowQuality = isLowQualityEvent(event);
  const temporalStatus = getTemporalStatus(event);
  const temporalLabel = getTemporalStatusLabel(event, temporalStatus, locale);
  const distance = userLocation
    ? getDistanceKm(userLocation, {
        latitude: event.latitude,
        longitude: event.longitude
      })
    : null;
  const canOpenMaps = Number.isFinite(event.latitude) && Number.isFinite(event.longitude);

  return (
    <aside className="event-bottom-sheet" aria-live="polite">
      <div className="event-sheet-handle" aria-hidden="true" />
      <div className="event-sheet-heading">
        <div>
          <p className="event-sheet-kicker" style={{ "--category-color": markerColor } as CSSProperties}>
            <span className="category-dot" aria-hidden="true" />
            {categoryName(category, locale)}
          </p>
          <h2>{event.title}</h2>
        </div>
        <button className="event-sheet-close" type="button" onClick={onClose} aria-label="Chiudi">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="event-sheet-meta">
        <span>{temporalLabel}</span>
        <span>
          <MapPin size={14} aria-hidden="true" />
          {isLocked ? (locale === "it" ? "Luogo riservato" : "Private place") : event.address ?? cityFallback(locale)}
        </span>
        {distance !== null ? <span>{formatDistance(distance, locale)}</span> : null}
        <span>{sourceLabel(event, locale)}</span>
        {isLocked ? (
          <span>
            <Lock size={14} aria-hidden="true" />
            {locale === "it" ? "Privato" : "Private"}
          </span>
        ) : null}
        {lowQuality ? <span>{locale === "it" ? "Qualità in verifica" : "Quality pending"}</span> : null}
      </div>

      <div className="event-sheet-actions">
        <a className="detail-button" href={`/event/${event.id}`}>
          {locale === "it" ? "Apri dettagli" : "Open details"}
        </a>
        {canOpenMaps ? (
          <a className="maps-button" href={mapsUrl(event)} target="_blank" rel="noreferrer">
            <ExternalLink size={15} aria-hidden="true" />
            {locale === "it" ? "Apri in Maps" : "Open in Maps"}
          </a>
        ) : null}
      </div>
    </aside>
  );
}

function cityFallback(locale: Locale) {
  return locale === "it" ? "Luogo da confermare" : "Place to confirm";
}

export default function EventMap({
  city,
  categories,
  events,
  locale,
  focusKey,
  userLocation
}: EventMapProps) {
  const [mapView, setMapView] = useState<MapView | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<SelectedSheet | null>(null);
  const cityBounds = getCityBoundsTuple(city);
  const handleMapViewChange = useCallback((view: MapView) => setMapView(view), []);
  const closeSheet = useCallback(() => setSelectedSheet(null), []);
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );
  const visibleEvents = useMemo(() => getVisibleEvents(events, mapView), [events, mapView]);
  const eventClusters = useMemo(
    () => clusterEvents(visibleEvents, mapView?.zoom),
    [mapView?.zoom, visibleEvents]
  );

  useEffect(() => {
    setSelectedSheet(null);
  }, [city.id, focusKey]);

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
        <MapViewportTracker onChange={handleMapViewChange} onMapTap={closeSheet} />

        {eventClusters.map((cluster) => {
          if (cluster.events.length > 1) {
            const firstEvent = cluster.events[0];
            const liveEvent = cluster.events.find(
              (event) => getTemporalStatus(event) === "live_now" && !isLowQualityEvent(event)
            );
            const dominantEvent = liveEvent ?? firstEvent;
            const category = dominantEvent.categories ?? categoryById.get(dominantEvent.category_id);
            const markerColor = category?.color ?? "#FF6B61";

            return (
              <Marker
                key={cluster.id}
                position={[cluster.latitude, cluster.longitude]}
                icon={createClusterIcon(markerColor, cluster.events.length, Boolean(liveEvent))}
                eventHandlers={{
                  click: () => {
                    setSelectedSheet({ type: "cluster", cluster });
                    trackAnalytics("event_clicked", {
                      city_id: dominantEvent.city_id,
                      category_id: dominantEvent.category_id,
                      cluster_size: cluster.events.length,
                      temporal_status: liveEvent ? "live_now" : getTemporalStatus(dominantEvent)
                    });
                  }
                }}
              />
            );
          }

          const event = cluster.events[0];
          const category = event.categories ?? categoryById.get(event.category_id);
          const markerColor = category?.color ?? "#FF6B61";
          const isLocked = isPasswordLocked(event);
          const lowQuality = isLowQualityEvent(event);
          const temporalStatus = getTemporalStatus(event);

          return (
            <Marker
              key={event.id}
              position={[event.latitude, event.longitude]}
              icon={createMarkerIcon(markerColor, temporalStatus, isLocked, lowQuality)}
              eventHandlers={{
                click: () => {
                  setSelectedSheet({ type: "event", event });
                  trackAnalytics("event_clicked", {
                    event_id: event.id,
                    city_id: event.city_id,
                    category_id: event.category_id,
                    temporal_status: temporalStatus
                  });
                }
              }}
            />
          );
        })}
      </MapContainer>

      {selectedSheet ? (
        <EventBottomSheet
          selected={selectedSheet}
          categories={categoryById}
          locale={locale}
          userLocation={userLocation}
          onClose={closeSheet}
        />
      ) : null}
    </div>
  );
}
