/**
 * MapView — Interactive Leaflet map showing user position, radius circle, and event markers.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { EventSummary } from '../api/client';
import { getCategoryColor } from '../utils/categoryColors';

interface MapViewProps {
  lat: number;
  lng: number;
  radiusKm: number;
  events: EventSummary[];
  onEventClick?: (eventId: number) => void;
  onLocationChange?: (lat: number, lng: number) => void;
  onEventHover?: (eventId: number | null) => void;
}

export function MapView({ lat, lng, radiusKm, events, onEventClick, onLocationChange, onEventHover }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current).setView([lat, lng], 12);

    const streets = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap" });
    const light = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { attribution: "© CartoDB" });
    const dark = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { attribution: "© CartoDB" });
    const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { attribution: "© Esri" });
    dark.addTo(mapRef.current);
    L.control.layers({ "Chiara": light, "Stradale": streets, "Scura": dark, "Satellite": satellite }, {}, { position: "topright" }).addTo(mapRef.current);

    markersRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update user position and radius circle
  useEffect(() => {
    if (!mapRef.current) return;

    // Update user marker
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([lat, lng]);
    } else {
      const userIcon = L.divIcon({
        className: 'user-marker',
        html: '<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      userMarkerRef.current = L.marker([lat, lng], { icon: userIcon, draggable: true })
        .addTo(mapRef.current)
        .bindPopup('Trascinami per cambiare posizione');
      userMarkerRef.current.on('dragend', () => { const pos = userMarkerRef.current!.getLatLng(); onLocationChange?.(pos.lat, pos.lng); });
    }

    // Update radius circle
    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lng]);
      circleRef.current.setRadius(radiusKm * 1000);
    } else {
      circleRef.current = L.circle([lat, lng], {
        radius: radiusKm * 1000,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.08,
        weight: 2,
      }).addTo(mapRef.current);
    }

    mapRef.current.fitBounds(circleRef.current.getBounds(), { animate: true, padding: [20, 20] });
  }, [lat, lng, radiusKm]);

  // Update event markers
  useEffect(() => {
    if (!mapRef.current || !markersRef.current) return;

    markersRef.current.clearLayers();

    // Group events by venue (approximate: same name)
    const venueGroups = new Map<string, EventSummary[]>();
    for (const event of events) {
      const key = event.venueName.toLowerCase().trim();
      if (!venueGroups.has(key)) {
        venueGroups.set(key, []);
      }
      venueGroups.get(key)!.push(event);
    }

    for (let idx = 0; idx < events.length; idx++) { const event = events[idx];
      const color = "#ef4444";
      const icon = L.divIcon({
        className: 'event-marker',
        html: `<div style="width:12px;height:12px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6],
      });

      // Use event coordinates if available
      
      const eLat = (event as any).lat || lat;
      const eLng = (event as any).lng || lng;
      const marker = L.marker([eLat, eLng], { icon })
        .bindPopup(`
          <strong>${event.name}</strong><br/>
          ${event.venueName}<br/>
          ${new Date(event.dateStart).toLocaleDateString('it-IT')} - ${event.category}<br/>
          ${event.distanceKm.toFixed(1)} km
        `);

      if (onEventClick) {
        marker.on("click", () => onEventClick(idx));
        marker.on("mouseover", () => { marker.openPopup(); onEventHover?.(idx); });
        marker.on("mouseout", () => { marker.closePopup(); onEventHover?.(null); });
      }

      markersRef.current!.addLayer(marker);
    }
  }, [events, lat, lng, radiusKm, onEventClick]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[500px] rounded-lg overflow-hidden shadow-sm"
      role="application"
      aria-label="Mappa degli eventi"
    />
  );
}

function getZoomForRadius(radiusKm: number): number {
  if (radiusKm <= 2) return 14;
  if (radiusKm <= 5) return 13;
  if (radiusKm <= 10) return 12;
  if (radiusKm <= 20) return 11;
  if (radiusKm <= 50) return 10;
  return 9;
}
